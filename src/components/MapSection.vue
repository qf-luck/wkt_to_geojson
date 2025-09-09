<!-- src/components/MapSection.vue - 简化版本 -->
<template>
  <div class="map-section">
    <div class="map-card">
      <!-- 地图头部 -->
      <div class="map-header">
        <h3>🗺️ 交互式地图</h3>
        <div class="header-stats">
          <el-tag v-if="hasGeometry" type="success" size="small">
            {{ geometryStats.total }} 个图形
          </el-tag>
          <el-tag v-if="selectedLayersCount > 0" type="warning" size="small">
            已选中 {{ selectedLayersCount }} 个
          </el-tag>
        </div>
      </div>

      <!-- 简化的地图控件 -->
      <div class="map-controls">
        <!-- 地图样式选择 -->
        <div class="control-group">
          <label class="control-label">地图样式:</label>
          <el-radio-group
            :model-value="currentMapStyle"
            @change="$emit('style-change', $event)"
            size="small"
          >
            <el-radio-button value="osm">🗺️ 标准</el-radio-button>
            <el-radio-button value="light">☀️ 简洁</el-radio-button>
            <el-radio-button value="dark">🌙 暗色</el-radio-button>
            <el-radio-button value="satellite">🛰️ 卫星</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 基础操作 -->
        <div class="control-group">
          <el-button-group size="small">
            <el-button @click="handleZoomToFit" :disabled="!hasGeometry" title="适应所有图形">
              🎯 适应范围
            </el-button>
            <el-button @click="handleSelectAll" :disabled="!hasGeometry" title="选择所有图层">
              ✅ 全选
            </el-button>
            <el-button @click="handleClearSelection" :disabled="!hasSelection" title="清除选择">
              ❌ 清除选择
            </el-button>
            <el-button
              type="danger"
              @click="handleClearMap"
              :disabled="!hasGeometry"
              title="清空地图"
            >
              🗑️ 清空
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 地图操作提示 -->
      <div class="map-tips">
        <div class="tip-item">
          <el-icon><Mouse /></el-icon>
          <span>单击选择，Ctrl+单击多选，双击查看属性</span>
        </div>
        <div class="tip-item">
          <el-icon><Position /></el-icon>
          <span>右键显示菜单，使用左侧工具栏绘制图形</span>
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
      </div>

      <!-- 核心地图组件 -->
      <LeafletMap
        ref="leafletMapRef"
        :currentMapStyle="currentMapStyle"
        :loading="mapLoading"
        @geometry-updated="handleGeometryUpdated"
        @selection-changed="handleSelectionChanged"
        @mouse-position-changed="handleMousePositionChanged"
        @show-context-menu="handleShowContextMenu"
        @show-layer-properties="handleShowLayerProperties"
      />
    </div>

    <!-- 属性查看对话框 -->
    <PropertiesViewer
      v-model="showPropertiesDialog"
      :layer="currentLayer"
      @layer-updated="handleLayerUpdated"
      @export-layer="handleExportLayer"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Mouse, Position, Location, Select, DataLine
} from '@element-plus/icons-vue'
import LeafletMap from './LeafletMap.vue'
import PropertiesViewer from './PropertiesViewer.vue'

// Props
defineProps({
  currentMapStyle: { type: String, default: 'osm' },
  mousePosition: { type: String, default: '经度: --, 纬度: --' },
  selectionInfo: { type: String, default: '选中: --' },
  totalArea: { type: String, default: null },
  hasGeometry: { type: Boolean, default: false },
  mapLoading: { type: Boolean, default: false },
  geometryStats: {
    type: Object,
    default: () => ({
      total: 0, points: 0, lines: 0, polygons: 0,
      totalLength: null, totalArea: null, boundingBox: null
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
  'layer-updated',
  'export-layer'
])

// 组件引用
const leafletMapRef = ref(null)

// 响应式数据
const selectedLayersCount = ref(0)
const showPropertiesDialog = ref(false)
const currentLayer = ref(null)

// 计算属性
const hasSelection = computed(() => selectedLayersCount.value > 0)

// 事件处理器
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

const handleShowContextMenu = (contextData) => {
  emit('show-context-menu', contextData)
}

const handleShowLayerProperties = (layer) => {
  currentLayer.value = layer
  showPropertiesDialog.value = true
}

const handleLayerUpdated = (layer) => {
  emit('layer-updated', layer)
  emit('geometry-updated') // 触发几何更新以刷新统计
}

const handleExportLayer = (layer) => {
  emit('export-layer', layer)
}

// 地图控制方法
const handleZoomToFit = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }
  leafletMapRef.value.zoomToFit()
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

const handleClearMap = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空地图上的所有图形吗？此操作不可撤销。',
      '确认清空',
      {
        type: 'warning',
        confirmButtonText: '确定清空',
        cancelButtonText: '取消'
      }
    )

    if (leafletMapRef.value) {
      leafletMapRef.value.clearAllLayers()
    }
  } catch {
    // 用户取消
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
  leafletMapRef
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

.map-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #dee2e6;
  margin-bottom: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.control-label {
  font-size: 13px;
  font-weight: 600;
  color: #495057;
  white-space: nowrap;
  margin-right: 4px;
}

.el-button-group {
  display: flex;
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

/* Radio按钮组样式优化 */
.el-radio-group {
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.el-radio-button__inner {
  padding: 8px 12px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border: none !important;
  background: white !important;
  color: #606266 !important;
  transition: all 0.3s ease !important;
}

.el-radio-button__inner:hover {
  background: #f5f7fa !important;
  color: #409eff !important;
}

.el-radio-button:first-child .el-radio-button__inner {
  border-radius: 8px 0 0 8px !important;
}

.el-radio-button:last-child .el-radio-button__inner {
  border-radius: 0 8px 8px 0 !important;
}

.el-radio-button__original-radio:checked + .el-radio-button__inner {
  background: linear-gradient(135deg, #409eff 0%, #1976d2 100%) !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3) !important;
}

/* 按钮组样式 */
.el-button-group .el-button {
  margin: 0 !important;
  border-radius: 0 !important;
}

.el-button-group .el-button:first-child {
  border-radius: 6px 0 0 6px !important;
}

.el-button-group .el-button:last-child {
  border-radius: 0 6px 6px 0 !important;
}

.el-button-group .el-button:only-child {
  border-radius: 6px !important;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .map-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .control-group {
    justify-content: center;
  }
}

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

  .map-controls {
    padding: 8px 12px;
    gap: 8px;
  }

  .control-group {
    flex-direction: column;
    gap: 6px;
  }

  .control-label {
    font-size: 12px;
    text-align: center;
  }

  .el-radio-group {
    width: 100%;
  }

  .el-radio-button__inner {
    padding: 6px 8px !important;
    font-size: 12px !important;
  }

  .el-button-group {
    width: 100%;
  }

  .el-button-group .el-button {
    flex: 1;
    padding: 6px 8px !important;
    font-size: 12px !important;
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
}

@media (max-width: 480px) {
  .map-card {
    padding: 16px;
    margin: 0 -4px;
  }

  .map-header h3 {
    font-size: 1.1em;
  }

  .el-radio-group {
    flex-direction: column !important;
  }

  .el-radio-button:first-child .el-radio-button__inner {
    border-radius: 8px 8px 0 0 !important;
  }

  .el-radio-button:last-child .el-radio-button__inner {
    border-radius: 0 0 8px 8px !important;
  }

  .el-radio-button__inner {
    width: 100% !important;
    text-align: center !important;
    padding: 8px 12px !important;
  }

  .el-button-group {
    flex-direction: column;
  }

  .el-button-group .el-button:first-child {
    border-radius: 6px 6px 0 0 !important;
  }

  .el-button-group .el-button:last-child {
    border-radius: 0 0 6px 6px !important;
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

  .map-controls {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(51, 65, 85, 0.6) 100%);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .control-label {
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

  .map-controls,
  .map-tips,
  .map-info {
    border: 2px solid currentColor;
  }
}
</style>
