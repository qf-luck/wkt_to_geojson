<template>
  <div class="app-container">
    <!-- 头部 -->
    <HeaderSection />

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
        @draw-on-map="drawOnMap"
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
        @style-change="currentMapStyle = $event"
        @geometry-updated="updateGeoJsonFromMap"
        @selection-changed="handleSelectionChange"
        @mouse-position-changed="mousePosition = $event"
        @show-context-menu="showContextMenu"
      />

      <!-- 数据统计面板 -->
      <StatsSection :geometryStats="geometryStats" @select-geometry-type="selectGeometryType" />

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

      <!-- 加载指示器 -->
      <LoadingOverlay v-if="globalLoading" :message="loadingMessage" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import HeaderSection from './components/HeaderSection.vue'
import ConverterSection from './components/ConverterSection.vue'
import MapSection from './components/MapSection.vue'
import StatsSection from './components/StatsSection.vue'
import ContextMenu from './components/ContextMenu.vue'
import GeometryInfoDialog from './components/GeometryInfoDialog.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import { useGeometry } from './composables/useGeometry'
import { useMapOperations } from './composables/useMapOperations'
import { useValidation } from './composables/useValidation'

// 组合函数
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
  simplifyGeometry,
} = useGeometry()

const {
  currentMapStyle,
  mousePosition,
  selectedLayers,
  mapLoading,
  hasGeometry,
  geometryStats,
  drawOnMap,
  updateGeoJsonFromMap,
  selectGeometryType,
  handleSelectionChange,
  // 右键菜单相关
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
  // 几何信息相关
  geometryInfoVisible,
  selectedGeometryInfo,
  showCoordinateDetails,
  getGeometryInfo,
  setLeafletMapRef,
} = useMapOperations()

const { geojsonError, wktError } = useValidation(geojsonText, wktText)

// 地图组件引用
const mapSectionRef = ref(null)

// 设置地图引用
onMounted(() => {
  if (mapSectionRef.value?.leafletMapRef) {
    setLeafletMapRef(mapSectionRef.value.leafletMapRef)
  }
})

// 计算属性
const selectionInfo = computed(() => {
  const count = selectedLayers.value.size
  if (count === 0) return '选中: --'
  let info = `选中: ${count}个图形`
  if (count === 1) {
    const layer = Array.from(selectedLayers.value)[0]
    const area = calculateArea(layer)
    if (area) {
      info += ` | 面积: ${area}`
    }
  }
  return info
})

const totalArea = computed(() => {
  if (selectedLayers.value.size === 0) return null
  // 计算总面积逻辑...
  return null // 简化实现
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
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    padding: 0 12px;
  }
}
</style>
