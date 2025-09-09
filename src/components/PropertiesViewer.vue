<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    class="properties-dialog"
  >
    <div class="properties-content" v-if="selectedLayer">
      <!-- 基本信息 -->
      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="card-header">
            <span>📋 基本信息</span>
            <el-button size="small" @click="copyBasicInfo" text>
              📋 复制
            </el-button>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="图层名称">
            <el-input
              v-model="editableProperties.name"
              size="small"
              placeholder="输入图层名称"
              @blur="updateLayerProperty('name', editableProperties.name)"
            />
          </el-descriptions-item>
          <el-descriptions-item label="图层类型">
            <el-tag :type="getTypeTagType(layerInfo.type)">
              {{ layerInfo.typeName }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(layerInfo.created) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后编辑">
            {{ formatDate(layerInfo.edited) || '未编辑' }}
          </el-descriptions-item>
          <el-descriptions-item label="图层ID" :span="2">
            <code>{{ layerInfo.id }}</code>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 几何信息 -->
      <el-card shadow="never" class="info-card" v-if="geometryInfo">
        <template #header>
          <div class="card-header">
            <span>📐 几何信息</span>
            <el-button size="small" @click="copyGeometryInfo" text>
              📋 复制
            </el-button>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="几何类型">
            {{ geometryInfo.type }}
          </el-descriptions-item>
          <el-descriptions-item label="坐标数量">
            {{ geometryInfo.coordinateCount }}
          </el-descriptions-item>
          <el-descriptions-item label="面积" v-if="geometryInfo.area">
            {{ formatArea(geometryInfo.area) }}
          </el-descriptions-item>
          <el-descriptions-item label="长度" v-if="geometryInfo.length">
            {{ formatLength(geometryInfo.length) }}
          </el-descriptions-item>
          <el-descriptions-item label="边界框" :span="2" v-if="geometryInfo.bounds">
            <code>{{ geometryInfo.bounds }}</code>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 自定义属性 -->
      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="card-header">
            <span>🏷️ 自定义属性</span>
            <el-button size="small" @click="addCustomProperty" type="primary">
              ➕ 添加属性
            </el-button>
          </div>
        </template>
        
        <div class="properties-list">
          <div
            v-for="(value, key) in customProperties"
            :key="key"
            class="property-item"
          >
            <div class="property-key">
              <el-input
                :value="key"
                @input="updatePropertyKey(key, $event)"
                size="small"
                placeholder="属性名"
              />
            </div>
            <div class="property-value">
              <el-input
                :value="value"
                @input="updatePropertyValue(key, $event)"
                size="small"
                placeholder="属性值"
              />
            </div>
            <div class="property-actions">
              <el-button
                size="small"
                type="danger"
                @click="removeProperty(key)"
                text
              >
                🗑️
              </el-button>
            </div>
          </div>
          
          <div v-if="Object.keys(customProperties).length === 0" class="no-properties">
            <el-empty description="暂无自定义属性" :image-size="60" />
          </div>
        </div>
      </el-card>

      <!-- GeoJSON 预览 -->
      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="card-header">
            <span>🗺️ GeoJSON 预览</span>
            <el-button size="small" @click="copyGeoJSON" type="primary">
              📋 复制 GeoJSON
            </el-button>
          </div>
        </template>
        
        <el-input
          :model-value="formattedGeoJSON"
          type="textarea"
          :rows="8"
          readonly
          class="geojson-preview"
        />
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">关闭</el-button>
        <el-button type="primary" @click="saveChanges">保存更改</el-button>
        <el-button type="success" @click="exportLayer">导出图层</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import L from 'leaflet'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  layer: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'layer-updated', 'export-layer'])

// 响应式数据
const visible = ref(props.modelValue)
const selectedLayer = ref(props.layer)
const editableProperties = ref({})
const customProperties = ref({})

// 计算属性
const dialogTitle = computed(() => {
  return selectedLayer.value?.feature?.properties?.name || '图层属性'
})

const layerInfo = computed(() => {
  if (!selectedLayer.value?.feature) return {}
  
  const props = selectedLayer.value.feature.properties
  return {
    id: props.id || 'N/A',
    type: props.type || 'unknown',
    typeName: getGeometryTypeName(props.type),
    created: props.created,
    edited: props.edited,
    name: props.name || '未命名图层'
  }
})

const geometryInfo = computed(() => {
  if (!selectedLayer.value?.feature?.geometry) return null
  
  const geometry = selectedLayer.value.feature.geometry
  const layer = selectedLayer.value
  
  let info = {
    type: geometry.type,
    coordinateCount: getCoordinateCount(geometry)
  }
  
  // 添加面积信息
  if (geometry.type.includes('Polygon') || layer instanceof L.Circle) {
    info.area = calculateLayerArea(layer)
  }
  
  // 添加长度信息
  if (geometry.type.includes('LineString')) {
    info.length = calculateLayerLength(layer)
  }
  
  // 添加边界框
  if (layer.getBounds) {
    const bounds = layer.getBounds()
    info.bounds = `[${bounds.getWest().toFixed(6)}, ${bounds.getSouth().toFixed(6)}, ${bounds.getEast().toFixed(6)}, ${bounds.getNorth().toFixed(6)}]`
  }
  
  return info
})

const formattedGeoJSON = computed(() => {
  if (!selectedLayer.value?.feature) return ''
  return JSON.stringify(selectedLayer.value.feature, null, 2)
})

// 方法
const getGeometryTypeName = (type) => {
  const typeNames = {
    polygon: '多边形', polyline: '线段', rectangle: '矩形',
    circle: '圆形', marker: '标记点', point: '点'
  }
  return typeNames[type?.toLowerCase()] || '图形'
}

const getTypeTagType = (type) => {
  const typeMap = {
    polygon: 'success',
    rectangle: 'warning',
    circle: 'info',
    polyline: 'danger',
    marker: 'primary',
    point: 'primary'
  }
  return typeMap[type?.toLowerCase()] || ''
}

const formatDate = (dateString) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatArea = (area) => {
  const num = parseFloat(area)
  if (num < 10000) return `${num.toFixed(2)} m²`
  if (num < 1000000) return `${(num / 10000).toFixed(2)} 公顷`
  return `${(num / 1000000).toFixed(2)} km²`
}

const formatLength = (length) => {
  const num = parseFloat(length)
  if (num < 1000) return `${num.toFixed(2)} m`
  return `${(num / 1000).toFixed(2)} km`
}

const getCoordinateCount = (geometry) => {
  if (geometry.type === 'Point') return 1
  if (geometry.type === 'LineString') return geometry.coordinates.length
  if (geometry.type === 'Polygon') return geometry.coordinates[0].length
  if (geometry.type === 'MultiPoint') return geometry.coordinates.length
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.reduce((sum, line) => sum + line.length, 0)
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce((sum, polygon) => sum + polygon[0].length, 0)
  }
  return 0
}

const calculateLayerArea = (layer) => {
  try {
    if (layer instanceof L.Circle) {
      const radius = layer.getRadius()
      return Math.PI * radius * radius
    }
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      // 简化计算，实际应该使用更精确的地理算法
      const bounds = layer.getBounds()
      const earthRadius = 6371000 // 地球半径（米）
      const latRad = Math.PI / 180
      const area = Math.abs(
        (bounds.getEast() - bounds.getWest()) * 
        (bounds.getNorth() - bounds.getSouth()) * 
        earthRadius * earthRadius * 
        latRad * latRad * 
        Math.cos(bounds.getCenter().lat * latRad)
      )
      return area
    }
  } catch (error) {
    console.warn('计算面积失败:', error)
  }
  return null
}

const calculateLayerLength = (layer) => {
  try {
    if (layer instanceof L.Polyline) {
      const latlngs = layer.getLatLngs()
      let totalLength = 0
      for (let i = 0; i < latlngs.length - 1; i++) {
        totalLength += latlngs[i].distanceTo(latlngs[i + 1])
      }
      return totalLength
    }
  } catch (error) {
    console.warn('计算长度失败:', error)
  }
  return null
}

const updateLayerProperty = (key, value) => {
  if (selectedLayer.value?.feature?.properties) {
    selectedLayer.value.feature.properties[key] = value
  }
}

const updatePropertyKey = (oldKey, newKey) => {
  if (oldKey === newKey) return
  
  const value = customProperties.value[oldKey]
  delete customProperties.value[oldKey]
  customProperties.value[newKey] = value
}

const updatePropertyValue = (key, value) => {
  customProperties.value[key] = value
}

const addCustomProperty = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入属性名称', '添加自定义属性', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    
    if (value && !customProperties.value[value]) {
      customProperties.value[value] = ''
    } else if (customProperties.value[value] !== undefined) {
      ElMessage.warning('属性名已存在')
    }
  } catch {
    // 用户取消
  }
}

const removeProperty = (key) => {
  delete customProperties.value[key]
}

const copyBasicInfo = () => {
  const info = [
    `图层名称: ${layerInfo.value.name}`,
    `图层类型: ${layerInfo.value.typeName}`,
    `创建时间: ${formatDate(layerInfo.value.created)}`,
    `图层ID: ${layerInfo.value.id}`
  ].join('\n')
  
  navigator.clipboard.writeText(info)
  ElMessage.success('基本信息已复制到剪贴板')
}

const copyGeometryInfo = () => {
  if (!geometryInfo.value) return
  
  const info = Object.entries(geometryInfo.value)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
  
  navigator.clipboard.writeText(info)
  ElMessage.success('几何信息已复制到剪贴板')
}

const copyGeoJSON = () => {
  navigator.clipboard.writeText(formattedGeoJSON.value)
  ElMessage.success('GeoJSON 已复制到剪贴板')
}

const saveChanges = () => {
  if (!selectedLayer.value?.feature?.properties) return
  
  // 保存自定义属性
  Object.keys(customProperties.value).forEach(key => {
    selectedLayer.value.feature.properties[key] = customProperties.value[key]
  })
  
  // 更新编辑时间
  selectedLayer.value.feature.properties.edited = new Date().toISOString()
  
  emit('layer-updated', selectedLayer.value)
  ElMessage.success('属性已保存')
}

const exportLayer = () => {
  emit('export-layer', selectedLayer.value)
}

// 初始化数据
const initializeData = () => {
  if (!selectedLayer.value?.feature?.properties) return
  
  const props = selectedLayer.value.feature.properties
  editableProperties.value = {
    name: props.name || ''
  }
  
  // 提取自定义属性（排除系统属性）
  const systemKeys = ['id', 'type', 'created', 'edited', 'name', 'area', 'length']
  customProperties.value = {}
  
  Object.keys(props).forEach(key => {
    if (!systemKeys.includes(key)) {
      customProperties.value[key] = props[key]
    }
  })
}

// 监听器
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

watch(() => props.layer, (newLayer) => {
  selectedLayer.value = newLayer
  initializeData()
}, { immediate: true })

// 初始化
initializeData()
</script>

<style scoped>
.properties-dialog {
  .el-dialog__body {
    padding: 16px 20px !important;
  }
}

.properties-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    color: #2c3e50;
  }
}

.properties-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.property-item {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.property-key,
.property-value {
  min-width: 0;
}

.property-actions {
  display: flex;
  gap: 4px;
}

.geojson-preview {
  font-family: 'Courier New', 'Monaco', monospace !important;
}

.geojson-preview :deep(.el-textarea__inner) {
  font-family: 'Courier New', 'Monaco', monospace !important;
  font-size: 12px;
  line-height: 1.4;
}

.no-properties {
  text-align: center;
  padding: 20px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 描述列表优化 */
:deep(.el-descriptions__body) {
  background: transparent;
}

:deep(.el-descriptions-item__label) {
  font-weight: 600;
  color: #606266;
  background: #f8f9fa;
}

:deep(.el-descriptions-item__content) {
  background: white;
}

/* 标签样式 */
.el-tag {
  font-weight: 500;
}

/* 代码块样式 */
code {
  background: #f1f2f3;
  color: #e74c3c;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', 'Monaco', monospace;
  font-size: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .property-item {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  
  .properties-dialog {
    width: 95vw !important;
    margin: 5vh auto !important;
  }
  
  :deep(.el-descriptions) {
    --el-descriptions-item-bordered-label-background: #f8f9fa;
  }
  
  :deep(.el-descriptions-item) {
    flex-direction: column;
    align-items: stretch;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .info-card {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(30, 41, 59, 0.8);
  }
  
  .card-header {
    color: #e0e6ed;
  }
  
  .property-item {
    background: rgba(51, 65, 85, 0.6);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  code {
    background: rgba(51, 65, 85, 0.8);
    color: #ffd700;
  }
}
</style>