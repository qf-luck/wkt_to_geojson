<template>
  <div class="map-section">
    <div class="map-card">
      <!-- 地图头部 -->
      <div class="map-header">
        <h3>🗺️ 交互式地理信息系统</h3>
        <div class="header-stats">
          <el-tag v-if="hasGeometry" type="success" size="small">
            {{ geometryStats.total }} 个图形
          </el-tag>
          <el-tag v-if="selectedLayersCount > 0" type="warning" size="small">
            已选中 {{ selectedLayersCount }} 个
          </el-tag>
        </div>
      </div>

      <!-- 增强的地图控件 -->
      <MapControls
        :currentMapStyle="currentMapStyle"
        :hasGeometry="hasGeometry"
        :selectedLayersCount="selectedLayersCount"
        :layerStats="geometryStats"
        @style-change="handleStyleChange"
        @zoom-to-fit="handleZoomToFit"
        @zoom-to-selected="handleZoomToSelected"
        @reset-view="handleResetView"
        @select-all="handleSelectAll"
        @clear-selection="handleClearSelection"
        @invert-selection="handleInvertSelection"
        @measure-tool="handleMeasureTool"
        @search-layers="handleSearchLayers"
        @select-search-result="handleSelectSearchResult"
        @select-search-results="handleSelectSearchResults"
        @layer-info="handleLayerInfo"
        @export-map="handleExportMap"
        @export-data="handleExportData"
        @import-data="handleImportData"
        @clear-map="handleClearMap"
      />

      <!-- 地图操作提示 -->
      <div class="map-tips">
        <div class="tip-item">
          <el-icon><Mouse /></el-icon>
          <span>单击选择，Ctrl+单击多选，双击查看详情</span>
        </div>
        <div class="tip-item">
          <el-icon><Position /></el-icon>
          <span>右键显示上下文菜单</span>
        </div>
        <div class="tip-item">
          <el-icon><Edit /></el-icon>
          <span>使用左侧工具栏绘制和编辑图形</span>
        </div>
      </div>

      <!-- 地图信息栏 -->
      <div class="map-info">
        <div class="info-item">
          <el-icon><Location /></el-icon>
          <span>{{ mousePosition }}</span>
        </div>
        <div class="info-item">
          <el-icon><Select /></el-icon>
          <span>{{ selectionInfo }}</span>
        </div>
        <div v-if="totalArea" class="info-item">
          <el-icon><DataLine /></el-icon>
          <span>总面积: {{ totalArea }}</span>
        </div>
        <div v-if="currentZoom" class="info-item">
          <el-icon><ZoomIn /></el-icon>
          <span>缩放: {{ currentZoom }}</span>
        </div>
      </div>

      <!-- 核心地图组件 -->
      <LeafletMap
        ref="leafletMapRef"
        :currentMapStyle="currentMapStyle"
        :loading="mapLoading"
        @geometry-updated="handleGeometryUpdated"
        @selection-changed="handleSelectionChanged"
        @mouse-position-changed="handleMousePositionChanged"
        @zoom-changed="handleZoomChanged"
        @show-context-menu="handleShowContextMenu"
      />

      <!-- 地图图例（如果需要） -->
      <div v-if="showLegend" class="map-legend">
        <h4>图例</h4>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-symbol polygon"></div>
            <span>多边形</span>
          </div>
          <div class="legend-item">
            <div class="legend-symbol line"></div>
            <span>线段</span>
          </div>
          <div class="legend-item">
            <div class="legend-symbol point"></div>
            <span>点</span>
          </div>
          <div class="legend-item">
            <div class="legend-symbol selected"></div>
            <span>已选中</span>
          </div>
        </div>
        <el-button size="small" text @click="showLegend = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 测量工具对话框 -->
    <el-dialog
      v-model="showMeasureDialog"
      title="📏 测量工具"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="measure-tools">
        <div class="measure-mode">
          <el-radio-group v-model="measureMode" size="small">
            <el-radio-button value="distance">测量距离</el-radio-button>
            <el-radio-button value="area">测量面积</el-radio-button>
          </el-radio-group>
        </div>

        <div class="measure-instructions">
          <p v-if="measureMode === 'distance'">
            在地图上点击两个点测量直线距离，或点击多个点测量折线距离
          </p>
          <p v-else>
            在地图上点击多个点形成封闭区域来测量面积
          </p>
        </div>

        <div v-if="measureResult" class="measure-result">
          <el-alert
            :title="measureResult"
            type="success"
            :closable="false"
            show-icon
          />
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="clearMeasure">清除测量</el-button>
          <el-button @click="showMeasureDialog = false">关闭</el-button>
          <el-button type="primary" @click="startMeasure">
            开始测量
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导入数据对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="📁 导入地理数据"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="import-content">
        <el-tabs v-model="importTab" type="card">
          <el-tab-pane label="文件导入" name="file">
            <div class="import-file">
              <el-upload
                class="upload-demo"
                drag
                :show-file-list="false"
                :before-upload="handleFileImport"
                accept=".geojson,.json,.wkt,.txt,.kml,.gpx"
              >
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">
                  将文件拖拽到此处，或<em>点击上传</em>
                </div>
                <div class="el-upload__tip">
                  支持 GeoJSON、WKT、KML、GPX 格式文件
                </div>
              </el-upload>
            </div>
          </el-tab-pane>

          <el-tab-pane label="URL导入" name="url">
            <div class="import-url">
              <el-input
                v-model="importUrl"
                placeholder="输入地理数据文件的 URL"
                @keyup.enter="importFromUrl"
              >
                <template #prepend>URL</template>
              </el-input>
              <el-button
                type="primary"
                @click="importFromUrl"
                :loading="importing"
                style="margin-top: 12px; width: 100%;"
              >
                从 URL 导入
              </el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 导出数据对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="💾 导出地理数据"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="export-content">
        <div class="export-options">
          <h4>导出格式</h4>
          <el-radio-group v-model="exportFormat" size="small">
            <el-radio value="geojson">GeoJSON</el-radio>
            <el-radio value="wkt">WKT</el-radio>
            <el-radio value="kml">KML</el-radio>
            <el-radio value="csv">CSV (坐标)</el-radio>
          </el-radio-group>
        </div>

        <div class="export-scope">
          <h4>导出范围</h4>
          <el-radio-group v-model="exportScope" size="small">
            <el-radio value="all">所有图层</el-radio>
            <el-radio value="selected" :disabled="selectedLayersCount === 0">
              仅选中图层 ({{ selectedLayersCount }})
            </el-radio>
            <el-radio value="visible">仅可见图层</el-radio>
          </el-radio-group>
        </div>

        <div class="export-settings">
          <h4>导出设置</h4>
          <el-checkbox v-model="exportSettings.includeProperties">
            包含属性信息
          </el-checkbox>
          <el-checkbox v-model="exportSettings.prettify">
            格式化输出
          </el-checkbox>
          <el-checkbox v-model="exportSettings.includeStyle">
            包含样式信息
          </el-checkbox>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showExportDialog = false">取消</el-button>
          <el-button type="primary" @click="performExport" :loading="exporting">
            导出数据
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import {
  Mouse, Position, Edit, Location, Select, DataLine, ZoomIn, Close,
  UploadFilled
} from '@element-plus/icons-vue'
import MapControls from './MapControls.vue'
import LeafletMap from './LeafletMap.vue'

// Props
const props = defineProps({
  currentMapStyle: {
    type: String,
    default: 'osm',
  },
  mousePosition: {
    type: String,
    default: '鼠标位置: --',
  },
  selectionInfo: {
    type: String,
    default: '选中: --',
  },
  totalArea: {
    type: String,
    default: null,
  },
  hasGeometry: {
    type: Boolean,
    default: false,
  },
  mapLoading: {
    type: Boolean,
    default: false,
  },
  geometryStats: {
    type: Object,
    default: () => ({
      total: 0,
      points: 0,
      lines: 0,
      polygons: 0,
      totalLength: null,
      totalArea: null,
      boundingBox: null
    })
  }
})

// Emits
const emit = defineEmits([
  'style-change',
  'geometry-updated',
  'selection-changed',
  'mouse-position-changed',
  'show-context-menu',
])

// Refs
const leafletMapRef = ref(null)

// 响应式数据
const selectedLayersCount = ref(0)
const currentZoom = ref(10)
const showLegend = ref(false)

// 测量工具相关
const showMeasureDialog = ref(false)
const measureMode = ref('distance')
const measureResult = ref('')

// 导入导出相关
const showImportDialog = ref(false)
const showExportDialog = ref(false)
const importTab = ref('file')
const importUrl = ref('')
const importing = ref(false)
const exporting = ref(false)

const exportFormat = ref('geojson')
const exportScope = ref('all')
const exportSettings = ref({
  includeProperties: true,
  prettify: true,
  includeStyle: false
})

// 计算属性
const mapStats = computed(() => {
  return {
    total: props.geometryStats.total,
    selected: selectedLayersCount.value,
    points: props.geometryStats.points,
    lines: props.geometryStats.lines,
    polygons: props.geometryStats.polygons,
    totalArea: props.geometryStats.totalArea,
    totalLength: props.geometryStats.totalLength
  }
})

// 事件处理器
const handleStyleChange = (style) => {
  emit('style-change', style)
}

const handleGeometryUpdated = () => {
  emit('geometry-updated')
}

const handleSelectionChanged = (selection) => {
  selectedLayersCount.value = selection.size
  emit('selection-changed', selection)
}

const handleMousePositionChanged = (position) => {
  emit('mouse-position-changed', position)
}

const handleZoomChanged = (zoom) => {
  currentZoom.value = zoom
}

const handleShowContextMenu = (point) => {
  emit('show-context-menu', point)
}

// 地图控制方法
const handleZoomToFit = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  leafletMapRef.value.zoomToFit()
}

const handleZoomToSelected = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  if (selectedLayersCount.value === 0) {
    ElMessage.warning('请先选择图层')
    return
  }
  leafletMapRef.value.zoomToSelected()
}

const handleResetView = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }

  // 重置到初始视图
  leafletMapRef.value.setView([39.9042, 116.4074], 10)
  ElMessage.success('已重置到初始视图')
}

const handleSelectAll = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  leafletMapRef.value.selectAllLayers()
}

const handleClearSelection = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  leafletMapRef.value.clearSelection()
}

const handleInvertSelection = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }

  // 这个功能需要在 LeafletMap 中实现
  ElMessage.info('反选功能开发中...')
}

const handleMeasureTool = () => {
  showMeasureDialog.value = true
  measureResult.value = ''
}

const handleSearchLayers = (searchData) => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  leafletMapRef.value.searchLayers(searchData.keyword)
}

const handleSelectSearchResult = (result) => {
  // 选择搜索结果
  ElMessage.success(`已选择: ${result.name}`)
}

const handleSelectSearchResults = (results) => {
  // 选择所有搜索结果
  ElMessage.success(`已选择 ${results.length} 个搜索结果`)
}

const handleLayerInfo = () => {
  // 显示图层信息
  showLegend.value = true
}

const handleExportMap = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  leafletMapRef.value.exportMapAsImage()
}

const handleExportData = () => {
  if (!props.hasGeometry) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  showExportDialog.value = true
}

const handleImportData = () => {
  showImportDialog.value = true
}

const handleClearMap = async () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  leafletMapRef.value.clearAllLayers()
}

// 测量功能
const startMeasure = () => {
  ElMessage.info(`开始${measureMode.value === 'distance' ? '距离' : '面积'}测量`)
  showMeasureDialog.value = false

  // 这里需要在地图上启动测量模式
  // 实际实现需要在 LeafletMap 中添加测量功能
}

const clearMeasure = () => {
  measureResult.value = ''
  ElMessage.success('已清除测量结果')
}

// 文件导入处理
const handleFileImport = (file) => {
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const content = e.target.result
      const fileName = file.name.toLowerCase()

      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        // 处理 GeoJSON
        const geojson = JSON.parse(content)
        importGeoData(geojson, 'geojson')
      } else if (fileName.endsWith('.wkt') || fileName.endsWith('.txt')) {
        // 处理 WKT
        importGeoData(content, 'wkt')
      } else if (fileName.endsWith('.kml')) {
        // 处理 KML (需要转换)
        ElMessage.info('KML 格式支持开发中...')
      } else if (fileName.endsWith('.gpx')) {
        // 处理 GPX (需要转换)
        ElMessage.info('GPX 格式支持开发中...')
      } else {
        ElMessage.error('不支持的文件格式')
        return false
      }

      ElMessage.success(`文件 "${file.name}" 导入成功`)
    } catch (error) {
      ElMessage.error(`文件导入失败: ${error.message}`)
    }
  }

  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }

  reader.readAsText(file, 'utf-8')
  return false // 阻止自动上传
}

// URL 导入处理
const importFromUrl = async () => {
  if (!importUrl.value.trim()) {
    ElMessage.warning('请输入有效的 URL')
    return
  }

  importing.value = true

  try {
    const response = await fetch(importUrl.value)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    const url = importUrl.value.toLowerCase()

    if (url.includes('.geojson') || url.includes('.json')) {
      const geojson = JSON.parse(content)
      importGeoData(geojson, 'geojson')
    } else if (url.includes('.wkt') || url.includes('.txt')) {
      importGeoData(content, 'wkt')
    } else {
      // 尝试解析为 JSON
      try {
        const geojson = JSON.parse(content)
        importGeoData(geojson, 'geojson')
      } catch {
        importGeoData(content, 'wkt')
      }
    }

    ElMessage.success('数据导入成功')
    showImportDialog.value = false
  } catch (error) {
    ElMessage.error(`导入失败: ${error.message}`)
  } finally {
    importing.value = false
  }
}

// 导入地理数据
const importGeoData = (data, type) => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }

  leafletMapRef.value.drawOnMap(
    typeof data === 'string' ? data : JSON.stringify(data),
    type
  )
}

// 执行数据导出
const performExport = async () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }

  exporting.value = true

  try {
    // 获取要导出的数据
    const drawnItems = leafletMapRef.value.getDrawnItems()
    if (!drawnItems || drawnItems.getLayers().length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }

    let layersToExport = []

    // 根据导出范围筛选图层
    drawnItems.eachLayer((layer) => {
      if (exportScope.value === 'all') {
        layersToExport.push(layer)
      } else if (exportScope.value === 'selected') {
        const selectedLayers = leafletMapRef.value.getSelectedLayers()
        if (selectedLayers.has(layer)) {
          layersToExport.push(layer)
        }
      } else if (exportScope.value === 'visible') {
        // 假设所有图层都可见
        layersToExport.push(layer)
      }
    })

    if (layersToExport.length === 0) {
      ElMessage.warning('没有符合条件的图层可导出')
      return
    }

    let exportData = ''
    let fileName = ''
    let mimeType = 'text/plain'

    if (exportFormat.value === 'geojson') {
      const features = layersToExport.map((layer) => {
        const geojson = layer.toGeoJSON()
        if (exportSettings.value.includeProperties && layer.feature) {
          geojson.properties = { ...geojson.properties, ...layer.feature.properties }
        }
        return geojson
      })

      const collection = {
        type: 'FeatureCollection',
        features: features
      }

      exportData = exportSettings.value.prettify
        ? JSON.stringify(collection, null, 2)
        : JSON.stringify(collection)
      fileName = `export_${new Date().toISOString().slice(0, 10)}.geojson`
      mimeType = 'application/geo+json'

    } else if (exportFormat.value === 'wkt') {
      const wktArray = layersToExport.map((layer, index) => {
        const geojson = layer.toGeoJSON()
        const wkt = window.wellknown?.stringify(geojson.geometry) || 'WKT conversion failed'
        const properties = exportSettings.value.includeProperties && layer.feature?.properties
          ? ` -- ${JSON.stringify(layer.feature.properties)}`
          : ''
        return `-- Feature ${index + 1} (${geojson.geometry.type})${properties}\n${wkt}`
      })

      exportData = wktArray.join('\n\n')
      fileName = `export_${new Date().toISOString().slice(0, 10)}.wkt`

    } else if (exportFormat.value === 'kml') {
      ElMessage.info('KML 导出功能开发中...')
      return

    } else if (exportFormat.value === 'csv') {
      const csvRows = ['ID,Type,Longitude,Latitude,Properties']

      layersToExport.forEach((layer, index) => {
        const geojson = layer.toGeoJSON()
        const coords = getFirstCoordinate(geojson.geometry)
        const properties = exportSettings.value.includeProperties && layer.feature?.properties
          ? JSON.stringify(layer.feature.properties).replace(/"/g, '""')
          : ''

        csvRows.push(`${index + 1},${geojson.geometry.type},${coords[0]},${coords[1]},"${properties}"`)
      })

      exportData = csvRows.join('\n')
      fileName = `export_${new Date().toISOString().slice(0, 10)}.csv`
      mimeType = 'text/csv'
    }

    // 下载文件
    const blob = new Blob([exportData], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElNotification({
      title: '导出成功',
      message: `已导出 ${layersToExport.length} 个图层到文件 "${fileName}"`,
      type: 'success',
      duration: 3000
    })

    showExportDialog.value = false

  } catch (error) {
    ElMessage.error(`导出失败: ${error.message}`)
  } finally {
    exporting.value = false
  }
}

// 获取几何体的第一个坐标
const getFirstCoordinate = (geometry) => {
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates
    case 'LineString':
    case 'MultiPoint':
      return geometry.coordinates[0]
    case 'Polygon':
    case 'MultiLineString':
      return geometry.coordinates[0][0]
    case 'MultiPolygon':
      return geometry.coordinates[0][0][0]
    default:
      return [0, 0]
  }
}

// 公共方法 - 供父组件调用
const drawOnMap = (data, type) => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return Promise.reject(new Error('地图未准备好'))
  }
  return leafletMapRef.value.drawOnMap(data, type)
}

const clearAllLayers = () => {
  if (leafletMapRef.value) {
    leafletMapRef.value.clearAllLayers()
  }
}

const zoomToFit = () => {
  if (leafletMapRef.value) {
    leafletMapRef.value.zoomToFit()
  }
}

const clearSelection = () => {
  if (leafletMapRef.value) {
    leafletMapRef.value.clearSelection()
  }
}

const getDrawnItems = () => {
  if (leafletMapRef.value) {
    return leafletMapRef.value.getDrawnItems()
  }
  return null
}

const getSelectedLayers = () => {
  if (leafletMapRef.value) {
    return leafletMapRef.value.getSelectedLayers()
  }
  return new Set()
}

// 组件挂载后设置地图引用
onMounted(() => {
  // 等待子组件挂载完成
  if (leafletMapRef.value) {
    console.log('LeafletMap 组件已挂载')
  }
})

// 暴露方法和引用给父组件
defineExpose({
  // 地图操作方法
  drawOnMap,
  clearAllLayers,
  zoomToFit,
  clearSelection,

  // 数据获取方法
  getDrawnItems,
  getSelectedLayers,

  // 直接暴露地图组件引用
  leafletMapRef,
})
</script>

<style scoped>
.map-section {
  width: 100%;
  margin-bottom: 20px;
}

.map-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.map-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.map-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.map-tips {
  background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
  border: 1px solid #c3e6cb;
  border-left: 4px solid #28a745;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #155724;
}

.tip-item .el-icon {
  color: #28a745;
}

.map-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #495057;
  flex-wrap: wrap;
  gap: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
  border: 1px solid #dee2e6;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  font-weight: 500;
}

.info-item .el-icon {
  color: #6c757d;
}

.map-legend {
  position: absolute;
  top: 80px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(5px);
  z-index: 1000;
  min-width: 120px;
}

.map-legend h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #495057;
}

.legend-symbol {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #ccc;
}

.legend-symbol.polygon {
  background: rgba(52, 152, 219, 0.3);
  border-color: #3498db;
}

.legend-symbol.line {
  background: linear-gradient(90deg, #e74c3c 0%, #e74c3c 100%);
  height: 3px;
  border-radius: 2px;
  border-color: #e74c3c;
}

.legend-symbol.point {
  background: #f39c12;
  border-radius: 50%;
  border-color: #f39c12;
}

.legend-symbol.selected {
  background: rgba(231, 76, 60, 0.3);
  border-color: #e74c3c;
  border-width: 2px;
  border-style: dashed;
}

/* 对话框样式 */
.measure-tools {
  padding: 8px 0;
}

.measure-mode {
  margin-bottom: 16px;
}

.measure-instructions {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  margin: 16px 0;
  font-size: 14px;
  color: #495057;
}

.measure-result {
  margin-top: 16px;
}

.import-content,
.export-content {
  padding: 8px 0;
}

.import-file {
  margin: 16px 0;
}

.import-url {
  margin: 16px 0;
}

.export-options,
.export-scope,
.export-settings {
  margin-bottom: 20px;
}

.export-options h4,
.export-scope h4,
.export-settings h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}

.export-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 上传组件样式优化 */
:deep(.upload-demo) {
  width: 100%;
}

:deep(.el-upload-dragger) {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background: #f0f9ff;
}

:deep(.el-icon--upload) {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

:deep(.el-upload__text) {
  color: #606266;
  font-size: 14px;
}

:deep(.el-upload__tip) {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-card {
    padding: 20px;
  }

  .map-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    text-align: center;
  }

  .map-tips {
    flex-direction: column;
    gap: 8px;
  }

  .map-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .info-item {
    width: 100%;
    justify-content: center;
  }

  .map-legend {
    position: relative;
    top: auto;
    right: auto;
    margin-top: 16px;
    width: 100%;
  }

  .legend-items {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-around;
  }
}

@media (max-width: 480px) {
  .map-card {
    padding: 16px;
    margin: 0 -4px;
  }

  .map-header h3 {
    font-size: 1.1em;
  }

  .map-tips {
    padding: 10px 14px;
  }

  .tip-item {
    font-size: 12px;
  }

  .export-settings {
    gap: 6px;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .map-card {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
    color: #e0e6ed;
  }

  .map-header h3 {
    color: #e0e6ed;
  }

  .map-tips {
    background: linear-gradient(135deg, rgba(40, 167, 69, 0.2) 0%, rgba(212, 237, 218, 0.2) 100%);
    border-color: rgba(40, 167, 69, 0.3);
    color: #a3d9a5;
  }

  .map-info {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(51, 65, 85, 0.6) 100%);
    color: #e0e6ed;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .info-item {
    background: rgba(255, 255, 255, 0.1);
  }

  .map-legend {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(255, 255, 255, 0.2);
    color: #e0e6ed;
  }

  .map-legend h4 {
    color: #e0e6ed;
    border-color: rgba(255, 255, 255, 0.2);
  }
}

/* 加载动画 */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.map-card {
  animation: slideInUp 0.5s ease-out;
}

/* 无障碍优化 */
@media (prefers-reduced-motion: reduce) {
  .map-card,
  .tip-item,
  .info-item {
    animation: none !important;
    transition: none !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .map-card {
    border: 2px solid currentColor;
  }

  .map-tips,
  .map-info,
  .map-legend {
    border: 2px solid currentColor;
  }
}
</style>
