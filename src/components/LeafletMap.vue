<template>
  <div
    id="map-container"
    ref="mapContainer"
    v-loading="loading"
    :loading-text="'地图加载中...'"
  ></div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import wellknown from 'wellknown'

// Props
const props = defineProps({
  currentMapStyle: String,
  loading: Boolean,
})

// Emits
const emit = defineEmits([
  'geometry-updated',
  'selection-changed',
  'mouse-position-changed',
  'show-context-menu',
])

// Refs
const mapContainer = ref(null)

// 内部状态
let map = null
let tileLayers = {}
let drawnItems = null
const selectedLayers = ref(new Set())

// 修复 Leaflet 图标路径问题
const fixLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// 初始化地图
const initMap = async () => {
  await nextTick()

  if (!mapContainer.value) {
    ElMessage.error('地图容器未找到')
    return
  }

  try {
    // 修复 Leaflet 图标问题
    fixLeafletIcons()

    // 清理可能存在的旧地图实例
    if (map) {
      map.remove()
      map = null
    }

    // 确保容器有尺寸
    if (mapContainer.value.offsetWidth === 0 || mapContainer.value.offsetHeight === 0) {
      console.warn('地图容器尺寸为0，等待DOM更新')
      await nextTick()
    }

    // 创建地图实例
    map = L.map(mapContainer.value, {
      center: [39.9042, 116.4074], // 北京天安门
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: false, // 使用SVG渲染以获得更好的性能
    })

    // 初始化瓦片图层
    tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: true,
      }),
      light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        crossOrigin: true,
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        crossOrigin: true,
      }),
      satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 18,
          crossOrigin: true,
        },
      ),
    }

    // 添加默认图层
    const defaultLayer = tileLayers[props.currentMapStyle] || tileLayers.osm
    defaultLayer.addTo(map)

    // 创建绘图图层组
    drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    // 配置绘制控件
    setupDrawControls()

    // 设置地图事件
    setupMapEvents()

    // 地图准备就绪后的回调
    map.whenReady(() => {
      console.log('地图初始化完成')
      // 强制刷新地图尺寸
      setTimeout(() => {
        if (map) {
          map.invalidateSize()
        }
      }, 100)

      ElMessage.success('地图加载完成')
    })

    // 监听地图加载错误
    map.on('tileerror', (e) => {
      console.warn('瓦片加载错误:', e)
      ElMessage.warning('部分地图瓦片加载失败，可能影响显示效果')
    })
  } catch (error) {
    console.error('地图初始化错误:', error)
    ElMessage.error(`地图加载失败: ${error.message}`)
  }
}

// 配置绘制控件
const setupDrawControls = () => {
  const drawControl = new L.Control.Draw({
    position: 'topleft',
    edit: {
      featureGroup: drawnItems,
      remove: true,
      edit: {
        selectedPathOptions: {
          maintainColor: true,
          opacity: 0.3,
        },
      },
    },
    draw: {
      polygon: {
        allowIntersection: false,
        drawError: {
          color: '#e1e100',
          message: '<strong>警告!</strong> 不能绘制自相交的多边形!',
        },
        shapeOptions: {
          color: '#3388ff',
          weight: 2,
          fillOpacity: 0.2,
        },
      },
      polyline: {
        shapeOptions: {
          color: '#f357a1',
          weight: 3,
        },
      },
      rectangle: {
        shapeOptions: {
          color: '#ed6a5a',
          weight: 2,
          fillOpacity: 0.2,
        },
      },
      circle: {
        shapeOptions: {
          color: '#9bc53d',
          weight: 2,
          fillOpacity: 0.2,
        },
      },
      marker: {
        icon: new L.Icon.Default(),
      },
      circlemarker: false,
    },
  })

  map.addControl(drawControl)
}

// 设置地图事件
const setupMapEvents = () => {
  // 绘制事件
  map.on(L.Draw.Event.CREATED, (event) => {
    const layer = event.layer
    drawnItems.addLayer(layer)
    setupLayerEvents(layer)
    emit('geometry-updated')
    ElMessage.success(`${getGeometryTypeName(event.layerType)}已添加`)
  })

  map.on(L.Draw.Event.EDITED, (event) => {
    event.layers.eachLayer((layer) => {
      setupLayerEvents(layer)
    })
    emit('geometry-updated')
    ElMessage.success('图形已编辑')
  })

  map.on(L.Draw.Event.DELETED, (event) => {
    clearSelection()
    emit('geometry-updated')
    const count = Object.keys(event.layers._layers).length
    ElMessage.success(`已删除${count}个图形`)
  })

  // 地图事件
  map.on('mousemove', (e) => {
    const lat = e.latlng.lat.toFixed(6)
    const lng = e.latlng.lng.toFixed(6)
    emit('mouse-position-changed', `鼠标位置: ${lng}, ${lat}`)
  })

  map.on('click', () => {
    clearSelection()
  })
}

// 设置图层事件
const setupLayerEvents = (layer) => {
  layer.off('click contextmenu')

  layer.on('click', (e) => {
    L.DomEvent.stopPropagation(e)

    if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
      toggleLayerSelection(layer)
    } else {
      clearSelection()
      selectLayer(layer)
    }
  })

  layer.on('contextmenu', (e) => {
    L.DomEvent.stopPropagation(e)

    if (!selectedLayers.value.has(layer)) {
      clearSelection()
      selectLayer(layer)
    }
    emit('show-context-menu', e.containerPoint)
  })

  // 鼠标悬停效果
  layer.on('mouseover', () => {
    if (!selectedLayers.value.has(layer)) {
      highlightLayer(layer, true, true)
    }
  })

  layer.on('mouseout', () => {
    if (!selectedLayers.value.has(layer)) {
      highlightLayer(layer, false)
    }
  })
}

// 图层选择管理
const selectLayer = (layer) => {
  selectedLayers.value.add(layer)
  highlightLayer(layer, true, false)
  emit('selection-changed', selectedLayers.value)
}

const deselectLayer = (layer) => {
  selectedLayers.value.delete(layer)
  highlightLayer(layer, false)
  emit('selection-changed', selectedLayers.value)
}

const toggleLayerSelection = (layer) => {
  if (selectedLayers.value.has(layer)) {
    deselectLayer(layer)
  } else {
    selectLayer(layer)
  }
}

const clearSelection = () => {
  selectedLayers.value.forEach((layer) => {
    highlightLayer(layer, false)
  })
  selectedLayers.value.clear()
  emit('selection-changed', selectedLayers.value)
}

// 图层高亮
const highlightLayer = (layer, highlight, isHover = false) => {
  let style

  if (highlight) {
    if (isHover) {
      style = { color: '#ffa500', weight: 3, fillOpacity: 0.4 }
    } else {
      style = { color: '#ff4444', weight: 4, fillOpacity: 0.3 }
    }
  } else {
    // 恢复默认样式
    if (layer instanceof L.Marker) {
      return
    } else if (layer instanceof L.Circle) {
      style = { color: '#9bc53d', weight: 2, fillOpacity: 0.2 }
    } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      style = { color: '#3388ff', weight: 2, fillOpacity: 0.2 }
    } else {
      style = { color: '#f357a1', weight: 3 }
    }
  }

  if (layer.setStyle) {
    layer.setStyle(style)
  }
}

// 获取几何类型中文名称
const getGeometryTypeName = (type) => {
  const typeNames = {
    polygon: '多边形',
    polyline: '线段',
    rectangle: '矩形',
    circle: '圆形',
    marker: '标记点',
  }
  return typeNames[type] || '图形'
}

// 切换瓦片图层
const switchTileLayer = (styleKey) => {
  if (!map || !tileLayers[styleKey]) return

  try {
    Object.values(tileLayers).forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer)
    })
    tileLayers[styleKey].addTo(map)
    ElMessage.success(
      `已切换到${styleKey === 'osm' ? '标准' : styleKey === 'light' ? '简洁' : styleKey === 'dark' ? '暗色' : '卫星'}地图`,
    )
  } catch (e) {
    ElMessage.error('切换地图失败：' + e.message)
  }
}

// 在地图上绘制数据
const drawOnMap = async (text, type) => {
  if (!text || !map) {
    ElMessage.warning('没有内容可以绘制或地图未准备好')
    return
  }

  try {
    let geojson

    if (type === 'geojson') {
      const parsed = JSON.parse(text)
      if (parsed.type === 'FeatureCollection' || parsed.type === 'Feature') {
        geojson = parsed
      } else {
        geojson = {
          type: 'Feature',
          geometry: parsed,
          properties: {},
        }
      }
    } else {
      const lines = text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('--'))

      if (lines.length === 0) {
        throw new Error('没有有效的WKT内容')
      }

      if (lines.length === 1) {
        const geometry = wellknown.parse(lines[0].trim())
        geojson = {
          type: 'Feature',
          geometry: geometry,
          properties: {},
        }
      } else {
        const features = lines
          .map((line, index) => {
            try {
              return {
                type: 'Feature',
                geometry: wellknown.parse(line.trim()),
                properties: { id: index + 1 },
              }
            } catch (e) {
              console.warn(`解析第${index + 1}行WKT失败:`, e)
              return null
            }
          })
          .filter((f) => f !== null)

        if (features.length === 0) {
          throw new Error('没有有效的WKT可以解析')
        }

        geojson = {
          type: 'FeatureCollection',
          features: features,
        }
      }
    }

    // 清空地图并重新绘制
    drawnItems.clearLayers()
    clearSelection()

    const layer = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng)
      },
      style: (feature) => {
        const geometryType = feature.geometry.type
        if (geometryType.includes('Polygon')) {
          return { color: '#3388ff', weight: 2, fillOpacity: 0.2 }
        } else if (geometryType.includes('LineString')) {
          return { color: '#f357a1', weight: 3 }
        }
        return {}
      },
    })

    layer.eachLayer((l) => {
      drawnItems.addLayer(l)
      setupLayerEvents(l)
    })

    // 自适应视图
    if (drawnItems.getLayers().length > 0) {
      try {
        const bounds = drawnItems.getBounds()
        map.fitBounds(bounds.pad(0.1))
      } catch (e) {
        console.warn('设置地图范围失败:', e)
      }
    }

    ElMessage.success(`已在地图上显示${drawnItems.getLayers().length}个图形`)
  } catch (e) {
    console.error('绘制到地图失败:', e)
    ElMessage.error('数据格式错误：' + e.message)
  }
}

// 清空所有图层
const clearAllLayers = () => {
  if (drawnItems) {
    drawnItems.clearLayers()
    clearSelection()
  }
}

// 缩放到合适范围
const zoomToFit = () => {
  if (!map || !drawnItems || drawnItems.getLayers().length === 0) {
    ElMessage.warning('地图上没有图形')
    return
  }

  try {
    const bounds = drawnItems.getBounds()
    map.fitBounds(bounds.pad(0.1))
    ElMessage.success('已调整到最佳视图')
  } catch (e) {
    ElMessage.error('调整视图失败：' + e.message)
  }
}

// 监听地图样式变化
watch(
  () => props.currentMapStyle,
  (newStyle) => {
    if (newStyle) {
      switchTileLayer(newStyle)
    }
  },
)

// 生命周期
onMounted(initMap)

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// 暴露方法
defineExpose({
  drawOnMap,
  clearAllLayers,
  clearSelection,
  zoomToFit,
  getSelectedLayers: () => selectedLayers.value,
  getDrawnItems: () => drawnItems,
})
</script>

<style scoped>
#map-container {
  width: 100%;
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e4e7ed;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

/* 响应式设计 */
@media (max-width: 768px) {
  #map-container {
    height: 400px;
  }
}

/* Leaflet Draw 工具栏样式优化 */
:deep(.leaflet-draw-toolbar) {
  margin-left: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

:deep(.leaflet-draw-toolbar a) {
  width: 34px !important;
  height: 34px !important;
  line-height: 34px !important;
  display: block !important;
  text-align: center !important;
  text-decoration: none !important;
  background: white !important;
  border: 1px solid #ddd !important;
  transition: all 0.2s ease !important;
}

:deep(.leaflet-draw-toolbar a:hover) {
  background-color: #f0f9ff !important;
  border-color: #409eff !important;
  transform: scale(1.05);
}

:deep(.leaflet-draw-toolbar a.leaflet-draw-toolbar-button-enabled) {
  background: linear-gradient(135deg, #409eff 0%, #1976d2 100%) !important;
  border-color: #1976d2 !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3) !important;
}

/* 绘制提示框样式 */
:deep(.leaflet-draw-tooltip) {
  background: rgba(0, 0, 0, 0.85) !important;
  color: white !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  font-size: 13px !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  backdrop-filter: blur(10px) !important;
}
</style>
