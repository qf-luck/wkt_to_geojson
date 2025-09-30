<!-- src/components/LeafletMap.vue - 优化版本 -->
<template>
  <div
    id="map-container"
    ref="mapContainer"
    v-loading="loading"
    loading-text="地图加载中..."
  ></div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import wellknown from 'wellknown'
import { useHistory } from '../composables/useHistory'

// 全局修复leaflet-draw的readableArea bug (只在组件外执行一次)
let leafletDrawFixed = false
if (typeof window !== 'undefined' && !leafletDrawFixed) {
  // 延迟修复以确保leaflet-draw完全加载
  setTimeout(() => {
    if (window.L && window.L.GeometryUtil && !leafletDrawFixed) {
      // 重写有问题的函数
      window.L.GeometryUtil.readableArea = function(area, isMetric, type) {
        let areaStr = ''

        // 确保 area 是数字
        area = parseFloat(area)
        if (isNaN(area)) {
          return '0 m²'
        }

        if (isMetric !== false) { // 默认使用公制
          if (area >= 10000) {
            areaStr = (area * 0.0001).toFixed(2) + ' 公顷'
          } else {
            areaStr = area.toFixed(2) + ' m²'
          }
        } else {
          area *= 10.7639  // 转换为平方英尺
          if (area >= 43560) {
            areaStr = (area / 43560).toFixed(2) + ' 英亩'
          } else {
            areaStr = area.toFixed(2) + ' ft²'
          }
        }

        return areaStr
      }

      window.L.GeometryUtil.readableDistance = function(distance, isMetric, isFeet, isNauticalMile) {
        let distanceStr = ''

        // 确保 distance 是数字
        distance = parseFloat(distance)
        if (isNaN(distance)) {
          return '0 m'
        }

        if (isMetric) {
          if (distance > 1000) {
            distanceStr = (distance / 1000).toFixed(2) + ' km'
          } else {
            distanceStr = distance.toFixed(2) + ' m'
          }
        } else {
          distance *= 3.28084  // 转换为英尺
          if (distance >= 5280) {
            distanceStr = (distance / 5280).toFixed(2) + ' 英里'
          } else {
            distanceStr = distance.toFixed(2) + ' ft'
          }
        }

        return distanceStr
      }

      leafletDrawFixed = true
    }
  }, 0)
}

// Props
const props = defineProps({
  currentMapStyle: { type: String, default: 'osm' },
  loading: Boolean
})

// Emits
const emit = defineEmits([
  'geometry-updated',
  'selection-changed',
  'mouse-position-changed',
  'show-context-menu',
  'show-layer-properties'
])

// 核心引用
const mapContainer = ref(null)

// 地图实例和状态
let map = null
let tileLayers = {}
let drawnItems = null
let drawControl = null
const selectedLayers = ref(new Set())
const isInitialized = ref(false)

// 历史记录管理
const mapHistory = useHistory(50)

// 保存当前地图状态到历史
const saveMapState = (description = '地图操作') => {
  if (!drawnItems) return

  const state = {
    layers: [],
    timestamp: Date.now()
  }

  drawnItems.eachLayer(layer => {
    try {
      state.layers.push({
        geojson: layer.toGeoJSON(),
        selected: selectedLayers.value.has(layer)
      })
    } catch (error) {
      console.warn('保存图层失败:', error)
    }
  })

  mapHistory.addToHistory(JSON.stringify(state), description)
}

// 从历史恢复地图状态
const restoreMapState = (stateStr) => {
  if (!stateStr || !drawnItems) return false

  try {
    const state = JSON.parse(stateStr)
    drawnItems.clearLayers()
    clearSelection()

    state.layers.forEach(layerData => {
      const layer = L.geoJSON(layerData.geojson, {
        pointToLayer: (feature, latlng) => L.marker(latlng),
        style: (feature) => {
          const type = feature.geometry.type
          if (type.includes('Polygon')) return { color: '#3498db', weight: 3, fillOpacity: 0.2 }
          if (type.includes('LineString')) return { color: '#e74c3c', weight: 4 }
          return {}
        }
      })

      layer.eachLayer(l => {
        l.feature = layerData.geojson
        drawnItems.addLayer(l)
        setupLayerEvents(l)
        if (layerData.selected) {
          selectLayer(l)
        }
      })
    })

    emit('geometry-updated')
    return true
  } catch (error) {
    console.error('恢复地图状态失败:', error)
    return false
  }
}

// 撤销操作
const undoMapAction = () => {
  const prevState = mapHistory.undo()
  if (prevState) {
    if (restoreMapState(prevState)) {
      ElMessage.success('已撤销')
    } else {
      ElMessage.error('撤销失败')
    }
  } else {
    ElMessage.warning('没有可撤销的操作')
  }
}

// 重做操作
const redoMapAction = () => {
  const nextState = mapHistory.redo()
  if (nextState) {
    if (restoreMapState(nextState)) {
      ElMessage.success('已重做')
    } else {
      ElMessage.error('重做失败')
    }
  } else {
    ElMessage.warning('没有可重做的操作')
  }
}

// === 工具函数 ===
const fixLeafletIcons = () => {
  try {
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
    })
  } catch (error) {
    console.warn('修复Leaflet图标失败:', error)
  }
}

// 无需在组件内重复修复 - 已在组件外全局修复

// 预留的格式化函数供将来使用
// const formatArea = (squareMeters) => {
//   if (squareMeters < 10000) return `${squareMeters.toFixed(2)} m²`
//   if (squareMeters < 1000000) return `${(squareMeters / 10000).toFixed(2)} 公顷`
//   return `${(squareMeters / 1000000).toFixed(2)} km²`
// }

// const formatLength = (meters) => {
//   if (meters < 1000) return `${meters.toFixed(2)} m`
//   return `${(meters / 1000).toFixed(2)} km`
// }

const getGeometryTypeName = (type) => {
  const typeNames = {
    polygon: '多边形', polyline: '线段', rectangle: '矩形',
    circle: '圆形', marker: '标记点', point: '点'
  }
  return typeNames[type?.toLowerCase()] || '图形'
}

const calculateArea = (layer) => {
  try {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      // 使用 Leaflet 的 GeometryUtil 计算面积
      const latlngs = layer.getLatLngs()[0]
      let area = 0
      for (let i = 0; i < latlngs.length - 1; i++) {
        area += latlngs[i].distanceTo(latlngs[i + 1])
      }
      // 简化的面积计算，实际应使用更精确的算法
      return Math.abs(area).toFixed(2)
    } else if (layer instanceof L.Circle) {
      const radius = layer.getRadius()
      return (Math.PI * radius * radius).toFixed(2)
    }
  } catch (error) {
    console.warn('计算面积失败:', error)
  }
  return null
}

const calculateLength = (layer) => {
  try {
    if (layer instanceof L.Polyline) {
      const latlngs = layer.getLatLngs()
      let totalLength = 0
      for (let i = 0; i < latlngs.length - 1; i++) {
        totalLength += latlngs[i].distanceTo(latlngs[i + 1])
      }
      return totalLength.toFixed(2)
    }
  } catch (error) {
    console.warn('计算长度失败:', error)
  }
  return null
}

// === 地图初始化 ===
const initTileLayers = () => {
  tileLayers = {
    // 中国地图服务（优先）
    gaode: L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      attribution: '&copy; <a href="https://www.amap.com/">高德地图</a>',
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      minZoom: 3
    }),
    gaodeSatellite: L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
      attribution: '&copy; <a href="https://www.amap.com/">高德卫星图</a>',
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      minZoom: 3
    }),
    tianditu: L.tileLayer('https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=YOUR_TIANDITU_KEY', {
      attribution: '&copy; <a href="https://www.tianditu.gov.cn/">天地图</a>',
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      maxZoom: 18
    }),

    // 国际地图服务
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19
    }),
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      maxZoom: 18
    })
  }
}

const setupDrawControls = () => {
  try {
    if (drawControl) map.removeControl(drawControl)

    drawControl = new L.Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawnItems,
        remove: true,
        poly: {
          allowIntersection: false
        }
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e74c3c',
            message: '<strong>错误:</strong> 形状边缘不能交叉!'
          },
          shapeOptions: { 
            color: '#3498db', 
            weight: 3, 
            fillOpacity: 0.2,
            stroke: true,
            fill: true
          }
        },
        polyline: {
          shapeOptions: { 
            color: '#e74c3c', 
            weight: 4,
            opacity: 1
          }
        },
        rectangle: {
          shapeOptions: { 
            color: '#f39c12', 
            weight: 3, 
            fillOpacity: 0.2,
            stroke: true,
            fill: true,
            clickable: true
          },
          showArea: true
        },
        circle: {
          shapeOptions: { 
            color: '#2ecc71', 
            weight: 3, 
            fillOpacity: 0.2,
            stroke: true,
            fill: true
          },
          showRadius: true
        },
        marker: {
          icon: new L.Icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        },
        circlemarker: {
          color: '#9b59b6',
          weight: 3,
          fillOpacity: 0.6,
          radius: 8
        }
      }
    })

    map.addControl(drawControl)
  } catch (error) {
    console.error('设置绘制控件失败:', error)
  }
}

const addCustomControls = () => {
  // 坐标显示控件
  const CoordinateControl = L.Control.extend({
    onAdd: function(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-coordinates')
      Object.assign(container.style, {
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '5px 10px',
        fontSize: '12px',
        borderRadius: '4px',
        fontFamily: 'monospace'
      })
      container.innerHTML = '经度: --, 纬度: --'

      map.on('mousemove', (e) => {
        const lat = e.latlng.lat.toFixed(6)
        const lng = e.latlng.lng.toFixed(6)
        container.innerHTML = `经度: ${lng}, 纬度: ${lat}`
        emit('mouse-position-changed', `经度: ${lng}, 纬度: ${lat}`)
      })

      return container
    }
  })

  new CoordinateControl({ position: 'bottomright' }).addTo(map)

  // 比例尺
  L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
  }).addTo(map)
}

// === 事件处理 ===
const setupLayerEvents = (layer) => {
  layer.off('click contextmenu mouseover mouseout')

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
    emit('show-context-menu', { 
      point: e.containerPoint, 
      layer: layer 
    })
  })

  // 双击显示属性
  layer.on('dblclick', (e) => {
    L.DomEvent.stopPropagation(e)
    showLayerProperties(layer)
  })

  layer.on('mouseover', () => {
    if (!selectedLayers.value.has(layer)) {
      highlightLayer(layer, true)
    }
  })

  layer.on('mouseout', () => {
    if (!selectedLayers.value.has(layer)) {
      highlightLayer(layer, false)
    }
  })
}

const setupMapEvents = () => {
  // 绘制事件
  map.on(L.Draw.Event.CREATED, (event) => {
    try {
      const layer = event.layer
      const type = event.layerType || 'unknown'
      
      // console.log('绘制事件:', { layer, type, event })

      // 特殊处理矩形类型
      let geometry
      try {
        geometry = layer.toGeoJSON().geometry
      } catch (geoError) {
        console.warn('获取GeoJSON失败:', geoError)
        // 为矩形创建默认几何体
        if (type === 'rectangle' && layer.getBounds) {
          const bounds = layer.getBounds()
          const ne = bounds.getNorthEast()
          const sw = bounds.getSouthWest()
          geometry = {
            type: 'Polygon',
            coordinates: [[
              [sw.lng, sw.lat],
              [ne.lng, sw.lat],
              [ne.lng, ne.lat],
              [sw.lng, ne.lat],
              [sw.lng, sw.lat]
            ]]
          }
        } else {
          console.error('无法处理图层几何体')
          return
        }
      }
      
      if (type === 'rectangle' && layer.getBounds) {
        // 确保矩形正确转换为多边形几何体
        const bounds = layer.getBounds()
        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        const nw = L.latLng(ne.lat, sw.lng)
        const se = L.latLng(sw.lat, ne.lng)
        
        geometry = {
          type: 'Polygon',
          coordinates: [[
            [sw.lng, sw.lat],
            [se.lng, se.lat],
            [ne.lng, ne.lat],
            [nw.lng, nw.lat],
            [sw.lng, sw.lat]
          ]]
        }
      }

    // 设置图层属性
    layer.feature = {
      type: 'Feature',
      properties: {
        id: Date.now(),
        type: type,
        created: new Date().toISOString(),
        name: `${getGeometryTypeName(type)}_${Date.now()}`,
        area: type === 'rectangle' || type === 'polygon' || type === 'circle' ? calculateArea(layer) : null,
        length: type === 'polyline' ? calculateLength(layer) : null
      },
      geometry: geometry
    }

    drawnItems.addLayer(layer)
    setupLayerEvents(layer)

    // 保存到历史记录
    saveMapState(`创建${getGeometryTypeName(type)}`)
    emit('geometry-updated')

      ElNotification({
        title: '创建成功',
        message: `${getGeometryTypeName(type)}已添加`,
        type: 'success',
        duration: 2000
      })
    } catch (error) {
      console.error('绘制事件处理失败:', error)
      ElMessage.error('创建图形失败: ' + error.message)
    }
  })

  map.on(L.Draw.Event.EDITED, (event) => {
    event.layers.eachLayer((layer) => {
      if (layer.feature?.properties) {
        layer.feature.properties.edited = new Date().toISOString()
      }
      setupLayerEvents(layer)
    })

    // 保存到历史记录
    saveMapState('编辑图形')
    emit('geometry-updated')
    ElMessage.success('编辑完成')
  })

  map.on(L.Draw.Event.DELETED, () => {
    clearSelection()

    // 保存到历史记录
    saveMapState('删除图形')
    emit('geometry-updated')
    ElMessage.success('删除完成')
  })

  // 地图交互事件
  map.on('click', (e) => {
    if (!e.originalEvent.target.closest('.leaflet-interactive')) {
      clearSelection()
    }
  })

  map.on('contextmenu', (e) => {
    if (selectedLayers.value.size === 0) return
    emit('show-context-menu', e.containerPoint)
  })
}

// === 图层选择管理 ===
const selectLayer = (layer) => {
  selectedLayers.value.add(layer)
  highlightLayer(layer, true, 'selected')
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
  selectedLayers.value.forEach(layer => highlightLayer(layer, false))
  selectedLayers.value.clear()
  emit('selection-changed', selectedLayers.value)
}

const selectAllLayers = () => {
  clearSelection()
  drawnItems.eachLayer(layer => selectLayer(layer))
  const count = selectedLayers.value.size
  if (count > 0) {
    ElMessage.success(`已选择 ${count} 个图层`)
  }
}

// === 图层样式管理 ===
const highlightLayer = (layer, highlight, type = 'hover') => {
  if (layer instanceof L.Marker) return

  let style = {}

  if (highlight) {
    if (type === 'selected') {
      style = { color: '#e74c3c', weight: 5, fillOpacity: 0.3, dashArray: '5, 5' }
    } else {
      style = { color: '#ff9500', weight: 4, fillOpacity: 0.4 }
    }
  } else {
    // 恢复默认样式
    if (layer instanceof L.Circle) {
      style = { color: '#2ecc71', weight: 3, fillOpacity: 0.2 }
    } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      style = { color: '#3498db', weight: 3, fillOpacity: 0.2 }
    } else {
      style = { color: '#e74c3c', weight: 4 }
    }
  }

  if (layer.setStyle) layer.setStyle(style)
}

// === 地图样式切换 ===
const switchTileLayer = (styleKey) => {
  if (!map || !tileLayers[styleKey]) return

  try {
    Object.values(tileLayers).forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer)
    })
    tileLayers[styleKey].addTo(map)

    const styleNames = {
      gaode: '高德地图',
      gaodeSatellite: '高德卫星图',
      tianditu: '天地图',
      osm: '标准地图',
      light: '简洁地图',
      dark: '暗色地图',
      satellite: '卫星地图'
    }
    ElMessage.success(`已切换到${styleNames[styleKey] || styleKey}`)
  } catch (error) {
    console.error('切换地图失败:', error)
    ElMessage.error('切换地图失败')
  }
}

// === 主要地图操作 ===
const initMap = async () => {
  if (isInitialized.value) return

  try {
    await nextTick()

    if (!mapContainer.value) {
      throw new Error('地图容器未找到')
    }

    // 等待容器有正确尺寸
    let retries = 0
    while (mapContainer.value.offsetWidth === 0 && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 50))
      retries++
    }

    fixLeafletIcons()

    if (map) {
      map.off()
      map.remove()
    }

    map = L.map(mapContainer.value, {
      center: [35.0, 105.0],  // 中国中心位置
      zoom: 5,  // 更大的视野，适合查看整个中国
      zoomControl: true,
      attributionControl: true,
      crs: L.CRS.EPSG3857,
      worldCopyJump: false,
      maxBoundsViscosity: 1.0,
      zoomSnap: 0.5,  // 允许更平滑的缩放
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 100  // 鼠标滚轮缩放更顺滑
    })

    initTileLayers()
    tileLayers[props.currentMapStyle].addTo(map)

    drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    setupDrawControls()
    addCustomControls()
    setupMapEvents()

    isInitialized.value = true

    map.whenReady(() => {
      setTimeout(() => map.invalidateSize(), 100)
      ElMessage.success('地图加载完成')
    })

  } catch (error) {
    console.error('地图初始化失败:', error)
    ElMessage.error('地图加载失败: ' + error.message)
  }
}

const drawOnMap = async (text, type, options = {}) => {
  if (!text || !map || !isInitialized.value) {
    return Promise.reject(new Error('地图未准备好或数据为空'))
  }

  try {
    const { clearExisting = true, autoFit = true } = options
    let geojson

    if (type === 'geojson') {
      const parsed = JSON.parse(text)
      geojson = parsed.type === 'FeatureCollection' || parsed.type === 'Feature'
        ? parsed
        : { type: 'Feature', geometry: parsed, properties: { imported: true } }
    } else {
      // WKT处理
      const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('--'))

      if (lines.length === 0) {
        throw new Error('没有有效的WKT内容')
      }

      if (lines.length === 1) {
        geojson = {
          type: 'Feature',
          geometry: wellknown.parse(lines[0].trim()),
          properties: { imported: true, source: 'WKT' }
        }
      } else {
        const features = lines.map((line, index) => {
          try {
            return {
              type: 'Feature',
              geometry: wellknown.parse(line.trim()),
              properties: { id: index + 1, imported: true, source: 'WKT' }
            }
          } catch (e) {
            console.warn(`解析第${index + 1}行失败:`, e)
            return null
          }
        }).filter(f => f !== null)

        if (features.length === 0) {
          throw new Error('没有有效的WKT可解析')
        }

        geojson = { type: 'FeatureCollection', features }
      }
    }

    // 根据选项决定是否清空现有图层
    if (clearExisting) {
      drawnItems.clearLayers()
      clearSelection()
    }

    const layer = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => L.marker(latlng),
      style: (feature) => {
        const type = feature.geometry.type
        if (type.includes('Polygon')) return { color: '#3498db', weight: 3, fillOpacity: 0.2 }
        if (type.includes('LineString')) return { color: '#e74c3c', weight: 4 }
        return {}
      },
      onEachFeature: (feature, layer) => {
        layer.feature = feature
        if (!feature.properties.name) {
          feature.properties.name = `导入_${getGeometryTypeName(feature.geometry.type)}_${Date.now()}`
        }
      }
    })

    let layerCount = 0
    layer.eachLayer(l => {
      drawnItems.addLayer(l)
      setupLayerEvents(l)
      layerCount++
    })

    // 根据选项决定是否自适应视图
    if (autoFit && drawnItems.getLayers().length > 0) {
      try {
        const bounds = drawnItems.getBounds()
        map.fitBounds(bounds.pad(0.1), { animate: true, duration: 0.5 })
      } catch (e) {
        console.warn('设置视图范围失败:', e)
      }
    }

    ElNotification({
      title: '导入成功',
      message: `已显示 ${layerCount} 个图形`,
      type: 'success',
      duration: 3000
    })

    return Promise.resolve()

  } catch (error) {
    console.error('绘制失败:', error)
    ElMessage.error('数据格式错误: ' + error.message)
    return Promise.reject(error)
  }
}

const clearAllLayers = () => {
  if (!drawnItems) return

  const count = drawnItems.getLayers().length
  drawnItems.clearLayers()
  clearSelection()
  emit('geometry-updated')

  if (count > 0) {
    ElMessage.success(`已清空 ${count} 个图层`)
  }
}

const zoomToFit = () => {
  if (!map || !drawnItems || drawnItems.getLayers().length === 0) {
    ElMessage.warning('没有图形可显示')
    return
  }

  try {
    const bounds = drawnItems.getBounds()
    map.fitBounds(bounds.pad(0.1), { animate: true })
    ElMessage.success('已调整到最佳视图')
  } catch {
    ElMessage.error('调整视图失败')
  }
}

const zoomToSelected = () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图层')
    return
  }

  try {
    const group = new L.FeatureGroup(Array.from(selectedLayers.value))
    const bounds = group.getBounds()
    map.fitBounds(bounds.pad(0.2), { animate: true })
    ElMessage.success('已缩放到选中图层')
  } catch {
    ElMessage.error('缩放失败')
  }
}

const searchLayers = (searchTerm) => {
  clearSelection()
  let foundCount = 0

  drawnItems.eachLayer(layer => {
    const feature = layer.feature
    if (!feature?.properties) return

    const searchable = [
      feature.properties.name,
      feature.properties.type,
      getGeometryTypeName(feature.properties.type)
    ].join(' ').toLowerCase()

    if (searchable.includes(searchTerm.toLowerCase())) {
      selectLayer(layer)
      foundCount++
    }
  })

  if (foundCount > 0) {
    ElMessage.success(`找到 ${foundCount} 个匹配图层`)
  } else {
    ElMessage.info('未找到匹配图层')
  }
}

const showLayerProperties = (layer) => {
  if (!layer || !layer.feature) {
    ElMessage.warning('无法获取图层信息')
    return
  }
  
  emit('show-layer-properties', layer)
}

const getSelectedLayerProperties = () => {
  if (selectedLayers.value.size === 0) {
    return []
  }
  
  return Array.from(selectedLayers.value).map(layer => ({
    layer: layer,
    properties: layer.feature?.properties || {},
    geometry: layer.feature?.geometry || null
  }))
}

// === 生命周期和监听器 ===
watch(() => props.currentMapStyle, (newStyle) => {
  if (newStyle && isInitialized.value) {
    switchTileLayer(newStyle)
  }
})

onMounted(() => {
  // 延迟初始化地图以确保容器准备就绪
  setTimeout(() => {
    initMap()
  }, 100)
})

onUnmounted(() => {
  isInitialized.value = false
  if (map) {
    map.off()
    map.remove()
    map = null
  }
})

// === 坐标跳转 ===
const jumpToCoordinate = (lng, lat, zoom = 12) => {
  if (!map) {
    ElMessage.warning('地图未准备好')
    return
  }

  try {
    map.setView([lat, lng], zoom, { animate: true })

    // 添加临时标记
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'jump-marker',
        html: '<div style="background: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>'
      })
    }).addTo(map)

    // 3秒后移除标记
    setTimeout(() => {
      map.removeLayer(marker)
    }, 3000)
  } catch (error) {
    console.error('跳转失败:', error)
    ElMessage.error('坐标跳转失败')
  }
}

// === 测量工具 ===
let measureLayer = null

const startMeasureDistance = () => {
  if (!map) return

  // 清除之前的测量
  if (measureLayer) {
    map.removeLayer(measureLayer)
  }

  const points = []
  let tempLine = null

  const measureClick = (e) => {
    points.push(e.latlng)

    if (points.length === 1) {
      // 第一个点
      L.circleMarker(e.latlng, { radius: 6, color: '#ff4444' }).addTo(map)
      ElMessage.info('请点击第二个点')
    } else if (points.length === 2) {
      // 第二个点 - 计算距离
      L.circleMarker(e.latlng, { radius: 6, color: '#ff4444' }).addTo(map)

      const line = L.polyline(points, { color: '#ff4444', weight: 3, dashArray: '5, 10' }).addTo(map)
      measureLayer = line

      const distance = points[0].distanceTo(points[1])
      const distanceText = distance < 1000
        ? `${distance.toFixed(2)} 米`
        : `${(distance / 1000).toFixed(2)} 公里`

      const midpoint = L.latLng(
        (points[0].lat + points[1].lat) / 2,
        (points[0].lng + points[1].lng) / 2
      )

      L.marker(midpoint, {
        icon: L.divIcon({
          className: 'measure-label',
          html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-weight: bold; color: #ff4444;">${distanceText}</div>`
        })
      }).addTo(map)

      map.off('click', measureClick)
      ElMessage.success(`测量完成: ${distanceText}`)

      return { title: '距离测量', value: distanceText }
    }
  }

  map.on('click', measureClick)
}

const startMeasureArea = () => {
  if (!map) return

  // 使用leaflet-draw的多边形工具
  const polygonDrawer = new L.Draw.Polygon(map, drawControl.options.draw.polygon)
  polygonDrawer.enable()

  map.once(L.Draw.Event.CREATED, (event) => {
    const layer = event.layer
    const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0])

    const areaText = area < 10000
      ? `${area.toFixed(2)} 平方米`
      : area < 1000000
      ? `${(area / 10000).toFixed(2)} 公顷`
      : `${(area / 1000000).toFixed(2)} 平方公里`

    layer.setStyle({ color: '#4CAF50', fillOpacity: 0.2 })
    layer.addTo(map)
    measureLayer = layer

    const center = layer.getBounds().getCenter()
    L.marker(center, {
      icon: L.divIcon({
        className: 'measure-label',
        html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-weight: bold; color: #4CAF50;">${areaText}</div>`
      })
    }).addTo(map)

    ElMessage.success(`测量完成: ${areaText}`)

    return { title: '面积测量', value: areaText }
  })
}

const clearMeasure = () => {
  if (measureLayer && map) {
    map.removeLayer(measureLayer)
    measureLayer = null
  }
}

// === 获取图层列表 ===
const getLayersList = () => {
  const layers = []
  if (!drawnItems) return layers

  drawnItems.eachLayer(layer => {
    try {
      const feature = layer.toGeoJSON()
      layers.push({
        id: layer._leaflet_id,
        name: layer.feature?.properties?.name || `图层${layer._leaflet_id}`,
        type: feature.geometry.type,
        selected: selectedLayers.value.has(layer),
        visible: true,
        layer: layer
      })
    } catch (error) {
      console.warn('获取图层信息失败:', error)
    }
  })

  return layers
}

// === 暴露方法 ===
defineExpose({
  drawOnMap,
  clearAllLayers,
  clearSelection,
  zoomToFit,
  zoomToSelected,
  selectAllLayers,
  searchLayers,
  showLayerProperties,
  getSelectedLayers: () => selectedLayers.value,
  getSelectedLayerProperties,
  getDrawnItems: () => drawnItems,
  isInitialized: () => isInitialized.value,
  // 历史记录方法
  undo: undoMapAction,
  redo: redoMapAction,
  canUndo: () => mapHistory.canUndo.value,
  canRedo: () => mapHistory.canRedo.value,
  saveMapState,
  // 新增方法
  jumpToCoordinate,
  startMeasureDistance,
  startMeasureArea,
  clearMeasure,
  getLayersList,
  getMap: () => map
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
  min-height: 400px;
}

@media (max-width: 768px) {
  #map-container {
    height: 400px;
  }
}

#map-container:fullscreen {
  border-radius: 0;
  border: none;
}

/* 自定义控件样式 */
:deep(.leaflet-control-coordinates) {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #ccc !important;
  font-family: 'Consolas', 'Monaco', monospace !important;
  font-size: 12px !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
}

:deep(.leaflet-draw-toolbar) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
}

:deep(.leaflet-draw-toolbar a) {
  transition: all 0.2s ease !important;
}

:deep(.leaflet-draw-toolbar a:hover) {
  transform: translateY(-1px) !important;
}

:deep(.leaflet-control-scale) {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 4px !important;
  padding: 2px 5px !important;
  font-size: 11px !important;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2) !important;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  #map-container {
    border-color: rgba(255, 255, 255, 0.2) !important;
  }

  :deep(.leaflet-control-coordinates) {
    background: rgba(30, 41, 59, 0.95) !important;
    color: #e0e6ed !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
}

/* 加载动画 */
@keyframes mapLoad {
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}

#map-container {
  animation: mapLoad 0.5s ease-out !important;
}
</style>
