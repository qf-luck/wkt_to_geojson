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

// Props
const props = defineProps({
  currentMapStyle: {
    type: String,
    default: 'osm'
  },
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
let drawControl = null
const selectedLayers = ref(new Set())
let isInitialized = ref(false)

// 中文化配置
const chineseStrings = {
  draw: {
    toolbar: {
      actions: {
        title: '取消绘制',
        text: '取消'
      },
      finish: {
        title: '完成绘制',
        text: '完成'
      },
      undo: {
        title: '撤销最后一个点',
        text: '撤销'
      },
      buttons: {
        polyline: '绘制线段',
        polygon: '绘制多边形',
        rectangle: '绘制矩形',
        circle: '绘制圆形',
        marker: '添加标记',
        circlemarker: '添加圆形标记'
      }
    },
    handlers: {
      circle: {
        tooltip: {
          start: '点击并拖拽绘制圆形'
        },
        radius: '半径'
      },
      circlemarker: {
        tooltip: {
          start: '点击地图放置圆形标记'
        }
      },
      marker: {
        tooltip: {
          start: '点击地图放置标记'
        }
      },
      polygon: {
        tooltip: {
          start: '点击开始绘制多边形',
          cont: '继续点击绘制多边形',
          end: '点击第一个点完成多边形'
        }
      },
      polyline: {
        error: '<strong>错误:</strong> 图形边缘不能相交!',
        tooltip: {
          start: '点击开始绘制线段',
          cont: '继续点击绘制线段',
          end: '点击最后一点完成线段'
        }
      },
      rectangle: {
        tooltip: {
          start: '点击并拖拽绘制矩形'
        }
      },
      simpleshape: {
        tooltip: {
          end: '释放鼠标完成绘制'
        }
      }
    }
  },
  edit: {
    toolbar: {
      actions: {
        save: {
          title: '保存更改',
          text: '保存'
        },
        cancel: {
          title: '取消编辑，放弃所有更改',
          text: '取消'
        },
        clearAll: {
          title: '清除所有图层',
          text: '全部清除'
        }
      },
      buttons: {
        edit: '编辑图层',
        editDisabled: '没有可编辑的图层',
        remove: '删除图层',
        removeDisabled: '没有可删除的图层'
      }
    },
    handlers: {
      edit: {
        tooltip: {
          text: '拖拽控制点或标记来编辑图形',
          subtext: '点击取消撤销更改'
        }
      },
      remove: {
        tooltip: {
          text: '点击图形删除'
        }
      }
    }
  }
}

// 修复 Leaflet 图标路径问题
const fixLeafletIcons = () => {
  try {
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
  } catch (error) {
    console.warn('修复Leaflet图标失败:', error)
  }
}

// 初始化瓦片图层
const initTileLayers = () => {
  tileLayers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 贡献者',
      maxZoom: 19,
      crossOrigin: true,
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
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
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.opentopomap.org/">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      maxZoom: 17,
      crossOrigin: true,
    }),
  }
}

// 应用中文化字符串
const applyChinese = () => {
  if (typeof L.drawLocal !== 'undefined') {
    // 深度合并中文字符串
    const mergeDeep = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {}
          }
          mergeDeep(target[key], source[key])
        } else {
          target[key] = source[key]
        }
      }
    }

    mergeDeep(L.drawLocal, chineseStrings)
  }
}

// 配置绘制控件 - 增强版
const setupDrawControls = () => {
  try {
    // 应用中文化
    applyChinese()

    // 移除旧的控件
    if (drawControl) {
      map.removeControl(drawControl)
    }

    drawControl = new L.Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawnItems,
        remove: true,
        edit: {
          selectedPathOptions: {
            maintainColor: true,
            opacity: 0.3,
            dashArray: '10, 10',
            weight: 3
          },
        },
      },
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e74c3c',
            timeout: 3000,
            message: '<strong>警告!</strong> 不能绘制自相交的多边形!'
          },
          shapeOptions: {
            color: '#3498db',
            weight: 3,
            fillOpacity: 0.2,
            fillColor: '#3498db'
          },
          showArea: true,
          metric: true,
          feet: false,
          nautic: false
        },
        polyline: {
          shapeOptions: {
            color: '#e74c3c',
            weight: 4,
            opacity: 0.8
          },
          showLength: true,
          metric: true,
          feet: false,
          nautic: false
        },
        rectangle: {
          shapeOptions: {
            color: '#f39c12',
            weight: 3,
            fillOpacity: 0.2,
            fillColor: '#f39c12'
          },
          showArea: true,
          metric: true
        },
        circle: {
          shapeOptions: {
            color: '#2ecc71',
            weight: 3,
            fillOpacity: 0.2,
            fillColor: '#2ecc71'
          },
          showRadius: true,
          metric: true,
          feet: false,
          nautic: false
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
          stroke: true,
          color: '#9b59b6',
          weight: 3,
          opacity: 0.8,
          fill: true,
          fillColor: '#9b59b6',
          fillOpacity: 0.6,
          radius: 8
        },
      },
    })

    map.addControl(drawControl)

    // 添加自定义控件样式
    setTimeout(() => {
      const toolbar = document.querySelector('.leaflet-draw-toolbar')
      if (toolbar) {
        toolbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
        toolbar.style.borderRadius = '8px'
        toolbar.style.overflow = 'hidden'
      }
    }, 100)

  } catch (error) {
    console.error('设置绘制控件失败:', error)
    ElMessage.error('绘制工具初始化失败')
  }
}

// 添加自定义控件
const addCustomControls = () => {
  // 添加坐标显示控件
  const CoordinateControl = L.Control.extend({
    onAdd: function(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-coordinates')
      container.style.background = 'rgba(255, 255, 255, 0.9)'
      container.style.padding = '5px 10px'
      container.style.fontSize = '12px'
      container.style.borderRadius = '4px'
      container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
      container.style.fontFamily = 'monospace'
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

  // 添加比例尺控件
  L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
  }).addTo(map)

  // 添加坐标控件
  new CoordinateControl({ position: 'bottomright' }).addTo(map)

  // 添加全屏控件 (如果需要的话)
  const FullscreenControl = L.Control.extend({
    onAdd: function(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-fullscreen')
      const button = L.DomUtil.create('a', 'leaflet-control-fullscreen-button', container)
      button.innerHTML = '⛶'
      button.title = '全屏显示'
      button.style.fontSize = '18px'
      button.style.lineHeight = '26px'
      button.style.textAlign = 'center'
      button.style.textDecoration = 'none'
      button.style.color = '#333'
      button.style.background = 'white'
      button.style.width = '26px'
      button.style.height = '26px'
      button.style.display = 'block'
      button.style.borderRadius = '4px'
      button.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)'

      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.stopPropagation(e)
        L.DomEvent.preventDefault(e)
        toggleFullscreen()
      })

      return container
    }
  })

  new FullscreenControl({ position: 'topleft' }).addTo(map)
}

// 全屏切换
const toggleFullscreen = () => {
  const mapElement = mapContainer.value
  if (!document.fullscreenElement) {
    mapElement.requestFullscreen().then(() => {
      setTimeout(() => map.invalidateSize(), 100)
      ElMessage.success('已进入全屏模式')
    }).catch(() => {
      ElMessage.error('全屏模式不支持')
    })
  } else {
    document.exitFullscreen().then(() => {
      setTimeout(() => map.invalidateSize(), 100)
      ElMessage.success('已退出全屏模式')
    })
  }
}

// 设置地图事件 - 增强版
const setupMapEvents = () => {
  try {
    // 绘制事件
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer
      const type = event.layerType

      // 为新创建的图层添加信息
      const feature = layer.toGeoJSON()
      const properties = {
        id: Date.now(),
        type: type,
        created: new Date().toISOString(),
        name: `${getGeometryTypeName(type)}_${Date.now()}`
      }

      // 如果有面积或长度，添加到属性中
      if (type === 'polygon' || type === 'rectangle' || type === 'circle') {
        try {
          const area = calculateLayerArea(layer)
          if (area) properties.area = area
        } catch (e) {
          console.warn('计算面积失败:', e)
        }
      }

      if (type === 'polyline') {
        try {
          const length = calculateLayerLength(layer)
          if (length) properties.length = length
        } catch (e) {
          console.warn('计算长度失败:', e)
        }
      }

      // 设置图层属性
      layer.feature = {
        type: 'Feature',
        properties: properties,
        geometry: feature.geometry
      }

      drawnItems.addLayer(layer)
      setupLayerEvents(layer)
      emit('geometry-updated')

      // 显示创建成功消息
      ElNotification({
        title: '图形创建成功',
        message: `${getGeometryTypeName(type)}已添加到地图`,
        type: 'success',
        duration: 2000
      })
    })

    map.on(L.Draw.Event.EDITED, (event) => {
      event.layers.eachLayer((layer) => {
        // 更新编辑时间
        if (layer.feature && layer.feature.properties) {
          layer.feature.properties.edited = new Date().toISOString()

          // 重新计算面积/长度
          const type = layer.feature.properties.type
          if (type === 'polygon' || type === 'rectangle' || type === 'circle') {
            try {
              const area = calculateLayerArea(layer)
              if (area) layer.feature.properties.area = area
            } catch (e) {
              console.warn('更新面积失败:', e)
            }
          }

          if (type === 'polyline') {
            try {
              const length = calculateLayerLength(layer)
              if (length) layer.feature.properties.length = length
            } catch (e) {
              console.warn('更新长度失败:', e)
            }
          }
        }

        setupLayerEvents(layer)
      })
      emit('geometry-updated')
      ElMessage.success('图形编辑完成')
    })

    map.on(L.Draw.Event.DELETED, (event) => {
      clearSelection()
      emit('geometry-updated')
      const count = Object.keys(event.layers._layers).length
      ElMessage.success(`已删除 ${count} 个图形`)
    })

    // 绘制开始和结束事件
    map.on(L.Draw.Event.DRAWSTART, (event) => {
      const type = event.layerType
      ElMessage.info(`开始绘制${getGeometryTypeName(type)}`)
    })

    map.on(L.Draw.Event.DRAWSTOP, () => {
      console.log('绘制结束')
    })

    // 编辑模式事件
    map.on(L.Draw.Event.EDITSTART, () => {
      ElMessage.info('进入编辑模式')
    })

    map.on(L.Draw.Event.EDITSTOP, () => {
      ElMessage.info('退出编辑模式')
    })

    // 地图交互事件
    map.on('mousemove', (e) => {
      const lat = e.latlng.lat.toFixed(6)
      const lng = e.latlng.lng.toFixed(6)
      emit('mouse-position-changed', `经度: ${lng}, 纬度: ${lat}`)
    })

    map.on('click', (e) => {
      // 如果没有点击到图层，清除选择
      if (!e.originalEvent.target.closest('.leaflet-interactive')) {
        clearSelection()
      }
    })

    map.on('contextmenu', (e) => {
      // 阻止默认右键菜单
      L.DomEvent.preventDefault(e)

      // 如果没有选中图层，不显示菜单
      if (selectedLayers.value.size === 0) {
        return
      }

      emit('show-context-menu', e.containerPoint)
    })

    // 缩放事件
    map.on('zoomend', () => {
      console.log(`当前缩放级别: ${map.getZoom()}`)
    })

    // 移动事件
    map.on('moveend', () => {
      const center = map.getCenter()
      console.log(`地图中心: ${center.lng.toFixed(4)}, ${center.lat.toFixed(4)}`)
    })

    // 错误处理
    map.on('tileerror', (e) => {
      console.warn('瓦片加载错误:', e)
    })

    // 全屏事件
    document.addEventListener('fullscreenchange', () => {
      setTimeout(() => {
        if (map) {
          map.invalidateSize()
        }
      }, 100)
    })

  } catch (error) {
    console.error('设置地图事件失败:', error)
  }
}

// 计算图层面积
const calculateLayerArea = (layer) => {
  try {
    if (layer.getRadius && typeof layer.getRadius === 'function') {
      // 圆形面积
      const radius = layer.getRadius()
      const area = Math.PI * radius * radius
      return formatArea(area)
    } else {
      const geojson = layer.toGeoJSON()
      const turf = window.turf
      if (turf && geojson.geometry.type.includes('Polygon')) {
        const area = turf.area(geojson)
        return formatArea(area)
      }
    }
  } catch (e) {
    console.warn('计算面积失败:', e)
  }
  return null
}

// 计算图层长度
const calculateLayerLength = (layer) => {
  try {
    const geojson = layer.toGeoJSON()
    const turf = window.turf
    if (turf && geojson.geometry.type.includes('LineString')) {
      const length = turf.length(geojson, { units: 'meters' })
      return formatLength(length)
    }
  } catch (e) {
    console.warn('计算长度失败:', e)
  }
  return null
}

// 格式化面积
const formatArea = (squareMeters) => {
  if (squareMeters < 10000) {
    return `${squareMeters.toFixed(2)} 平方米`
  } else if (squareMeters < 1000000) {
    return `${(squareMeters / 10000).toFixed(2)} 公顷`
  } else {
    return `${(squareMeters / 1000000).toFixed(2)} 平方公里`
  }
}

// 格式化长度
const formatLength = (meters) => {
  if (meters < 1000) {
    return `${meters.toFixed(2)} 米`
  } else {
    return `${(meters / 1000).toFixed(2)} 公里`
  }
}

// 设置图层事件 - 增强版
const setupLayerEvents = (layer) => {
  try {
    // 清除旧事件
    layer.off('click contextmenu mouseover mouseout dblclick')

    // 点击事件
    layer.on('click', (e) => {
      L.DomEvent.stopPropagation(e)

      if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
        // Ctrl/Cmd + 点击：多选
        toggleLayerSelection(layer)
      } else {
        // 普通点击：单选
        clearSelection()
        selectLayer(layer)
      }
    })

    // 双击事件
    layer.on('dblclick', (e) => {
      L.DomEvent.stopPropagation(e)
      showLayerInfo(layer)
    })

    // 右键菜单
    layer.on('contextmenu', (e) => {
      L.DomEvent.stopPropagation(e)

      if (!selectedLayers.value.has(layer)) {
        clearSelection()
        selectLayer(layer)
      }
      emit('show-context-menu', e.containerPoint)
    })

    // 鼠标悬停效果
    layer.on('mouseover', (e) => {
      if (!selectedLayers.value.has(layer)) {
        highlightLayer(layer, true, true)
      }

      // 显示工具提示
      const tooltip = getLayerTooltip(layer)
      if (tooltip && layer.bindTooltip) {
        layer.bindTooltip(tooltip, {
          permanent: false,
          direction: 'top',
          offset: [0, -10]
        }).openTooltip(e.latlng)
      }
    })

    layer.on('mouseout', () => {
      if (!selectedLayers.value.has(layer)) {
        highlightLayer(layer, false)
      }

      // 关闭工具提示
      if (layer.closeTooltip) {
        layer.closeTooltip()
      }
    })

  } catch (error) {
    console.warn('设置图层事件失败:', error)
  }
}

// 获取图层工具提示
const getLayerTooltip = (layer) => {
  try {
    const feature = layer.feature
    if (!feature || !feature.properties) {
      return null
    }

    const props = feature.properties
    let tooltip = `<strong>${props.name || '未命名图形'}</strong><br/>`
    tooltip += `类型: ${getGeometryTypeName(props.type)}<br/>`

    if (props.area) {
      tooltip += `面积: ${props.area}<br/>`
    }

    if (props.length) {
      tooltip += `长度: ${props.length}<br/>`
    }

    if (props.created) {
      const date = new Date(props.created).toLocaleString('zh-CN')
      tooltip += `创建时间: ${date}`
    }

    return tooltip
  } catch (e) {
    return null
  }
}

// 显示图层详细信息
const showLayerInfo = (layer) => {
  try {
    const feature = layer.feature
    if (!feature) {
      ElMessage.info('该图层没有详细信息')
      return
    }

    const props = feature.properties
    let message = `<div style="text-align: left;">
      <p><strong>图层信息</strong></p>
      <p>名称: ${props.name || '未命名'}</p>
      <p>类型: ${getGeometryTypeName(props.type)}</p>
      <p>ID: ${props.id}</p>`

    if (props.area) {
      message += `<p>面积: ${props.area}</p>`
    }

    if (props.length) {
      message += `<p>长度: ${props.length}</p>`
    }

    if (props.created) {
      const date = new Date(props.created).toLocaleString('zh-CN')
      message += `<p>创建时间: ${date}</p>`
    }

    if (props.edited) {
      const date = new Date(props.edited).toLocaleString('zh-CN')
      message += `<p>编辑时间: ${date}</p>`
    }

    message += `</div>`

    ElNotification({
      title: '图层详细信息',
      dangerouslyUseHTMLString: true,
      message: message,
      duration: 5000
    })
  } catch (e) {
    ElMessage.error('获取图层信息失败')
  }
}

// 图层选择管理 - 增强版
const selectLayer = (layer) => {
  selectedLayers.value.add(layer)
  highlightLayer(layer, true, false)
  emit('selection-changed', selectedLayers.value)

  // 播放选择音效（如果需要）
  console.log(`已选择图层: ${layer.feature?.properties?.name || '未命名'}`)
}

const deselectLayer = (layer) => {
  selectedLayers.value.delete(layer)
  highlightLayer(layer, false)
  emit('selection-changed', selectedLayers.value)
}

const toggleLayerSelection = (layer) => {
  if (selectedLayers.value.has(layer)) {
    deselectLayer(layer)
    ElMessage.info('取消选择图层')
  } else {
    selectLayer(layer)
    ElMessage.info('添加到选择')
  }
}

const clearSelection = () => {
  const count = selectedLayers.value.size
  selectedLayers.value.forEach((layer) => {
    highlightLayer(layer, false)
  })
  selectedLayers.value.clear()
  emit('selection-changed', selectedLayers.value)

  if (count > 0) {
    console.log(`已清除 ${count} 个图层的选择`)
  }
}

// 选择所有图层
const selectAllLayers = () => {
  clearSelection()
  drawnItems.eachLayer((layer) => {
    selectLayer(layer)
  })

  const count = selectedLayers.value.size
  if (count > 0) {
    ElMessage.success(`已选择所有 ${count} 个图层`)
  } else {
    ElMessage.info('没有可选择的图层')
  }
}

// 图层高亮 - 增强版
const highlightLayer = (layer, highlight, isHover = false) => {
  try {
    let style

    if (highlight) {
      if (isHover) {
        // 悬停样式
        style = {
          color: '#ff9500',
          weight: 4,
          fillOpacity: 0.4,
          dashArray: null
        }
      } else {
        // 选中样式
        style = {
          color: '#e74c3c',
          weight: 5,
          fillOpacity: 0.3,
          dashArray: '5, 5'
        }
      }
    } else {
      // 恢复默认样式
      if (layer instanceof L.Marker) {
        return
      } else if (layer instanceof L.Circle) {
        style = { color: '#2ecc71', weight: 3, fillOpacity: 0.2 }
      } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        style = { color: '#3498db', weight: 3, fillOpacity: 0.2 }
      } else {
        style = { color: '#e74c3c', weight: 4 }
      }
    }

    if (layer.setStyle) {
      layer.setStyle(style)
    }
  } catch (error) {
    console.warn('设置图层样式失败:', error)
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
    circlemarker: '圆形标记',
    point: '点',
    linestring: '线段',
    multipoint: '多点',
    multilinestring: '多线段',
    multipolygon: '多多边形'
  }
  return typeNames[type?.toLowerCase()] || '图形'
}

// 切换瓦片图层 - 增强版
const switchTileLayer = (styleKey) => {
  if (!map || !tileLayers[styleKey]) return

  try {
    // 移除当前图层
    Object.values(tileLayers).forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer)
    })

    // 添加新图层
    tileLayers[styleKey].addTo(map)

    const styleNames = {
      osm: '标准地图',
      light: '简洁地图',
      dark: '暗色地图',
      satellite: '卫星地图',
      terrain: '地形地图'
    }

    ElMessage.success(`已切换到${styleNames[styleKey] || styleKey}`)
  } catch (e) {
    console.error('切换地图失败:', e)
    ElMessage.error('切换地图失败：' + e.message)
  }
}

// 图层搜索和过滤
const searchLayers = (searchTerm) => {
  clearSelection()
  let foundCount = 0

  drawnItems.eachLayer((layer) => {
    const feature = layer.feature
    if (!feature || !feature.properties) return

    const props = feature.properties
    const searchable = [
      props.name,
      props.type,
      getGeometryTypeName(props.type)
    ].join(' ').toLowerCase()

    if (searchable.includes(searchTerm.toLowerCase())) {
      selectLayer(layer)
      foundCount++
    }
  })

  if (foundCount > 0) {
    ElMessage.success(`找到 ${foundCount} 个匹配的图层`)
  } else {
    ElMessage.info('未找到匹配的图层')
  }
}

// 初始化地图 - 增强版本
const initMap = async () => {
  // 防止重复初始化
  if (isInitialized.value) {
    console.warn('地图已经初始化，跳过重复初始化')
    return
  }

  try {
    await nextTick()

    if (!mapContainer.value) {
      throw new Error('地图容器未找到')
    }

    // 修复 Leaflet 图标问题
    fixLeafletIcons()

    // 清理可能存在的旧地图实例
    if (map) {
      map.off()
      map.remove()
      map = null
    }

    // 等待容器有正确的尺寸
    let retries = 0
    while ((mapContainer.value.offsetWidth === 0 || mapContainer.value.offsetHeight === 0) && retries < 20) {
      await new Promise(resolve => setTimeout(resolve, 50))
      retries++
    }

    if (mapContainer.value.offsetWidth === 0 || mapContainer.value.offsetHeight === 0) {
      console.warn('地图容器尺寸为0，强制设置最小尺寸')
      mapContainer.value.style.minHeight = '400px'
      mapContainer.value.style.width = '100%'
      await nextTick()
    }

    // 创建地图实例
    map = L.map(mapContainer.value, {
      center: [39.9042, 116.4074], // 北京天安门
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: false,
      maxZoom: 18,
      minZoom: 2,
      // 添加键盘导航支持
      keyboard: true,
      keyboardPanDelta: 80,
      // 添加缩放动画
      zoomAnimation: true,
      zoomAnimationThreshold: 4,
      // 添加平移动画
      fadeAnimation: true,
      markerZoomAnimation: true
    })

    // 初始化瓦片图层
    initTileLayers()

    // 添加默认图层
    const defaultLayer = tileLayers[props.currentMapStyle] || tileLayers.osm
    defaultLayer.addTo(map)

    // 创建绘图图层组
    drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    // 配置绘制控件
    setupDrawControls()

    // 添加自定义控件
    addCustomControls()

    // 设置地图事件
    setupMapEvents()

    // 标记为已初始化
    isInitialized.value = true

    // 地图准备就绪
    map.whenReady(() => {
      console.log('地图初始化完成')
      setTimeout(() => {
        if (map) {
          map.invalidateSize()
        }
      }, 100)

      ElNotification({
        title: '地图加载完成',
        message: '可以开始绘制和编辑地理图形',
        type: 'success',
        duration: 3000
      })
    })

  } catch (error) {
    console.error('地图初始化错误:', error)
    ElMessage.error(`地图加载失败: ${error.message}`)
    isInitialized.value = false
  }
}

// 在地图上绘制数据 - 增强错误处理
const drawOnMap = async (text, type) => {
  if (!text || !map || !isInitialized.value) {
    ElMessage.warning('地图未准备好或没有内容可以绘制')
    return Promise.reject(new Error('地图未准备好'))
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
          properties: {
            imported: true,
            importTime: new Date().toISOString()
          },
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
          properties: {
            imported: true,
            importTime: new Date().toISOString(),
            source: 'WKT'
          },
        }
      } else {
        const features = lines
          .map((line, index) => {
            try {
              return {
                type: 'Feature',
                geometry: wellknown.parse(line.trim()),
                properties: {
                  id: index + 1,
                  imported: true,
                  importTime: new Date().toISOString(),
                  source: 'WKT'
                },
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
        return L.marker(latlng, {
          icon: new L.Icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        })
      },
      style: (feature) => {
        const geometryType = feature.geometry.type
        if (geometryType.includes('Polygon')) {
          return { color: '#3498db', weight: 3, fillOpacity: 0.2 }
        } else if (geometryType.includes('LineString')) {
          return { color: '#e74c3c', weight: 4 }
        }
        return {}
      },
      onEachFeature: (feature, layer) => {
        // 为每个导入的图层设置 feature 属性
        layer.feature = feature

        // 如果没有名称，自动生成
        if (!feature.properties.name) {
          feature.properties.name = `导入_${getGeometryTypeName(feature.geometry.type)}_${Date.now()}`
        }
      }
    })

    let layerCount = 0
    layer.eachLayer((l) => {
      drawnItems.addLayer(l)
      setupLayerEvents(l)
      layerCount++
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

    ElNotification({
      title: '数据导入成功',
      message: `已在地图上显示 ${layerCount} 个图形`,
      type: 'success',
      duration: 3000
    })

    return Promise.resolve()
  } catch (e) {
    console.error('绘制到地图失败:', e)
    ElMessage.error('数据格式错误：' + e.message)
    return Promise.reject(e)
  }
}

// 导出地图功能
const exportMapAsImage = async () => {
  try {
    // 这里需要使用 html2canvas 或类似库
    ElMessage.info('导出功能需要安装 html2canvas 库才能使用')

    // 示例代码（需要安装 html2canvas）:
    const html2canvas = await import('html2canvas')
    const canvas = await html2canvas.default(mapContainer.value)
    const link = document.createElement('a')
    link.download = `map_${new Date().toISOString().slice(0,10)}.png`
    link.href = canvas.toDataURL()
    link.click()
  } catch (e) {
    ElMessage.error('导出失败: ' + e.message)
  }
}

// 清空所有图层
const clearAllLayers = () => {
  if (drawnItems) {
    const count = drawnItems.getLayers().length
    drawnItems.clearLayers()
    clearSelection()
    emit('geometry-updated')

    if (count > 0) {
      ElMessage.success(`已清空 ${count} 个图层`)
    }
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
    map.fitBounds(bounds.pad(0.1), {
      animate: true,
      duration: 1
    })
    ElMessage.success('已调整到最佳视图')
  } catch (e) {
    ElMessage.error('调整视图失败：' + e.message)
  }
}

// 缩放到选中图层
const zoomToSelected = () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图层')
    return
  }

  try {
    const group = new L.FeatureGroup(Array.from(selectedLayers.value))
    const bounds = group.getBounds()
    map.fitBounds(bounds.pad(0.2), {
      animate: true,
      duration: 1
    })
    ElMessage.success('已缩放到选中图层')
  } catch (e) {
    ElMessage.error('缩放失败：' + e.message)
  }
}

// 监听地图样式变化
watch(
  () => props.currentMapStyle,
  (newStyle) => {
    if (newStyle && isInitialized.value) {
      switchTileLayer(newStyle)
    }
  },
)

// 生命周期
onMounted(() => {
  // 延迟初始化，确保DOM完全渲染
  setTimeout(initMap, 100)
})

onUnmounted(() => {
  isInitialized.value = false
  if (map) {
    map.off()
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
  zoomToSelected,
  selectAllLayers,
  searchLayers,
  exportMapAsImage,
  getSelectedLayers: () => selectedLayers.value,
  getDrawnItems: () => drawnItems,
  isInitialized: () => isInitialized.value,
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

/* 响应式设计 */
@media (max-width: 768px) {
  #map-container {
    height: 400px;
  }
}

/* 全屏模式样式 */
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
  backdrop-filter: blur(5px) !important;
}

:deep(.leaflet-control-fullscreen) {
  background: white !important;
  border: 1px solid #ccc !important;
  border-radius: 4px !important;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4) !important;
}

:deep(.leaflet-control-fullscreen:hover) {
  background: #f0f0f0 !important;
}

/* 绘制工具栏样式优化 */
:deep(.leaflet-draw-toolbar) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  //border: 1px solid #ddd !important;
}

:deep(.leaflet-draw-toolbar a) {
  //background: white !important;
  //border-right: 1px solid #ddd !important;
  transition: all 0.2s ease !important;
}

:deep(.leaflet-draw-toolbar a:hover) {
  //background: #f0f9ff !important;
  transform: translateY(-1px) !important;
}

:deep(.leaflet-draw-toolbar a:last-child) {
  border-right: none !important;
}

/* 编辑工具栏样式 */
:deep(.leaflet-draw-edit-toolbar) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  //border: 1px solid #ddd !important;
}

/* 绘制提示样式 */
:deep(.leaflet-draw-tooltip) {
  //background: rgba(0, 0, 0, 0.8) !important;
  //color: white !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  font-size: 13px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(5px) !important;
}

/* 工具提示样式 */
:deep(.leaflet-tooltip) {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #ccc !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  font-size: 12px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: blur(5px) !important;
  max-width: 200px !important;
}

/* 比例尺样式 */
:deep(.leaflet-control-scale) {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 4px !important;
  padding: 2px 5px !important;
  font-size: 11px !important;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2) !important;
}

/* 选中状态的图层样式 */
:deep(.leaflet-interactive.selected) {
  filter: drop-shadow(0 0 10px #e74c3c) !important;
}

/* 悬停状态的图层样式 */
:deep(.leaflet-interactive:hover) {
  filter: drop-shadow(0 0 5px #ff9500) !important;
  cursor: pointer !important;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  #map-container {
    border-color: rgba(255, 255, 255, 0.2) !important;
  }

  :deep(.leaflet-control-coordinates) {
    background: rgba(30, 41, 59, 0.95) !important;
    color: #e0e6ed !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }

  :deep(.leaflet-draw-toolbar a) {
    background: rgba(30, 41, 59, 0.9) !important;
    //color: #e0e6ed !important;
    //border-color: rgba(255, 255, 255, 0.2) !important;
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
