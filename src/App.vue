<template>
  <div class="app-container">
    <!-- 头部 -->
    <div class="header">
      <h1>GeoJSON & WKT 转换工具</h1>
      <p>支持在线编辑、可视化绘制和格式转换</p>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 转换区域 -->
      <div class="converter-section">
        <div class="input-panel">
          <!-- GeoJSON 输入 -->
          <div class="input-card">
            <div class="card-header">
              <h3>📄 GeoJSON</h3>
              <div class="header-buttons">
                <el-button size="small" @click="loadSample('geojson')">加载示例</el-button>
                <el-button size="small" @click="formatJson">格式化</el-button>
                <el-button size="small" @click="clearInput('geojson')">清空</el-button>
              </div>
            </div>

            <el-input
              v-model="geojsonText"
              type="textarea"
              :rows="12"
              placeholder="请输入GeoJSON数据，或在地图上绘制图形"
              class="code-input"
            />

            <div v-if="geojsonError" class="error-tip">❌ {{ geojsonError }}</div>

            <div class="button-group">
              <div class="left-buttons">
                <el-button size="small" @click="undo('geojson')" :disabled="!canUndo('geojson')">
                  ↶ 撤销
                </el-button>
                <el-button size="small" @click="copyToClipboard(geojsonText)">📋 复制</el-button>
                <el-button size="small" @click="saveToFile(geojsonText, 'data.geojson')">
                  💾 保存
                </el-button>
                <el-upload
                  :show-file-list="false"
                  :before-upload="handleFileUpload"
                  accept=".geojson,.json"
                >
                  <el-button size="small">📁 导入</el-button>
                </el-upload>
              </div>
              <el-button
                type="primary"
                @click="drawOnMap(geojsonText, 'geojson')"
                :disabled="!geojsonText || !!geojsonError"
              >
                🗺️ 显示到地图
              </el-button>
            </div>
          </div>
        </div>

        <!-- 转换按钮 -->
        <div class="convert-buttons">
          <el-button
            type="primary"
            @click="convertGeoJsonToWkt"
            :disabled="!geojsonText || !!geojsonError"
            :loading="converting"
          >
            转为 WKT →
          </el-button>
          <el-button
            type="primary"
            @click="convertWktToGeoJson"
            :disabled="!wktText || !!wktError"
            :loading="converting"
          >
            ← 转为 GeoJSON
          </el-button>
          <el-divider />
          <el-button
            type="success"
            @click="validateGeometry"
            :disabled="!geojsonText || !!geojsonError"
          >
            🔍 验证几何
          </el-button>
          <el-button
            type="warning"
            @click="simplifyGeometry"
            :disabled="!geojsonText || !!geojsonError"
          >
            🔧 简化几何
          </el-button>
        </div>

        <div class="input-panel">
          <!-- WKT 输入 -->
          <div class="input-card">
            <div class="card-header">
              <h3>📐 WKT</h3>
              <div class="header-buttons">
                <el-button size="small" @click="loadSample('wkt')">加载示例</el-button>
                <el-button size="small" @click="formatWkt">格式化</el-button>
                <el-button size="small" @click="clearInput('wkt')">清空</el-button>
              </div>
            </div>

            <el-input
              v-model="wktText"
              type="textarea"
              :rows="12"
              placeholder="请输入WKT（Well-Known Text）格式数据"
              class="code-input"
            />

            <div v-if="wktError" class="error-tip">❌ {{ wktError }}</div>

            <div class="button-group">
              <div class="left-buttons">
                <el-button size="small" @click="undo('wkt')" :disabled="!canUndo('wkt')">
                  ↶ 撤销
                </el-button>
                <el-button size="small" @click="copyToClipboard(wktText)">📋 复制</el-button>
                <el-button size="small" @click="saveToFile(wktText, 'data.wkt')">
                  💾 保存
                </el-button>
                <el-upload
                  :show-file-list="false"
                  :before-upload="handleWktFileUpload"
                  accept=".wkt,.txt"
                >
                  <el-button size="small">📁 导入</el-button>
                </el-upload>
              </div>
              <el-button
                type="primary"
                @click="drawOnMap(wktText, 'wkt')"
                :disabled="!wktText || !!wktError"
              >
                🗺️显示到地图
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 地图区域 -->
      <div class="map-section">
        <div class="map-card">
          <div class="map-header">
            <h3>🗺️ 交互式地图</h3>
            <div class="map-controls">
              <el-radio-group v-model="currentMapStyle" @change="switchTileLayer" size="small">
                <el-radio-button value="osm">标准</el-radio-button>
                <el-radio-button value="light">简洁</el-radio-button>
                <el-radio-button value="dark">暗色</el-radio-button>
                <el-radio-button value="satellite">卫星</el-radio-button>
              </el-radio-group>
              <el-button size="small" @click="exportMap">📸 导出图片</el-button>
              <el-button size="small" @click="clearMap">清空地图</el-button>
            </div>
          </div>

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

          <div id="map-container" ref="mapContainer"></div>
        </div>
      </div>

      <!-- 数据统计面板 -->
      <div class="stats-section">
        <div class="stats-card">
          <h3>📊 数据统计</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ geometryStats.total }}</div>
              <div class="stat-label">图形总数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ geometryStats.points }}</div>
              <div class="stat-label">点</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ geometryStats.lines }}</div>
              <div class="stat-label">线</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ geometryStats.polygons }}</div>
              <div class="stat-label">面</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div v-show="contextMenuVisible" :style="contextMenuStyle" class="context-menu" @click.stop>
      <div class="context-menu-item" @click="copySelectedAsGeoJSON">📋 复制为 GeoJSON</div>
      <div class="context-menu-item" @click="copySelectedAsWKT">📐 复制为 WKT</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="getGeometryInfo">ℹ️ 几何信息</div>
      <div class="context-menu-item" @click="measureDistance">📏 测量距离</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="deleteSelected">🗑️ 删除选中</div>
      <div class="context-menu-item" @click="cropWithSelected">✂️ 用选中图形裁剪</div>
      <div class="context-menu-item" @click="unionSelected">🔗 合并选中图形</div>
      <div class="context-menu-item" @click="bufferSelected">📍 缓冲区分析</div>
      <div class="context-menu-item" @click="convexHull">🔺 凸包分析</div>
    </div>

    <!-- 几何信息对话框 -->
    <el-dialog v-model="geometryInfoVisible" title="几何信息" width="500px">
      <div class="geometry-info">
        <div v-if="selectedGeometryInfo">
          <h4>基本信息</h4>
          <p><strong>类型:</strong> {{ selectedGeometryInfo.type }}</p>
          <p><strong>坐标系:</strong> WGS84 (EPSG:4326)</p>
          <p v-if="selectedGeometryInfo.area">
            <strong>面积:</strong> {{ selectedGeometryInfo.area }}
          </p>
          <p v-if="selectedGeometryInfo.perimeter">
            <strong>周长:</strong> {{ selectedGeometryInfo.perimeter }}
          </p>
          <p v-if="selectedGeometryInfo.length">
            <strong>长度:</strong> {{ selectedGeometryInfo.length }}
          </p>
          <p v-if="selectedGeometryInfo.coordinates">
            <strong>坐标数量:</strong> {{ selectedGeometryInfo.coordinates }}
          </p>

          <h4>边界框</h4>
          <p><strong>西南角:</strong> {{ selectedGeometryInfo.bbox?.sw }}</p>
          <p><strong>东北角:</strong> {{ selectedGeometryInfo.bbox?.ne }}</p>

          <h4>中心点</h4>
          <p><strong>几何中心:</strong> {{ selectedGeometryInfo.centroid }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import wellknown from 'wellknown'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import * as turf from '@turf/turf'

// 响应式状态
const geojsonText = ref('')
const wktText = ref('')
const mapContainer = ref(null)
const converting = ref(false)
const geojsonError = ref('')
const wktError = ref('')
const geometryInfoVisible = ref(false)
const selectedGeometryInfo = ref(null)

let map = null
let tileLayers = {}
const currentMapStyle = ref('osm')
const geojsonHistory = ref([])
const wktHistory = ref([])
let isUndoing = false
let drawnItems = null

// 新增状态
const selectedLayers = ref(new Set())
const mousePosition = ref('鼠标位置: --')
const contextMenuVisible = ref(false)
const contextMenuStyle = ref({})

// 修复 Leaflet 图标路径问题
const fixLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// 计算属性
const canUndo = (type) => {
  return type === 'geojson' ? geojsonHistory.value.length > 0 : wktHistory.value.length > 0
}

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

  let totalAreaM2 = 0
  selectedLayers.value.forEach((layer) => {
    try {
      const geojson = layer.toGeoJSON()
      if (geojson.geometry.type.includes('Polygon')) {
        totalAreaM2 += turf.area(geojson)
      }
    } catch (e) {}
  })

  if (totalAreaM2 === 0) return null

  if (totalAreaM2 < 1000) {
    return `${totalAreaM2.toFixed(2)} m²`
  } else if (totalAreaM2 < 1000000) {
    return `${(totalAreaM2 / 1000).toFixed(2)} km²`
  } else {
    return `${(totalAreaM2 / 1000000).toFixed(2)} km²`
  }
})

const geometryStats = computed(() => {
  const stats = { total: 0, points: 0, lines: 0, polygons: 0 }

  if (drawnItems) {
    drawnItems.eachLayer((layer) => {
      stats.total++
      const geojson = layer.toGeoJSON()
      const type = geojson.geometry.type

      if (type === 'Point') stats.points++
      else if (type.includes('LineString')) stats.lines++
      else if (type.includes('Polygon')) stats.polygons++
    })
  }

  return stats
})

// 输入验证
const validateGeoJson = (text) => {
  if (!text.trim()) {
    geojsonError.value = ''
    return true
  }

  try {
    const data = JSON.parse(text)
    if (!data.type) {
      geojsonError.value = '缺少必需的 type 字段'
      return false
    }

    const validTypes = [
      'Point',
      'LineString',
      'Polygon',
      'MultiPoint',
      'MultiLineString',
      'MultiPolygon',
      'GeometryCollection',
      'Feature',
      'FeatureCollection',
    ]

    if (!validTypes.includes(data.type)) {
      geojsonError.value = `无效的几何类型: ${data.type}`
      return false
    }

    geojsonError.value = ''
    return true
  } catch (e) {
    geojsonError.value = `JSON 格式错误: ${e.message}`
    return false
  }
}

const validateWkt = (text) => {
  if (!text.trim()) {
    wktError.value = ''
    return true
  }

  try {
    const lines = text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('--'))
    for (const line of lines) {
      wellknown.parse(line.trim())
    }
    wktError.value = ''
    return true
  } catch (e) {
    wktError.value = `WKT 格式错误: ${e.message}`
    return false
  }
}

// 监听输入变化
watch(geojsonText, (newValue, oldValue) => {
  validateGeoJson(newValue)
  if (!isUndoing && oldValue !== undefined) {
    geojsonHistory.value.push(oldValue)
    if (geojsonHistory.value.length > 10) {
      geojsonHistory.value.shift()
    }
  }
})

watch(wktText, (newValue, oldValue) => {
  validateWkt(newValue)
  if (!isUndoing && oldValue !== undefined) {
    wktHistory.value.push(oldValue)
    if (wktHistory.value.length > 10) {
      wktHistory.value.shift()
    }
  }
})

// 地图初始化
onMounted(async () => {
  await nextTick()

  if (!mapContainer.value) return

  try {
    fixLeafletIcons()

    map = L.map(mapContainer.value, {
      center: [39.9, 116.4],
      zoom: 5,
      zoomControl: true,
    })

    tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }),
      light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
      }),
      satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
        },
      ),
    }

    tileLayers.osm.addTo(map)

    drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    // 绘制控件
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
      draw: {
        polygon: true,
        polyline: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: false,
      },
    })
    map.addControl(drawControl)

    // 绘制事件
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer
      drawnItems.addLayer(layer)
      setupLayerEvents(layer)
      updateGeoJsonFromMap()
      ElMessage.success('图形已添加')
    })

    map.on(L.Draw.Event.EDITED, () => {
      updateGeoJsonFromMap()
      ElMessage.success('图形已编辑')
    })

    map.on(L.Draw.Event.DELETED, () => {
      clearSelection()
      updateGeoJsonFromMap()
      ElMessage.success('图形已删除')
    })

    // 鼠标移动事件
    map.on('mousemove', (e) => {
      const lat = e.latlng.lat.toFixed(6)
      const lng = e.latlng.lng.toFixed(6)
      mousePosition.value = `鼠标位置: ${lng}, ${lat}`
    })

    // 点击空白区域取消选择
    map.on('click', () => {
      clearSelection()
      hideContextMenu()
    })

    // 全局点击隐藏右键菜单
    document.addEventListener('click', hideContextMenu)
  } catch (error) {
    console.error('地图初始化错误:', error)
    ElMessage.error('地图加载失败，请刷新页面重试')
  }
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})

// 设置图层事件
const setupLayerEvents = (layer) => {
  layer.on('click', (e) => {
    if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
      toggleLayerSelection(layer)
    } else {
      clearSelection()
      selectLayer(layer)
    }
    L.DomEvent.stopPropagation(e)
  })

  layer.on('contextmenu', (e) => {
    if (!selectedLayers.value.has(layer)) {
      clearSelection()
      selectLayer(layer)
    }
    showContextMenu(e.containerPoint)
    L.DomEvent.stopPropagation(e)
  })
}

// 图层选择管理
const selectLayer = (layer) => {
  selectedLayers.value.add(layer)
  highlightLayer(layer, true)
}

const deselectLayer = (layer) => {
  selectedLayers.value.delete(layer)
  highlightLayer(layer, false)
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
}

const highlightLayer = (layer, highlight) => {
  const style = highlight
    ? { color: '#ff7f00', weight: 3, fillOpacity: 0.3 }
    : { color: '#3388ff', weight: 2, fillOpacity: 0.2 }

  if (layer.setStyle) {
    layer.setStyle(style)
  }
}

// 计算面积
const calculateArea = (layer) => {
  try {
    const geojson = layer.toGeoJSON()
    const area = turf.area(geojson)

    if (area < 1000) {
      return `${area.toFixed(2)} m²`
    } else if (area < 1000000) {
      return `${(area / 1000).toFixed(2)} km²`
    } else {
      return `${(area / 1000000).toFixed(2)} km²`
    }
  } catch (e) {
    return null
  }
}

// 右键菜单
const showContextMenu = (point) => {
  contextMenuStyle.value = {
    position: 'fixed',
    left: point.x + 'px',
    top: point.y + 'px',
    zIndex: 10000,
  }
  contextMenuVisible.value = true
}

const hideContextMenu = () => {
  contextMenuVisible.value = false
}

// 右键菜单功能
const copySelectedAsGeoJSON = async () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图形')
    return
  }

  try {
    const features = Array.from(selectedLayers.value).map((layer) => layer.toGeoJSON())
    let result

    if (features.length === 1) {
      result = features[0]
    } else {
      result = {
        type: 'FeatureCollection',
        features: features,
      }
    }

    await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    ElMessage.success('GeoJSON已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败: ' + e.message)
  }

  hideContextMenu()
}

const copySelectedAsWKT = async () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图形')
    return
  }

  try {
    const wktArray = Array.from(selectedLayers.value).map((layer, index) => {
      const geojson = layer.toGeoJSON()
      const wkt = wellknown.stringify(geojson.geometry)
      return `-- 图形 ${index + 1}\n${wkt}`
    })

    const result = wktArray.join('\n\n')
    await navigator.clipboard.writeText(result)
    ElMessage.success('WKT已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败: ' + e.message)
  }

  hideContextMenu()
}

const getGeometryInfo = () => {
  if (selectedLayers.value.size !== 1) {
    ElMessage.warning('请选择一个图形查看信息')
    hideContextMenu()
    return
  }

  const layer = Array.from(selectedLayers.value)[0]
  const geojson = layer.toGeoJSON()

  try {
    const info = {
      type: geojson.geometry.type,
      coordinates: JSON.stringify(geojson.geometry.coordinates).split(',').length,
    }

    // 计算面积和周长
    if (geojson.geometry.type.includes('Polygon')) {
      info.area = calculateArea(layer)
      const perimeter = turf.length(turf.polygonToLine(geojson), { units: 'meters' })
      info.perimeter =
        perimeter < 1000 ? `${perimeter.toFixed(2)} m` : `${(perimeter / 1000).toFixed(2)} km`
    } else if (geojson.geometry.type.includes('LineString')) {
      const length = turf.length(geojson, { units: 'meters' })
      info.length = length < 1000 ? `${length.toFixed(2)} m` : `${(length / 1000).toFixed(2)} km`
    }

    // 边界框
    const bbox = turf.bbox(geojson)
    info.bbox = {
      sw: `${bbox[0].toFixed(6)}, ${bbox[1].toFixed(6)}`,
      ne: `${bbox[2].toFixed(6)}, ${bbox[3].toFixed(6)}`,
    }

    // 中心点
    const centroid = turf.centroid(geojson)
    info.centroid = `${centroid.geometry.coordinates[0].toFixed(6)}, ${centroid.geometry.coordinates[1].toFixed(6)}`

    selectedGeometryInfo.value = info
    geometryInfoVisible.value = true
  } catch (e) {
    ElMessage.error('获取几何信息失败: ' + e.message)
  }

  hideContextMenu()
}

const measureDistance = async () => {
  if (selectedLayers.value.size !== 2) {
    ElMessage.warning('请选择两个图形测量距离')
    hideContextMenu()
    return
  }

  try {
    const layers = Array.from(selectedLayers.value)
    const geojson1 = layers[0].toGeoJSON()
    const geojson2 = layers[1].toGeoJSON()

    const center1 = turf.centroid(geojson1)
    const center2 = turf.centroid(geojson2)

    const distance = turf.distance(center1, center2, { units: 'meters' })

    const distanceText =
      distance < 1000 ? `${distance.toFixed(2)} 米` : `${(distance / 1000).toFixed(2)} 公里`

    ElMessageBox.alert(`两个图形中心点之间的距离: ${distanceText}`, '距离测量结果')
  } catch (e) {
    ElMessage.error('距离测量失败: ' + e.message)
  }

  hideContextMenu()
}

const deleteSelected = () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图形')
    return
  }

  selectedLayers.value.forEach((layer) => {
    drawnItems.removeLayer(layer)
  })

  const count = selectedLayers.value.size
  selectedLayers.value.clear()
  updateGeoJsonFromMap()
  ElMessage.success(`已删除${count}个图形`)

  hideContextMenu()
}

const cropWithSelected = () => {
  if (selectedLayers.value.size !== 1) {
    ElMessage.warning('请选择一个图形作为裁剪边界')
    hideContextMenu()
    return
  }

  try {
    const clipper = Array.from(selectedLayers.value)[0].toGeoJSON()
    const otherLayers = []

    drawnItems.eachLayer((layer) => {
      if (!selectedLayers.value.has(layer)) {
        otherLayers.push(layer)
      }
    })

    if (otherLayers.length === 0) {
      ElMessage.warning('没有其他图形可裁剪')
      hideContextMenu()
      return
    }

    // 执行裁剪
    const clippedFeatures = []
    otherLayers.forEach((layer) => {
      try {
        const feature = layer.toGeoJSON()
        const clipped = turf.intersect(feature, clipper)
        if (clipped) {
          clippedFeatures.push(clipped)
        }
      } catch (e) {
        console.warn('裁剪图形失败:', e)
      }
    })

    // 清除原图形并添加裁剪结果
    otherLayers.forEach((layer) => drawnItems.removeLayer(layer))

    clippedFeatures.forEach((feature) => {
      const layer = L.geoJSON(feature)
      layer.eachLayer((l) => {
        drawnItems.addLayer(l)
        setupLayerEvents(l)
      })
    })

    clearSelection()
    updateGeoJsonFromMap()
    ElMessage.success(`裁剪完成，生成${clippedFeatures.length}个图形`)
  } catch (e) {
    ElMessage.error('裁剪失败: ' + e.message)
  }

  hideContextMenu()
}

const unionSelected = () => {
  if (selectedLayers.value.size < 2) {
    ElMessage.warning('请选择至少两个图形进行合并')
    hideContextMenu()
    return
  }

  try {
    const features = Array.from(selectedLayers.value).map((layer) => layer.toGeoJSON())
    let result = features[0]

    for (let i = 1; i < features.length; i++) {
      result = turf.union(result, features[i])
    }

    // 移除原图形
    selectedLayers.value.forEach((layer) => drawnItems.removeLayer(layer))

    // 添加合并结果
    const layer = L.geoJSON(result)
    layer.eachLayer((l) => {
      drawnItems.addLayer(l)
      setupLayerEvents(l)
    })

    clearSelection()
    updateGeoJsonFromMap()
    ElMessage.success('图形合并完成')
  } catch (e) {
    ElMessage.error('合并失败: ' + e.message)
  }

  hideContextMenu()
}

const bufferSelected = async () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图形')
    hideContextMenu()
    return
  }

  try {
    const { value: distance } = await ElMessageBox.prompt(
      '请输入缓冲区距离（单位：公里）',
      '缓冲区分析',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d+(\.\d+)?$/,
        inputErrorMessage: '请输入有效的数字',
      },
    )

    const bufferDistance = parseFloat(distance)
    const bufferedFeatures = []

    selectedLayers.value.forEach((layer) => {
      try {
        const feature = layer.toGeoJSON()
        const buffered = turf.buffer(feature, bufferDistance, { units: 'kilometers' })
        bufferedFeatures.push(buffered)
      } catch (e) {
        console.warn('缓冲区计算失败:', e)
      }
    })

    bufferedFeatures.forEach((feature) => {
      const layer = L.geoJSON(feature, {
        style: {
          color: '#00ff00',
          fillOpacity: 0.2,
        },
      })
      layer.eachLayer((l) => {
        drawnItems.addLayer(l)
        setupLayerEvents(l)
      })
    })

    updateGeoJsonFromMap()
    ElMessage.success(`生成${bufferedFeatures.length}个缓冲区`)
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('缓冲区分析失败: ' + e.message)
    }
  }

  hideContextMenu()
}

const convexHull = () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图形')
    hideContextMenu()
    return
  }

  try {
    const features = Array.from(selectedLayers.value).map((layer) => layer.toGeoJSON())
    const combined = turf.featureCollection(features)
    const hull = turf.convex(combined)

    if (hull) {
      const layer = L.geoJSON(hull, {
        style: {
          color: '#ff0000',
          fillOpacity: 0.2,
        },
      })
      layer.eachLayer((l) => {
        drawnItems.addLayer(l)
        setupLayerEvents(l)
      })

      updateGeoJsonFromMap()
      ElMessage.success('凸包分析完成')
    } else {
      ElMessage.warning('无法生成凸包')
    }
  } catch (e) {
    ElMessage.error('凸包分析失败: ' + e.message)
  }

  hideContextMenu()
}

// 从地图更新 GeoJSON
const updateGeoJsonFromMap = () => {
  const data = drawnItems.toGeoJSON()
  if (data.features.length === 0) {
    geojsonText.value = ''
    return
  }

  let result
  if (data.features.length === 1) {
    result = data.features[0]
  } else {
    result = data
  }

  geojsonText.value = JSON.stringify(result, null, 2)
}

// 在地图上绘制
const drawOnMap = (text, type) => {
  if (!text || !map) {
    ElMessage.warning('没有内容可以绘制或地图未准备好')
    return
  }

  let geojson
  try {
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

      if (lines.length === 1) {
        const geometry = wellknown.parse(lines[0].trim())
        geojson = {
          type: 'Feature',
          geometry: geometry,
          properties: {},
        }
      } else {
        const features = lines.map((line) => ({
          type: 'Feature',
          geometry: wellknown.parse(line.trim()),
          properties: {},
        }))
        geojson = {
          type: 'FeatureCollection',
          features: features,
        }
      }
    }

    drawnItems.clearLayers()
    clearSelection()

    const layer = L.geoJSON(geojson)
    layer.eachLayer((l) => {
      drawnItems.addLayer(l)
      setupLayerEvents(l)
    })

    if (drawnItems.getLayers().length > 0) {
      map.fitBounds(drawnItems.getBounds().pad(0.1))
    }

    ElMessage.success('已在地图上显示')
  } catch (e) {
    ElMessage.error('数据格式错误：' + e.message)
  }
}

// 转换功能
const convertGeoJsonToWkt = async () => {
  if (!geojsonText.value || geojsonError.value) {
    ElMessage.warning('请先输入有效的GeoJSON数据')
    return
  }

  converting.value = true
  try {
    const geojson = JSON.parse(geojsonText.value)
    let wktResult = ''

    if (geojson.type === 'FeatureCollection') {
      wktResult = geojson.features
        .map((feature, i) => `-- Feature ${i + 1}\n${wellknown.stringify(feature.geometry)}`)
        .join('\n\n')
    } else if (geojson.type === 'Feature') {
      wktResult = wellknown.stringify(geojson.geometry)
    } else {
      wktResult = wellknown.stringify(geojson)
    }

    wktText.value = wktResult
    ElMessage.success('转换成功！')
  } catch (e) {
    ElMessage.error('转换失败：' + e.message)
  } finally {
    converting.value = false
  }
}

const convertWktToGeoJson = async () => {
  if (!wktText.value || wktError.value) {
    ElMessage.warning('请先输入有效的WKT数据')
    return
  }

  converting.value = true
  try {
    const lines = wktText.value
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('--'))

    let result
    if (lines.length === 1) {
      const geometry = wellknown.parse(lines[0].trim())
      result = {
        type: 'Feature',
        geometry: geometry,
        properties: {},
      }
    } else {
      const features = lines.map((line) => ({
        type: 'Feature',
        geometry: wellknown.parse(line.trim()),
        properties: {},
      }))

      result = {
        type: 'FeatureCollection',
        features: features,
      }
    }

    geojsonText.value = JSON.stringify(result, null, 2)
    ElMessage.success('转换成功！')
  } catch (e) {
    ElMessage.error('转换失败：' + e.message)
  } finally {
    converting.value = false
  }
}

// 新增功能
const validateGeometry = () => {
  if (!geojsonText.value || geojsonError.value) {
    ElMessage.warning('请先输入有效的GeoJSON数据')
    return
  }

  try {
    const geojson = JSON.parse(geojsonText.value)
    let isValid = true
    let issues = []

    const validateFeature = (feature) => {
      try {
        // 使用 Turf.js 验证几何有效性
        if (feature.geometry.type === 'Polygon') {
          const kinks = turf.kinks(feature)
          if (kinks.features.length > 0) {
            issues.push('多边形存在自相交')
            isValid = false
          }
        }

        // 检查坐标范围
        const coords = JSON.stringify(feature.geometry.coordinates)
        const lngs = coords.match(/-?\d+\.?\d*/g)?.map(Number) || []

        if (lngs.some((lng) => Math.abs(lng) > 180)) {
          issues.push('经度超出有效范围(-180至180)')
          isValid = false
        }

        const lats = feature.geometry.coordinates.flat(3).filter((_, i) => i % 2 === 1)
        if (lats.some((lat) => Math.abs(lat) > 90)) {
          issues.push('纬度超出有效范围(-90至90)')
          isValid = false
        }
      } catch (e) {
        issues.push(`几何验证错误: ${e.message}`)
        isValid = false
      }
    }

    if (geojson.type === 'FeatureCollection') {
      geojson.features.forEach(validateFeature)
    } else if (geojson.type === 'Feature') {
      validateFeature(geojson)
    }

    if (isValid) {
      ElNotification.success({
        title: '几何验证',
        message: '几何数据有效！',
        duration: 3000,
      })
    } else {
      ElNotification.warning({
        title: '几何验证',
        message: `发现问题：\n${issues.join('\n')}`,
        duration: 5000,
      })
    }
  } catch (e) {
    ElMessage.error('验证失败：' + e.message)
  }
}

const simplifyGeometry = async () => {
  if (!geojsonText.value || geojsonError.value) {
    ElMessage.warning('请先输入有效的GeoJSON数据')
    return
  }

  try {
    const { value: tolerance } = await ElMessageBox.prompt(
      '请输入简化容差（0.001-0.1，值越小越精确）',
      '简化几何',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: '0.01',
        inputPattern: /^0\.\d+$/,
        inputErrorMessage: '请输入0到1之间的小数',
      },
    )

    const geojson = JSON.parse(geojsonText.value)
    let simplified

    if (geojson.type === 'FeatureCollection') {
      simplified = {
        ...geojson,
        features: geojson.features.map((feature) =>
          turf.simplify(feature, { tolerance: parseFloat(tolerance), highQuality: true }),
        ),
      }
    } else {
      simplified = turf.simplify(geojson, { tolerance: parseFloat(tolerance), highQuality: true })
    }

    geojsonText.value = JSON.stringify(simplified, null, 2)
    ElMessage.success('几何简化完成')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('简化失败：' + e.message)
    }
  }
}

const formatJson = () => {
  if (!geojsonText.value) {
    ElMessage.warning('没有内容可以格式化')
    return
  }

  try {
    const parsed = JSON.parse(geojsonText.value)
    geojsonText.value = JSON.stringify(parsed, null, 2)
    ElMessage.success('JSON格式化完成')
  } catch (e) {
    ElMessage.error('格式化失败：' + e.message)
  }
}

const formatWkt = () => {
  if (!wktText.value) {
    ElMessage.warning('没有内容可以格式化')
    return
  }

  try {
    const lines = wktText.value.split('\n')
    const formatted = lines
      .map((line) => {
        if (line.trim().startsWith('--') || !line.trim()) {
          return line
        }

        // 简单的WKT格式化：在主要关键字后换行
        return line.trim().replace(/,\s*/g, ', ').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')')
      })
      .join('\n')

    wktText.value = formatted
    ElMessage.success('WKT格式化完成')
  } catch (e) {
    ElMessage.error('格式化失败：' + e.message)
  }
}

const exportMap = () => {
  if (!map) return

  try {
    // 使用leaflet-image插件导出地图（需要额外引入）
    ElMessage.info('地图导出功能需要额外的插件支持')
  } catch (e) {
    ElMessage.error('导出失败：' + e.message)
  }
}

// 文件处理
const handleFileUpload = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      geojsonText.value = e.target.result
      ElMessage.success('文件导入成功')
    } catch (error) {
      ElMessage.error('文件读取失败：' + error.message)
    }
  }
  reader.readAsText(file)
  return false // 阻止自动上传
}

const handleWktFileUpload = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      wktText.value = e.target.result
      ElMessage.success('文件导入成功')
    } catch (error) {
      ElMessage.error('文件读取失败：' + error.message)
    }
  }
  reader.readAsText(file)
  return false
}

// 辅助功能
const switchTileLayer = (styleKey) => {
  if (!map) return
  Object.values(tileLayers).forEach((layer) => {
    if (map.hasLayer(layer)) map.removeLayer(layer)
  })
  if (tileLayers[styleKey]) {
    tileLayers[styleKey].addTo(map)
  }
}

const loadSample = (type) => {
  if (type === 'geojson') {
    const sampleGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: '北京市区',
            type: '行政区',
            population: 21540000,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [116.3, 39.9],
                [116.4, 39.9],
                [116.4, 40.0],
                [116.3, 40.0],
                [116.3, 39.9],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            name: '天安门广场',
            type: '地标',
            significance: '国家象征',
          },
          geometry: {
            type: 'Point',
            coordinates: [116.3912, 39.9042],
          },
        },
        {
          type: 'Feature',
          properties: {
            name: '长安街',
            type: '主干道',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [116.35, 39.91],
              [116.39, 39.91],
              [116.42, 39.91],
            ],
          },
        },
      ],
    }
    geojsonText.value = JSON.stringify(sampleGeoJSON, null, 2)
  } else {
    wktText.value = `-- 北京市区多边形
POLYGON((116.3 39.9, 116.4 39.9, 116.4 40.0, 116.3 40.0, 116.3 39.9))

-- 天安门广场点位
POINT(116.3912 39.9042)

-- 长安街线段
LINESTRING(116.35 39.91, 116.39 39.91, 116.42 39.91)`
  }
  ElMessage.success('标准示例已加载')
}

const clearInput = async (type) => {
  try {
    await ElMessageBox.confirm('确定要清空输入内容吗？', '确认', {
      type: 'warning',
    })

    if (type === 'geojson') {
      geojsonText.value = ''
    } else {
      wktText.value = ''
    }
    ElMessage.success('已清空')
  } catch {}
}

const clearMap = async () => {
  if (!drawnItems || drawnItems.getLayers().length === 0) {
    ElMessage.info('地图上没有图形')
    return
  }

  try {
    await ElMessageBox.confirm('确定要清空地图上的所有图形吗？', '确认', {
      type: 'warning',
    })

    drawnItems.clearLayers()
    clearSelection()
    geojsonText.value = ''
    ElMessage.success('地图已清空')
  } catch {}
}

const copyToClipboard = async (text) => {
  if (!text) {
    ElMessage.warning('没有内容可复制')
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const saveToFile = (text, filename) => {
  if (!text) {
    ElMessage.warning('没有内容可保存')
    return
  }

  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('文件已保存')
}

const undo = (type) => {
  isUndoing = true
  try {
    if (type === 'geojson' && geojsonHistory.value.length > 0) {
      geojsonText.value = geojsonHistory.value.pop()
      ElMessage.success('已撤销')
    } else if (type === 'wkt' && wktHistory.value.length > 0) {
      wktText.value = wktHistory.value.pop()
      ElMessage.success('已撤销')
    } else {
      ElMessage.info('没有可撤销的操作')
    }
  } finally {
    setTimeout(() => (isUndoing = false), 0)
  }
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
  overflow-x: hidden;
}

.header {
  background: white;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 2.2em;
  font-weight: 600;
}

.header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 1.1em;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.converter-section {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.input-panel {
  min-width: 0;
}

.input-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.header-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.code-input :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 8px;
  resize: vertical;
}

.error-tip {
  color: #f56c6c;
  font-size: 13px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;
}

.button-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  gap: 10px;
  flex-wrap: wrap;
}

.left-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.convert-buttons {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  align-items: center;
}

.convert-buttons .el-button {
  min-width: 150px;
  font-weight: 500;
}

.map-section {
  width: 100%;
  margin-bottom: 20px;
}

.map-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 15px;
}

.map-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.map-tip {
  background: #f0f9ff;
  color: #0369a1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 15px;
  border: 1px solid #e0f2fe;
}

.map-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #495057;
  flex-wrap: wrap;
  gap: 10px;
}

.draw-tools-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
}

.tool-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #856404;
}

.tool-icon {
  font-size: 16px;
}

.tool-list {
  color: #6c5700;
  font-weight: 500;
}

#map-container {
  width: 100%;
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.stats-section {
  width: 100%;
  margin-bottom: 20px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stats-card h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.stat-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
}

.stat-value {
  font-size: 2em;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

/* 右键菜单样式 */
.context-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 180px;
  font-size: 14px;
}

.context-menu-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu-item:hover {
  background: #f5f5f5;
}

.context-menu-divider {
  height: 1px;
  background: #eee;
  margin: 8px 0;
}

.geometry-info h4 {
  margin: 15px 0 10px 0;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.geometry-info h4:first-child {
  margin-top: 0;
}

.geometry-info p {
  margin: 8px 0;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .converter-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .convert-buttons {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 0 10px;
  }

  .header {
    padding: 20px 15px;
  }

  .header h1 {
    font-size: 1.6em;
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-buttons {
    justify-content: center;
  }

  .button-group {
    flex-direction: column;
    gap: 10px;
  }

  .left-buttons {
    width: 100%;
    justify-content: space-around;
  }

  .button-group > .el-button {
    width: 100%;
  }

  .map-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .map-controls {
    justify-content: center;
  }

  #map-container {
    height: 400px;
  }

  .convert-buttons .el-button {
    min-width: 120px;
  }

  .map-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tool-tip {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .left-buttons {
    flex-direction: column;
    width: 100%;
  }

  .left-buttons .el-button {
    width: 100%;
  }
}

/* Leaflet Draw 工具栏样式修复 */
:deep(.leaflet-draw-toolbar) {
  margin-left: 10px !important;
}

:deep(.leaflet-draw-toolbar a) {
  width: 30px !important;
  height: 30px !important;
  line-height: 30px !important;
  display: block !important;
  text-align: center !important;
  text-decoration: none !important;
}

/* 确保绘制工具图标正确显示 */
:deep(.leaflet-draw-draw-polygon a) {
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 4px !important;
}

:deep(.leaflet-draw-draw-polygon a::after) {
  content: '⬟' !important;
  font-size: 16px !important;
  color: #333 !important;
  line-height: 26px !important;
}

:deep(.leaflet-draw-draw-polyline a) {
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 4px !important;
}

:deep(.leaflet-draw-draw-polyline a::after) {
  content: '📏' !important;
  font-size: 14px !important;
  line-height: 26px !important;
}

:deep(.leaflet-draw-draw-rectangle a) {
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 4px !important;
}

:deep(.leaflet-draw-draw-rectangle a::after) {
  content: '▢' !important;
  font-size: 16px !important;
  color: #333 !important;
  line-height: 26px !important;
}

:deep(.leaflet-draw-draw-circle a) {
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 4px !important;
}

:deep(.leaflet-draw-draw-circle a::after) {
  content: '○' !important;
  font-size: 16px !important;
  color: #333 !important;
  line-height: 26px !important;
}

:deep(.leaflet-draw-draw-marker a) {
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 4px !important;
}

:deep(.leaflet-draw-draw-marker a::after) {
  content: '📍' !important;
  font-size: 14px !important;
  line-height: 26px !important;
}

:deep(.leaflet-draw-edit-edit a) {
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 4px !important;
}

:deep(.leaflet-draw-edit-edit a::after) {
  content: '✏️' !important;
  font-size: 14px !important;
  line-height: 26px !important;
}

:deep(.leaflet-draw-edit-remove a) {
  background: white !important;
  border: 2px solid #ccc !important;
  border-radius: 4px !important;
}

:deep(.leaflet-draw-edit-remove a::after) {
  content: '🗑️' !important;
  font-size: 12px !important;
  line-height: 26px !important;
}

/* 工具栏激活状态 */
:deep(.leaflet-draw-toolbar a:hover) {
  background-color: #f0f0f0 !important;
  border-color: #409eff !important;
}

:deep(.leaflet-draw-toolbar a.leaflet-draw-toolbar-button-enabled) {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: white !important;
}

/* 绘制提示框样式 */
:deep(.leaflet-draw-tooltip) {
  background: rgba(0, 0, 0, 0.8) !important;
  color: white !important;
  border-radius: 4px !important;
  padding: 6px 10px !important;
  font-size: 13px !important;
  border: none !important;
}

:deep(.leaflet-draw-tooltip::before) {
  border-top-color: rgba(0, 0, 0, 0.8) !important;
}

/* 操作按钮样式 */
:deep(.leaflet-draw-actions) {
  margin-top: 10px !important;
}

:deep(.leaflet-draw-actions a) {
  background: white !important;
  border: 1px solid #ccc !important;
  border-radius: 3px !important;
  padding: 4px 8px !important;
  margin: 0 2px !important;
  font-size: 12px !important;
  color: #333 !important;
  text-decoration: none !important;
}

:deep(.leaflet-draw-actions a:hover) {
  background: #f0f0f0 !important;
  border-color: #409eff !important;
}

/* Element Plus 组件样式调整 */
:deep(.el-button--small) {
  padding: 5px 12px;
  font-size: 12px;
}

:deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace !important;
}

:deep(.el-upload) {
  display: inline-block;
}

:deep(.el-radio-group) {
  display: inline-flex;
}

:deep(.el-divider--horizontal) {
  margin: 12px 0;
}

/* 滚动条样式 */
:deep(.el-textarea__inner)::-webkit-scrollbar {
  width: 6px;
}

:deep(.el-textarea__inner)::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

:deep(.el-textarea__inner)::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

:deep(.el-textarea__inner)::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 动画效果 */
.input-card,
.map-card,
.stats-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.input-card:hover,
.map-card:hover,
.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* 按钮动画 */
.el-button {
  transition: all 0.2s ease;
}

.el-button:hover {
  transform: translateY(-1px);
}

/* 错误提示动画 */
.error-tip {
  animation: slideInDown 0.3s ease;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 成功状态颜色 */
.success-border {
  border-color: #67c23a !important;
}

.error-border {
  border-color: #f56c6c !important;
}

/* 工具提示增强 */
.enhanced-tooltip {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
