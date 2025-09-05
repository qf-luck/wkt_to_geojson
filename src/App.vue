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
import { computed, onMounted, ref, watch, nextTick } from 'vue'
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
import * as turf from '@turf/turf'

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

// 计算面积的辅助函数
const calculateArea = (layer) => {
  try {
    const geojson = layer.toGeoJSON()
    if (!geojson.geometry.type.includes('Polygon')) {
      return null
    }

    let area
    if (layer.getRadius && typeof layer.getRadius === 'function') {
      // 圆形面积计算
      const radius = layer.getRadius()
      area = Math.PI * radius * radius
    } else {
      area = turf.area(geojson)
    }

    // 格式化面积
    if (area < 10000) {
      return `${area.toFixed(2)} m²`
    } else if (area < 1000000) {
      return `${(area / 10000).toFixed(2)} 公顷`
    } else {
      return `${(area / 1000000).toFixed(2)} km²`
    }
  } catch (e) {
    console.warn('计算面积失败:', e)
    return null
  }
}

// 设置地图引用 - 使用 watch 监听组件挂载
watch(
  mapSectionRef,
  async (newRef) => {
    if (newRef?.leafletMapRef) {
      await nextTick()
      try {
        setLeafletMapRef(newRef.leafletMapRef)
      } catch (error) {
        console.warn('设置地图引用失败:', error)
      }
    }
  },
  { immediate: true },
)

// 也在 onMounted 中尝试设置
onMounted(async () => {
  await nextTick()
  if (mapSectionRef.value?.leafletMapRef) {
    try {
      setLeafletMapRef(mapSectionRef.value.leafletMapRef)
    } catch (error) {
      console.warn('挂载时设置地图引用失败:', error)
    }
  }
})

// 计算属性
const selectionInfo = computed(() => {
  const count = selectedLayers.value.size
  if (count === 0) return '选中: --'
  let info = `选中: ${count}个图形`
  if (count === 1) {
    try {
      const layer = Array.from(selectedLayers.value)[0]
      const area = calculateArea(layer)
      if (area) {
        info += ` | 面积: ${area}`
      }
    } catch (e) {
      console.warn('计算选中图形面积失败:', e)
    }
  }
  return info
})

const totalArea = computed(() => {
  if (selectedLayers.value.size === 0) return null

  try {
    let totalAreaM2 = 0
    selectedLayers.value.forEach((layer) => {
      const geojson = layer.toGeoJSON()
      if (geojson.geometry.type.includes('Polygon')) {
        if (layer.getRadius && typeof layer.getRadius === 'function') {
          const radius = layer.getRadius()
          totalAreaM2 += Math.PI * radius * radius
        } else {
          totalAreaM2 += turf.area(geojson)
        }
      }
    })

    if (totalAreaM2 > 0) {
      if (totalAreaM2 < 10000) {
        return `${totalAreaM2.toFixed(2)} m²`
      } else if (totalAreaM2 < 1000000) {
        return `${(totalAreaM2 / 10000).toFixed(2)} 公顷`
      } else {
        return `${(totalAreaM2 / 1000000).toFixed(2)} km²`
      }
    }
  } catch (e) {
    console.warn('计算总面积失败:', e)
  }

  return null
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
