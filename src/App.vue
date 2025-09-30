<!-- src/App.vue - 优化版本 -->
<template>
  <div class="app-container">
    <!-- 头部 -->
    <HeaderSection
      @open-file="showFileDialog = true"
      @export-file="handleExportFile"
      @show-shortcuts="showShortcutsDialog = true"
      @show-help="handleShowHelp"
    />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 转换区域 -->
      <ConverterSection
        v-model:geojsonText="geojsonText"
        v-model:wktText="wktText"
        :geojsonError="geojsonError"
        :wktError="wktError"
        :converting="converting"
        :drawingOnMap="drawingOnMap"
        @convert-geojson-to-wkt="convertGeoJsonToWkt"
        @convert-wkt-to-geojson="convertWktToGeoJson"
        @draw-on-map="handleDrawOnMap"
        @validate-geometry="validateGeometry"
        @simplify-geometry="simplifyGeometry"
      />

      <!-- 地图区域 -->
      <MapSection
        ref="mapSectionRef"
        :currentMapStyle="currentMapStyle"
        :mousePosition="mousePosition"
        :selectionInfo="selectionInfo"
        :totalArea="totalArea"
        :hasGeometry="hasGeometry"
        :mapLoading="mapLoading"
        :geometryStats="geometryStats"
        @style-change="currentMapStyle = $event"
        @geometry-updated="handleGeometryUpdated"
        @selection-changed="handleSelectionChange"
        @mouse-position-changed="mousePosition = $event"
        @show-context-menu="showContextMenu"
      />

      <!-- 数据统计面板 -->
      <StatsSection
        :geometryStats="geometryStats"
        @select-geometry-type="selectGeometryType"
      />

      <!-- 右键菜单 -->
      <ContextMenu
        :visible="contextMenuVisible"
        :style="contextMenuStyle"
        :selectedLayersCount="selectedLayers.size"
        @copy-geojson="copySelectedAsGeoJSON"
        @copy-wkt="copySelectedAsWKT"
        @get-info="getGeometryInfo"
        @measure-distance="measureDistance"
        @delete-selected="deleteSelected"
        @duplicate="duplicateSelected"
        @crop="cropWithSelected"
        @union="unionSelected"
        @buffer="bufferSelected"
        @convex-hull="convexHull"
        @hide="hideContextMenu"
      />

      <!-- 几何信息对话框 -->
      <GeometryInfoDialog
        v-model="geometryInfoVisible"
        :geometryInfo="selectedGeometryInfo"
        :showCoordinateDetails="showCoordinateDetails"
        @toggle-coordinate-details="showCoordinateDetails = !showCoordinateDetails"
      />

      <!-- 全局加载指示器 -->
      <LoadingOverlay v-if="globalLoading" :message="loadingMessage" />

      <!-- 快捷键帮助对话框 -->
      <ShortcutsDialog v-model="showShortcutsDialog" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import HeaderSection from './components/HeaderSection.vue'
import ConverterSection from './components/ConverterSection.vue'
import MapSection from './components/MapSection.vue'
import StatsSection from './components/StatsSection.vue'
import ContextMenu from './components/ContextMenu.vue'
import GeometryInfoDialog from './components/GeometryInfoDialog.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import ShortcutsDialog from './components/ShortcutsDialog.vue'
import { useGeometry } from './composables/useGeometry'
import { useMapOperations } from './composables/useMapOperations'
import { useValidation } from './composables/useValidation'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import * as turf from '@turf/turf'

// === 组合函数 ===
const {
  geojsonText,
  wktText,
  converting,
  drawingOnMap,
  globalLoading,
  loadingMessage,
  convertGeoJsonToWkt,
  convertWktToGeoJson,
  validateGeometry,
  simplifyGeometry
} = useGeometry()

const {
  currentMapStyle,
  mousePosition,
  selectedLayers,
  mapLoading,
  hasGeometry,
  geometryStats,
  updateGeoJsonFromMap,
  handleSelectionChange,
  selectGeometryType,
  // 右键菜单
  contextMenuVisible,
  contextMenuStyle,
  showContextMenu,
  hideContextMenu,
  copySelectedAsGeoJSON,
  copySelectedAsWKT,
  measureDistance,
  deleteSelected,
  duplicateSelected,
  cropWithSelected,
  unionSelected,
  bufferSelected,
  convexHull,
  // 几何信息
  geometryInfoVisible,
  selectedGeometryInfo,
  showCoordinateDetails,
  getGeometryInfo,
  setLeafletMapRef,
  cleanup
} = useMapOperations()

const { geojsonError, wktError } = useValidation(geojsonText, wktText)

// === 组件引用 ===
const mapSectionRef = ref(null)

// === 对话框状态 ===
const showShortcutsDialog = ref(false)
const showFileDialog = ref(false)

// === 计算属性 ===
const selectionInfo = computed(() => {
  const count = selectedLayers.value.size
  if (count === 0) return '选中: --'

  let info = `选中: ${count}个图形`

  if (count === 1) {
    try {
      const layer = Array.from(selectedLayers.value)[0]
      const area = calculateLayerArea(layer)
      if (area) info += ` | 面积: ${area}`
    } catch (error) {
      console.warn('计算选中图形面积失败:', error)
    }
  }

  return info
})

const totalArea = computed(() => {
  if (selectedLayers.value.size === 0) return null

  try {
    let totalAreaM2 = 0

    selectedLayers.value.forEach(layer => {
      const geojson = layer.toGeoJSON()
      if (geojson.geometry.type.includes('Polygon')) {
        if (layer.getRadius && typeof layer.getRadius === 'function') {
          // 圆形面积
          const radius = layer.getRadius()
          totalAreaM2 += Math.PI * radius * radius
        } else {
          totalAreaM2 += turf.area(geojson)
        }
      }
    })

    if (totalAreaM2 > 0) {
      return formatArea(totalAreaM2)
    }
  } catch (error) {
    console.warn('计算总面积失败:', error)
  }

  return null
})

// === 工具函数 ===
const formatArea = (squareMeters) => {
  if (squareMeters < 10000) return `${squareMeters.toFixed(2)} m²`
  if (squareMeters < 1000000) return `${(squareMeters / 10000).toFixed(2)} 公顷`
  return `${(squareMeters / 1000000).toFixed(2)} km²`
}

const calculateLayerArea = (layer) => {
  try {
    const geojson = layer.toGeoJSON()
    if (!geojson.geometry.type.includes('Polygon')) return null

    let area
    if (layer.getRadius && typeof layer.getRadius === 'function') {
      const radius = layer.getRadius()
      area = Math.PI * radius * radius
    } else {
      area = turf.area(geojson)
    }

    return formatArea(area)
  } catch (error) {
    console.warn('计算面积失败:', error)
    return null
  }
}

// === 事件处理 ===
const handleDrawOnMap = async (text, type) => {
  if (!mapSectionRef.value) {
    ElMessage.warning('地图未准备好')
    return
  }

  drawingOnMap.value = true

  try {
    await mapSectionRef.value.drawOnMap(text, type)
    ElMessage.success('已显示到地图')
  } catch (error) {
    console.error('绘制到地图失败:', error)
    ElMessage.error('绘制失败: ' + error.message)
  } finally {
    drawingOnMap.value = false
  }
}

const handleGeometryUpdated = () => {
  updateGeoJsonFromMap()
}

// === 文件操作 ===
const handleExportFile = () => {
  if (!hasGeometry.value) {
    ElMessage.warning('没有可导出的数据，请先在地图上绘制或导入图形')
    return
  }

  try {
    const drawnItems = mapSectionRef.value?.getDrawnItems?.()
    if (!drawnItems) {
      ElMessage.error('无法获取地图数据')
      return
    }

    const features = []
    drawnItems.eachLayer(layer => {
      try {
        const geojson = layer.toGeoJSON()
        features.push(geojson)
      } catch (error) {
        console.warn('导出图层失败:', error)
      }
    })

    if (features.length === 0) {
      ElMessage.warning('没有可导出的图形')
      return
    }

    const exportData = {
      type: 'FeatureCollection',
      features: features
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `export_${new Date().toISOString().split('T')[0]}.geojson`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success('导出成功！')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败: ' + error.message)
  }
}

const handleShowHelp = () => {
  ElMessageBox.alert(
    `<div style="text-align: left;">
      <h3 style="margin-top: 0;">🗺️ 使用说明</h3>
      <p><strong>1. 数据转换</strong></p>
      <ul>
        <li>在左右输入框中输入 GeoJSON 或 WKT 数据</li>
        <li>点击中间的转换按钮进行格式转换</li>
        <li>支持加载示例、格式化、清空等操作</li>
      </ul>
      <p><strong>2. 地图绘制</strong></p>
      <ul>
        <li>使用左侧工具栏绘制点、线、面等图形</li>
        <li>点击图形可选中，Ctrl+点击可多选</li>
        <li>双击图形可查看详细属性</li>
        <li>右键点击可使用高级功能</li>
      </ul>
      <p><strong>3. 快捷键</strong></p>
      <ul>
        <li>按 <kbd>F1</kbd> 或 <kbd>?</kbd> 查看所有快捷键</li>
        <li>Ctrl+Z/Y: 撤销/重做</li>
        <li>Ctrl+C/V: 复制/粘贴</li>
        <li>Ctrl+A: 全选</li>
      </ul>
      <p><strong>4. 高级功能</strong></p>
      <ul>
        <li>几何验证和简化</li>
        <li>缓冲区分析</li>
        <li>图形合并和凸包</li>
        <li>距离测量和面积计算</li>
      </ul>
    </div>`,
    '帮助文档',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '我知道了',
      center: false
    }
  )
}

// === 组件引用设置 ===
const setupMapReference = () => {
  if (mapSectionRef.value?.leafletMapRef) {
    setLeafletMapRef(mapSectionRef.value.leafletMapRef)
  }
}

// === 键盘快捷键 ===
useKeyboardShortcuts({
  // 文件操作
  open: () => { showFileDialog.value = true },
  export: handleExportFile,

  // 选择操作
  selectAll: () => {
    if (mapSectionRef.value) {
      mapSectionRef.value.selectAllLayers?.()
    }
  },
  deselectAll: () => {
    if (mapSectionRef.value) {
      mapSectionRef.value.clearSelection?.()
    }
  },

  // 视图操作
  fit: () => {
    if (mapSectionRef.value) {
      mapSectionRef.value.zoomToFit?.()
    }
  },

  // 删除操作
  delete: deleteSelected,

  // 帮助
  showHelp: () => { showShortcutsDialog.value = true }
})

// === 生命周期 ===
onMounted(() => {
  // 延迟设置地图引用，确保所有组件都已挂载
  setTimeout(setupMapReference, 500)

  // 定期检查地图引用，确保连接正常
  const checkInterval = setInterval(() => {
    if (mapSectionRef.value?.leafletMapRef) {
      setLeafletMapRef(mapSectionRef.value.leafletMapRef)
      clearInterval(checkInterval)
    }
  }, 1000)

  // 10秒后停止检查
  setTimeout(() => clearInterval(checkInterval), 10000)
})

// 全局错误处理
const handleGlobalError = (event) => {
  console.error('全局错误:', event.error)
  if (event.error?.message?.includes('Leaflet') || event.error?.message?.includes('map')) {
    ElMessage.error('地图操作出现错误，请刷新页面重试')
  }
}

const handleUnhandledRejection = (event) => {
  console.error('未处理的Promise错误:', event.reason)
  if (event.reason?.message?.includes('地图') || event.reason?.message?.includes('map')) {
    ElMessage.warning('地图操作失败，请重试')
  }
}

// 添加事件监听器
window.addEventListener('error', handleGlobalError)
window.addEventListener('unhandledrejection', handleUnhandledRejection)

// 组件卸载时清理
onUnmounted(() => {
  cleanup()
  // 清理事件监听器
  window.removeEventListener('error', handleGlobalError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
  overflow-x: hidden;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    padding: 0 12px;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .app-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }
}

/* 加载动画 */
@keyframes appLoad {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-container {
  animation: appLoad 0.6s ease-out;
}

/* 无障碍优化 */
@media (prefers-reduced-motion: reduce) {
  .app-container {
    animation: none !important;
  }

  * {
    transition: none !important;
  }
}

/* 打印样式 */
@media print {
  .app-container {
    background: white !important;
    color: black !important;
  }

  /* 隐藏不必要的元素 */
  .loading-overlay,
  .context-menu,
  button {
    display: none !important;
  }
}
</style>
