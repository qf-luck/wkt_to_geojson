<template>
  <div class="map-section">
    <div class="map-card">
      <!-- 地图头部 -->
      <div class="map-header">
        <h3>🗺️ 交互式地图</h3>
        <MapControls
          :currentMapStyle="currentMapStyle"
          :hasGeometry="hasGeometry"
          @style-change="handleStyleChange"
          @export-map="handleExportMap"
          @clear-map="handleClearMap"
          @zoom-to-fit="handleZoomToFit"
        />
      </div>

      <!-- 地图提示 -->
      <div class="map-tip">
        💡 使用左侧工具栏可在地图上绘制、编辑和删除几何图形。支持多选和右键菜单操作。
      </div>

      <!-- 地图信息栏 -->
      <div class="map-info">
        <span>{{ mousePosition }}</span>
        <span>{{ selectionInfo }}</span>
        <span v-if="totalArea">总面积: {{ totalArea }}</span>
      </div>

      <!-- 绘制工具提示 -->
      <div class="draw-tools-info">
        <div class="tool-tip">
          <span class="tool-icon">🔧</span>
          <span>绘制工具:</span>
          <span class="tool-list">多边形 | 线段 | 矩形 | 圆形 | 标记点</span>
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
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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

// 事件处理器
const handleStyleChange = (style) => {
  emit('style-change', style)
}

const handleGeometryUpdated = () => {
  emit('geometry-updated')
}

const handleSelectionChanged = (selection) => {
  emit('selection-changed', selection)
}

const handleMousePositionChanged = (position) => {
  emit('mouse-position-changed', position)
}

const handleShowContextMenu = (point) => {
  emit('show-context-menu', point)
}

// 地图控制方法
const handleExportMap = () => {
  ElMessageBox.confirm(
    '地图导出功能需要html2canvas库支持。是否要在新窗口中打开当前地图状态？',
    '导出地图',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    },
  )
    .then(() => {
      ElMessage.info('导出功能需要在实际项目中实现')
    })
    .catch(() => {
      // 用户取消
    })
}

const handleClearMap = async () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }

  try {
    await ElMessageBox.confirm('确定要清空地图上的所有图形吗？', '确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    leafletMapRef.value.clearAllLayers()
    ElMessage.success('地图已清空')
  } catch {
    // 用户取消
  }
}

const handleZoomToFit = () => {
  if (!leafletMapRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }

  leafletMapRef.value.zoomToFit()
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
    // 可以在这里做一些初始化工作
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

.map-tip {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1565c0;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 16px;
  border: 1px solid #90caf9;
  border-left: 4px solid #2196f3;
  display: flex;
  align-items: center;
  gap: 8px;
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

.map-info span {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  font-weight: 500;
}

.draw-tools-info {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: 1px solid #ffcc02;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-left: 4px solid #ff9800;
}

.tool-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e65100;
  flex-wrap: wrap;
}

.tool-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
}

.tool-list {
  color: #bf360c;
  font-weight: 500;
  font-family: 'Monaco', 'Consolas', monospace;
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

  .map-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .map-info span {
    width: 100%;
    justify-content: center;
  }

  .tool-tip {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .tool-list {
    font-size: 12px;
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

  .map-tip {
    padding: 12px 16px;
    font-size: 13px;
  }

  .draw-tools-info {
    padding: 10px 14px;
  }
}

/* 加载状态样式 */
.map-card.loading {
  opacity: 0.7;
  pointer-events: none;
}

.map-card.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
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

  .map-info {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(51, 65, 85, 0.6) 100%);
    color: #e0e6ed;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .map-info span {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
