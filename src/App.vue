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
                <el-button size="small" @click="formatJson" :disabled="!geojsonText"
                  >格式化
                </el-button>
                <el-button size="small" @click="clearInput('geojson')">清空</el-button>
              </div>
            </div>

            <el-input
              v-model="geojsonText"
              type="textarea"
              :rows="12"
              placeholder="请输入GeoJSON数据，或在地图上绘制图形"
              class="code-input"
              :class="{
                'success-border': geojsonText && !geojsonError,
                'error-border': geojsonError,
              }"
              @input="debounceValidateGeoJson"
            />

            <div v-if="geojsonError" class="error-tip">❌ {{ geojsonError }}</div>
            <div v-if="geojsonText && !geojsonError" class="success-tip">✅ GeoJSON格式正确</div>

            <div class="button-group">
              <div class="left-buttons">
                <el-button size="small" @click="undo('geojson')" :disabled="!canUndo('geojson')">
                  ↶ 撤销
                </el-button>
                <el-button
                  size="small"
                  @click="copyToClipboard(geojsonText)"
                  :disabled="!geojsonText"
                  >📋 复制
                </el-button>
                <el-button
                  size="small"
                  @click="saveToFile(geojsonText, 'data.geojson')"
                  :disabled="!geojsonText"
                >
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
                :loading="drawingOnMap"
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
            class="convert-btn"
          >
            <span>转为 WKT</span>
            <el-icon>
              <ArrowRight />
            </el-icon>
          </el-button>
          <el-button
            type="primary"
            @click="convertWktToGeoJson"
            :disabled="!wktText || !!wktError"
            :loading="converting"
            class="convert-btn"
          >
            <el-icon>
              <ArrowLeft />
            </el-icon>
            <span>转为 GeoJSON</span>
          </el-button>
          <el-divider />
          <div class="tool-buttons">
            <el-button
              type="success"
              @click="validateGeometry"
              :disabled="!geojsonText || !!geojsonError"
              size="small"
            >
              🔍 验证几何
            </el-button>
            <el-button
              type="warning"
              @click="simplifyGeometry"
              :disabled="!geojsonText || !!geojsonError"
              size="small"
            >
              🔧 简化几何
            </el-button>
          </div>
        </div>

        <div class="input-panel">
          <!-- WKT 输入 -->
          <div class="input-card">
            <div class="card-header">
              <h3>📐 WKT</h3>
              <div class="header-buttons">
                <el-button size="small" @click="loadSample('wkt')">加载示例</el-button>
                <el-button size="small" @click="formatWkt" :disabled="!wktText">格式化</el-button>
                <el-button size="small" @click="clearInput('wkt')">清空</el-button>
              </div>
            </div>

            <el-input
              v-model="wktText"
              type="textarea"
              :rows="12"
              placeholder="请输入WKT（Well-Known Text）格式数据"
              class="code-input"
              :class="{ 'success-border': wktText && !wktError, 'error-border': wktError }"
              @input="debounceValidateWkt"
            />

            <div v-if="wktError" class="error-tip">❌ {{ wktError }}</div>
            <div v-if="wktText && !wktError" class="success-tip">✅ WKT格式正确</div>

            <div class="button-group">
              <div class="left-buttons">
                <el-button size="small" @click="undo('wkt')" :disabled="!canUndo('wkt')">
                  ↶ 撤销
                </el-button>
                <el-button size="small" @click="copyToClipboard(wktText)" :disabled="!wktText"
                  >📋 复制
                </el-button>
                <el-button
                  size="small"
                  @click="saveToFile(wktText, 'data.wkt')"
                  :disabled="!wktText"
                >
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
                :loading="drawingOnMap"
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
              <el-button size="small" @click="zoomToFit" :disabled="!hasGeometry"
                >📍 适应范围
              </el-button>
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

          <div id="map-container" ref="mapContainer" v-loading="mapLoading"></div>
        </div>
      </div>

      <!-- 数据统计面板 -->
      <div class="stats-section">
        <div class="stats-card">
          <h3>📊 数据统计</h3>
          <div class="stats-grid">
            <div class="stat-item" @click="selectGeometryType('total')">
              <div class="stat-value">{{ geometryStats.total }}</div>
              <div class="stat-label">图形总数</div>
            </div>
            <div class="stat-item" @click="selectGeometryType('points')">
              <div class="stat-value">{{ geometryStats.points }}</div>
              <div class="stat-label">点</div>
            </div>
            <div class="stat-item" @click="selectGeometryType('lines')">
              <div class="stat-value">{{ geometryStats.lines }}</div>
              <div class="stat-label">线</div>
            </div>
            <div class="stat-item" @click="selectGeometryType('polygons')">
              <div class="stat-value">{{ geometryStats.polygons }}</div>
              <div class="stat-label">面</div>
            </div>
          </div>

          <!-- 详细统计信息 -->
          <div class="detailed-stats" v-if="geometryStats.total > 0">
            <el-divider content-position="left">详细信息</el-divider>
            <div class="stats-details">
              <p v-if="geometryStats.totalLength">
                <strong>总长度:</strong> {{ geometryStats.totalLength }}
              </p>
              <p v-if="geometryStats.totalArea">
                <strong>总面积:</strong> {{ geometryStats.totalArea }}
              </p>
              <p v-if="geometryStats.boundingBox">
                <strong>边界框:</strong> {{ geometryStats.boundingBox }}
              </p>
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
      <div class="context-menu-item" @click="measureDistance" v-if="selectedLayers.size >= 2">
        📏 测量距离
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="deleteSelected">🗑️ 删除选中</div>
      <div class="context-menu-item" @click="duplicateSelected">📋 复制图形</div>
      <div class="context-menu-divider" v-if="selectedLayers.size > 1"></div>
      <div class="context-menu-item" @click="cropWithSelected" v-if="selectedLayers.size === 1">
        ✂️ 用选中图形裁剪
      </div>
      <div class="context-menu-item" @click="unionSelected" v-if="selectedLayers.size > 1">
        🔗 合并选中图形
      </div>
      <div class="context-menu-item" @click="bufferSelected">📍 缓冲区分析</div>
      <div class="context-menu-item" @click="convexHull" v-if="selectedLayers.size > 2">
        🔺 凸包分析
      </div>
    </div>

    <!-- 几何信息对话框 -->
    <el-dialog
      v-model="geometryInfoVisible"
      title="几何信息"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="geometry-info">
        <div v-if="selectedGeometryInfo">
          <h4>基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="类型"
              >{{ selectedGeometryInfo.type }}
            </el-descriptions-item>
            <el-descriptions-item label="坐标系">WGS84 (EPSG:4326)</el-descriptions-item>
            <el-descriptions-item label="坐标数量" v-if="selectedGeometryInfo.coordinates">
              {{ selectedGeometryInfo.coordinates }}
            </el-descriptions-item>
            <el-descriptions-item label="面积" v-if="selectedGeometryInfo.area">
              {{ selectedGeometryInfo.area }}
            </el-descriptions-item>
            <el-descriptions-item label="周长" v-if="selectedGeometryInfo.perimeter">
              {{ selectedGeometryInfo.perimeter }}
            </el-descriptions-item>
            <el-descriptions-item label="长度" v-if="selectedGeometryInfo.length">
              {{ selectedGeometryInfo.length }}
            </el-descriptions-item>
          </el-descriptions>

          <h4 style="margin-top: 20px">边界框</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="西南角"
              >{{ selectedGeometryInfo.bbox?.sw }}
            </el-descriptions-item>
            <el-descriptions-item label="东北角"
              >{{ selectedGeometryInfo.bbox?.ne }}
            </el-descriptions-item>
          </el-descriptions>

          <h4 style="margin-top: 20px">中心点</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="几何中心"
              >{{ selectedGeometryInfo.centroid }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- 坐标详情 -->
          <div v-if="selectedGeometryInfo.coordinateDetails && showCoordinateDetails">
            <h4 style="margin-top: 20px">坐标详情</h4>
            <div class="coordinate-details">
              <pre>{{ selectedGeometryInfo.coordinateDetails }}</pre>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCoordinateDetails = !showCoordinateDetails" type="info">
            {{ showCoordinateDetails ? '隐藏' : '显示' }}坐标详情
          </el-button>
          <el-button @click="geometryInfoVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 加载指示器 -->
    <div v-if="globalLoading" class="global-loading">
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
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
const drawingOnMap = ref(false)
const mapLoading = ref(false)
const globalLoading = ref(false)
const loadingMessage = ref('')
const geojsonError = ref('')
const wktError = ref('')
const geometryInfoVisible = ref(false)
const selectedGeometryInfo = ref(null)
const showCoordinateDetails = ref(false)

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

// 防抖相关
let validateGeoJsonTimer = null
let validateWktTimer = null

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

const hasGeometry = computed(() => {
  return drawnItems && drawnItems.getLayers().length > 0
})

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
    } catch (e) {
      console.warn('计算面积失败:', e)
    }
  })

  if (totalAreaM2 === 0) return null
  return formatArea(totalAreaM2)
})

const geometryStats = computed(() => {
  const stats = {
    total: 0,
    points: 0,
    lines: 0,
    polygons: 0,
    totalLength: null,
    totalArea: null,
    boundingBox: null,
  }

  if (!drawnItems) return stats

  let totalLengthM = 0
  let totalAreaM2 = 0
  let allCoords = []

  drawnItems.eachLayer((layer) => {
    stats.total++
    try {
      const geojson = layer.toGeoJSON()
      const type = geojson.geometry.type

      // 统计类型
      if (type === 'Point') {
        stats.points++
        allCoords.push(geojson.geometry.coordinates)
      } else if (type.includes('LineString')) {
        stats.lines++
        const length = turf.length(geojson, { units: 'meters' })
        totalLengthM += length
        // 添加线的所有坐标点
        if (type === 'LineString') {
          allCoords.push(...geojson.geometry.coordinates)
        } else if (type === 'MultiLineString') {
          geojson.geometry.coordinates.forEach((coords) => allCoords.push(...coords))
        }
      } else if (type.includes('Polygon')) {
        stats.polygons++
        const area = turf.area(geojson)
        totalAreaM2 += area
        // 添加多边形的所有坐标点
        if (type === 'Polygon') {
          geojson.geometry.coordinates.forEach((ring) => allCoords.push(...ring))
        } else if (type === 'MultiPolygon') {
          geojson.geometry.coordinates.forEach((polygon) =>
            polygon.forEach((ring) => allCoords.push(...ring)),
          )
        }
      }
    } catch (e) {
      console.warn('统计几何信息失败:', e)
    }
  })

  // 格式化长度和面积
  if (totalLengthM > 0) {
    stats.totalLength = formatLength(totalLengthM)
  }
  if (totalAreaM2 > 0) {
    stats.totalArea = formatArea(totalAreaM2)
  }

  // 计算边界框
  if (allCoords.length > 0) {
    try {
      const feature = turf.multiPoint(allCoords)
      const bbox = turf.bbox(feature)
      stats.boundingBox = `${bbox[0].toFixed(6)}, ${bbox[1].toFixed(6)} ~ ${bbox[2].toFixed(6)}, ${bbox[3].toFixed(6)}`
    } catch (e) {
      console.warn('计算边界框失败:', e)
    }
  }

  return stats
})

// 格式化函数
const formatLength = (meters) => {
  if (meters < 1000) {
    return `${meters.toFixed(2)} m`
  } else {
    return `${(meters / 1000).toFixed(2)} km`
  }
}

const formatArea = (squareMeters) => {
  if (squareMeters < 10000) {
    return `${squareMeters.toFixed(2)} m²`
  } else if (squareMeters < 1000000) {
    return `${(squareMeters / 10000).toFixed(2)} 公顷`
  } else {
    return `${(squareMeters / 1000000).toFixed(2)} km²`
  }
}

// 防抖验证函数
const debounceValidateGeoJson = () => {
  clearTimeout(validateGeoJsonTimer)
  validateGeoJsonTimer = setTimeout(() => {
    validateGeoJson(geojsonText.value)
  }, 300)
}

const debounceValidateWkt = () => {
  clearTimeout(validateWktTimer)
  validateWktTimer = setTimeout(() => {
    validateWkt(wktText.value)
  }, 300)
}

// 输入验证 - 改进版本
const validateGeoJson = (text) => {
  if (!text.trim()) {
    geojsonError.value = ''
    return true
  }

  try {
    const data = JSON.parse(text)

    // 检查是否为空对象
    if (Object.keys(data).length === 0) {
      geojsonError.value = '不能为空对象'
      return false
    }

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

    // 验证几何结构
    if (data.type === 'FeatureCollection') {
      if (!Array.isArray(data.features)) {
        geojsonError.value = 'FeatureCollection 必须包含 features 数组'
        return false
      }

      for (let i = 0; i < data.features.length; i++) {
        const feature = data.features[i]
        if (!feature.geometry || !feature.geometry.type) {
          geojsonError.value = `Feature ${i + 1} 缺少有效的 geometry`
          return false
        }
      }
    } else if (data.type === 'Feature') {
      if (!data.geometry || !data.geometry.type) {
        geojsonError.value = 'Feature 必须包含有效的 geometry'
        return false
      }
    }

    // 验证坐标范围
    const validateCoordinates = (coords, depth = 0) => {
      if (depth > 10) return true // 防止无限递归

      if (Array.isArray(coords)) {
        if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          // 这是一个坐标点
          const [lng, lat] = coords
          if (lng < -180 || lng > 180) {
            throw new Error(`经度超出范围: ${lng}`)
          }
          if (lat < -90 || lat > 90) {
            throw new Error(`纬度超出范围: ${lat}`)
          }
        } else {
          // 递归验证数组中的每个元素
          for (const item of coords) {
            validateCoordinates(item, depth + 1)
          }
        }
      }
    }

    // 获取并验证坐标
    const getCoordinates = (obj) => {
      if (obj.type === 'FeatureCollection') {
        obj.features.forEach((feature) => getCoordinates(feature.geometry))
      } else if (obj.type === 'Feature') {
        getCoordinates(obj.geometry)
      } else if (obj.coordinates) {
        validateCoordinates(obj.coordinates)
      } else if (obj.geometries) {
        obj.geometries.forEach((geom) => getCoordinates(geom))
      }
    }

    getCoordinates(data)
    geojsonError.value = ''
    return true
  } catch (e) {
    if (e.message.includes('经度') || e.message.includes('纬度')) {
      geojsonError.value = e.message
    } else {
      geojsonError.value = `JSON 格式错误: ${e.message}`
    }
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

    if (lines.length === 0) {
      wktError.value = '没有有效的WKT内容'
      return false
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      try {
        const parsed = wellknown.parse(line)
        if (!parsed || !parsed.type) {
          throw new Error('解析结果无效')
        }
      } catch (e) {
        wktError.value = `第${i + 1}行WKT格式错误: ${e.message}`
        return false
      }
    }

    wktError.value = ''
    return true
  } catch (e) {
    wktError.value = `WKT 格式错误: ${e.message}`
    return false
  }
}

// 监听输入变化 - 改进历史记录管理
watch(geojsonText, (newValue, oldValue) => {
  if (!isUndoing && oldValue !== undefined && oldValue !== newValue) {
    // 只有当内容真正变化时才记录历史
    if (
      oldValue.trim() !== '' &&
      geojsonHistory.value[geojsonHistory.value.length - 1] !== oldValue
    ) {
      geojsonHistory.value.push(oldValue)
      if (geojsonHistory.value.length > 20) {
        // 增加历史记录数量
        geojsonHistory.value.shift()
      }
    }
  }
})

watch(wktText, (newValue, oldValue) => {
  if (!isUndoing && oldValue !== undefined && oldValue !== newValue) {
    if (oldValue.trim() !== '' && wktHistory.value[wktHistory.value.length - 1] !== oldValue) {
      wktHistory.value.push(oldValue)
      if (wktHistory.value.length > 20) {
        wktHistory.value.shift()
      }
    }
  }
})

// 地图初始化 - 改进错误处理
onMounted(async () => {
  await nextTick()

  if (!mapContainer.value) {
    ElMessage.error('地图容器未找到')
    return
  }

  mapLoading.value = true

  try {
    fixLeafletIcons()

    // 创建地图实例
    map = L.map(mapContainer.value, {
      center: [39.9, 116.4],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    })

    // 初始化瓦片图层
    tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }),
      light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        maxZoom: 19,
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        maxZoom: 19,
      }),
      satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
          maxZoom: 19,
        },
      ),
    }

    // 添加默认图层
    tileLayers.osm.addTo(map)

    // 创建绘图图层组
    drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    // 配置绘制控件
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

    // 绘制事件处理
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer
      drawnItems.addLayer(layer)
      setupLayerEvents(layer)
      updateGeoJsonFromMap()
      ElMessage.success(`${getGeometryTypeName(event.layerType)}已添加`)
    })

    map.on(L.Draw.Event.EDITED, (event) => {
      // 重新设置编辑后的图层事件
      event.layers.eachLayer((layer) => {
        setupLayerEvents(layer)
      })
      updateGeoJsonFromMap()
      ElMessage.success('图形已编辑')
    })

    map.on(L.Draw.Event.DELETED, (event) => {
      clearSelection()
      updateGeoJsonFromMap()
      const count = Object.keys(event.layers._layers).length
      ElMessage.success(`已删除${count}个图形`)
    })

    // 地图事件
    map.on('mousemove', (e) => {
      const lat = e.latlng.lat.toFixed(6)
      const lng = e.latlng.lng.toFixed(6)
      mousePosition.value = `鼠标位置: ${lng}, ${lat}`
    })

    map.on('click', (e) => {
      clearSelection()
      hideContextMenu()
    })

    // 地图加载完成
    map.whenReady(() => {
      mapLoading.value = false
      ElMessage.success('地图加载完成')
    })
  } catch (error) {
    console.error('地图初始化错误:', error)
    mapLoading.value = false
    ElMessage.error(`地图加载失败: ${error.message}`)
  }

  // 全局点击隐藏右键菜单
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
  clearTimeout(validateGeoJsonTimer)
  clearTimeout(validateWktTimer)

  // 清理地图资源
  if (map) {
    map.remove()
    map = null
  }
})

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

// 设置图层事件 - 改进版本
const setupLayerEvents = (layer) => {
  // 移除旧的事件监听器
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
    showContextMenu(e.containerPoint)
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

// 图层高亮 - 改进版本
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
      return // 标记点不需要样式设置
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

// 按类型选择几何图形
const selectGeometryType = (type) => {
  if (!drawnItems) return

  clearSelection()

  drawnItems.eachLayer((layer) => {
    const geojson = layer.toGeoJSON()
    const geometryType = geojson.geometry.type

    let shouldSelect = false
    switch (type) {
      case 'points':
        shouldSelect = geometryType === 'Point'
        break
      case 'lines':
        shouldSelect = geometryType.includes('LineString')
        break
      case 'polygons':
        shouldSelect = geometryType.includes('Polygon')
        break
      case 'total':
        shouldSelect = true
        break
    }

    if (shouldSelect) {
      selectLayer(layer)
    }
  })

  if (selectedLayers.value.size > 0) {
    ElMessage.success(`已选中${selectedLayers.value.size}个${type === 'total' ? '图形' : type}`)
  }
}

// 计算面积 - 改进版本
const calculateArea = (layer) => {
  try {
    const geojson = layer.toGeoJSON()
    if (!geojson.geometry.type.includes('Polygon') && !geojson.geometry.type.includes('Circle')) {
      return null
    }

    let area
    if (layer instanceof L.Circle) {
      // 圆形面积计算
      const radius = layer.getRadius()
      area = Math.PI * radius * radius
    } else {
      area = turf.area(geojson)
    }

    return formatArea(area)
  } catch (e) {
    console.warn('计算面积失败:', e)
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

// 右键菜单功能 - 改进版本
const copySelectedAsGeoJSON = async () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图形')
    return
  }

  try {
    const features = Array.from(selectedLayers.value).map((layer, index) => {
      const geojson = layer.toGeoJSON()
      return {
        ...geojson,
        properties: {
          ...geojson.properties,
          id: index + 1,
          created: new Date().toISOString(),
        },
      }
    })

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
      return `-- 图形 ${index + 1} (${geojson.geometry.type})\n${wkt}`
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
      coordinateDetails: JSON.stringify(geojson.geometry.coordinates, null, 2),
    }

    // 计算面积和周长
    if (geojson.geometry.type.includes('Polygon') || layer instanceof L.Circle) {
      info.area = calculateArea(layer)

      if (layer instanceof L.Circle) {
        const circumference = 2 * Math.PI * layer.getRadius()
        info.perimeter = formatLength(circumference)
      } else {
        try {
          const perimeter = turf.length(turf.polygonToLine(geojson), { units: 'meters' })
          info.perimeter = formatLength(perimeter)
        } catch (e) {
          console.warn('计算周长失败:', e)
        }
      }
    } else if (geojson.geometry.type.includes('LineString')) {
      const length = turf.length(geojson, { units: 'meters' })
      info.length = formatLength(length)
    }

    // 边界框
    try {
      const bbox = turf.bbox(geojson)
      info.bbox = {
        sw: `${bbox[0].toFixed(6)}, ${bbox[1].toFixed(6)}`,
        ne: `${bbox[2].toFixed(6)}, ${bbox[3].toFixed(6)}`,
      }
    } catch (e) {
      console.warn('计算边界框失败:', e)
    }

    // 中心点
    try {
      const centroid = turf.centroid(geojson)
      info.centroid = `${centroid.geometry.coordinates[0].toFixed(6)}, ${centroid.geometry.coordinates[1].toFixed(6)}`
    } catch (e) {
      console.warn('计算中心点失败:', e)
    }

    selectedGeometryInfo.value = info
    geometryInfoVisible.value = true
  } catch (e) {
    ElMessage.error('获取几何信息失败: ' + e.message)
  }

  hideContextMenu()
}

const measureDistance = async () => {
  if (selectedLayers.value.size < 2) {
    ElMessage.warning('请选择至少两个图形测量距离')
    hideContextMenu()
    return
  }

  try {
    const layers = Array.from(selectedLayers.value)
    const distances = []

    for (let i = 0; i < layers.length - 1; i++) {
      for (let j = i + 1; j < layers.length; j++) {
        const geojson1 = layers[i].toGeoJSON()
        const geojson2 = layers[j].toGeoJSON()

        const center1 = turf.centroid(geojson1)
        const center2 = turf.centroid(geojson2)

        const distance = turf.distance(center1, center2, { units: 'meters' })
        distances.push({
          from: i + 1,
          to: j + 1,
          distance: formatLength(distance),
        })
      }
    }

    const distanceText = distances
      .map((d) => `图形${d.from}到图形${d.to}: ${d.distance}`)
      .join('\n')

    ElMessageBox.alert(distanceText, '距离测量结果', {
      confirmButtonText: '确定',
    })
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

  const count = selectedLayers.value.size
  selectedLayers.value.forEach((layer) => {
    drawnItems.removeLayer(layer)
  })

  selectedLayers.value.clear()
  updateGeoJsonFromMap()
  ElMessage.success(`已删除${count}个图形`)

  hideContextMenu()
}

// 新增：复制图形功能
const duplicateSelected = () => {
  if (selectedLayers.value.size === 0) {
    ElMessage.warning('请先选择图形')
    return
  }

  try {
    const newLayers = []
    selectedLayers.value.forEach((layer) => {
      const geojson = layer.toGeoJSON()

      // 偏移坐标避免重叠
      const offsetGeojson = offsetGeometry(geojson, 0.001)

      const newLayer = L.geoJSON(offsetGeojson)
      newLayer.eachLayer((l) => {
        drawnItems.addLayer(l)
        setupLayerEvents(l)
        newLayers.push(l)
      })
    })

    clearSelection()
    newLayers.forEach((layer) => selectLayer(layer))

    updateGeoJsonFromMap()
    ElMessage.success(`已复制${newLayers.length}个图形`)
  } catch (e) {
    ElMessage.error('复制图形失败: ' + e.message)
  }

  hideContextMenu()
}

// 几何偏移函数
const offsetGeometry = (geojson, offset) => {
  try {
    switch (geojson.geometry.type) {
      case 'Point':
        return {
          ...geojson,
          geometry: {
            ...geojson.geometry,
            coordinates: [
              geojson.geometry.coordinates[0] + offset,
              geojson.geometry.coordinates[1] + offset,
            ],
          },
        }
      case 'LineString':
        return {
          ...geojson,
          geometry: {
            ...geojson.geometry,
            coordinates: geojson.geometry.coordinates.map((coord) => [
              coord[0] + offset,
              coord[1] + offset,
            ]),
          },
        }
      case 'Polygon':
        return {
          ...geojson,
          geometry: {
            ...geojson.geometry,
            coordinates: geojson.geometry.coordinates.map((ring) =>
              ring.map((coord) => [coord[0] + offset, coord[1] + offset]),
            ),
          },
        }
      default:
        return geojson
    }
  } catch (e) {
    return geojson
  }
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
    let successCount = 0

    otherLayers.forEach((layer) => {
      try {
        const feature = layer.toGeoJSON()
        const clipped = turf.intersect(
          turf.feature(feature.geometry),
          turf.feature(clipper.geometry),
        )
        if (clipped && clipped.geometry) {
          clippedFeatures.push(clipped)
          successCount++
        }
      } catch (e) {
        console.warn('裁剪图形失败:', e)
      }
    })

    if (successCount === 0) {
      ElMessage.warning('裁剪操作未产生结果，请检查图形是否相交')
      hideContextMenu()
      return
    }

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
    ElMessage.success(`裁剪完成，生成${successCount}个图形`)
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
    let result = turf.feature(features[0].geometry)

    for (let i = 1; i < features.length; i++) {
      const nextFeature = turf.feature(features[i].geometry)
      try {
        const unionResult = turf.union(result, nextFeature)
        if (unionResult) {
          result = unionResult
        } else {
          console.warn(`合并第${i + 1}个图形时失败`)
        }
      } catch (e) {
        console.warn(`合并第${i + 1}个图形时出错:`, e)
      }
    }

    if (result && result.geometry) {
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
    } else {
      ElMessage.error('合并失败：无法生成有效的合并结果')
    }
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
      '请输入缓冲区距离（单位：米）',
      '缓冲区分析',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: '1000',
        inputPattern: /^\d+(\.\d+)?$/,
        inputErrorMessage: '请输入有效的数字',
      },
    )

    const bufferDistance = parseFloat(distance) / 1000 // 转换为公里
    const bufferedFeatures = []

    selectedLayers.value.forEach((layer) => {
      try {
        const feature = layer.toGeoJSON()
        const buffered = turf.buffer(turf.feature(feature.geometry), bufferDistance, {
          units: 'kilometers',
        })
        if (buffered) {
          bufferedFeatures.push(buffered)
        }
      } catch (e) {
        console.warn('缓冲区计算失败:', e)
      }
    })

    bufferedFeatures.forEach((feature) => {
      const layer = L.geoJSON(feature, {
        style: {
          color: '#00ff00',
          fillOpacity: 0.2,
          weight: 2,
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
  if (selectedLayers.value.size < 3) {
    ElMessage.warning('请选择至少三个图形进行凸包分析')
    hideContextMenu()
    return
  }

  try {
    const features = Array.from(selectedLayers.value).map((layer) => layer.toGeoJSON())
    const combined = turf.featureCollection(features.map((f) => turf.feature(f.geometry)))
    const hull = turf.convex(combined)

    if (hull && hull.geometry) {
      const layer = L.geoJSON(hull, {
        style: {
          color: '#ff0000',
          fillOpacity: 0.2,
          weight: 3,
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

// 从地图更新 GeoJSON - 改进版本
const updateGeoJsonFromMap = () => {
  try {
    const data = drawnItems.toGeoJSON()

    if (data.features.length === 0) {
      geojsonText.value = ''
      return
    }

    // 为每个feature添加额外属性
    data.features.forEach((feature, index) => {
      feature.properties = {
        ...feature.properties,
        id: index + 1,
        type: feature.geometry.type,
        created: feature.properties.created || new Date().toISOString(),
      }
    })

    let result
    if (data.features.length === 1) {
      result = data.features[0]
    } else {
      result = data
    }

    // 避免触发历史记录
    isUndoing = true
    geojsonText.value = JSON.stringify(result, null, 2)
    setTimeout(() => (isUndoing = false), 100)
  } catch (e) {
    console.error('更新GeoJSON失败:', e)
    ElMessage.error('更新GeoJSON失败: ' + e.message)
  }
}

// 在地图上绘制 - 改进版本
const drawOnMap = async (text, type) => {
  if (!text || !map) {
    ElMessage.warning('没有内容可以绘制或地图未准备好')
    return
  }

  drawingOnMap.value = true

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
  } finally {
    drawingOnMap.value = false
  }
}

// 转换功能 - 改进版本
const convertGeoJsonToWkt = async () => {
  if (!geojsonText.value || geojsonError.value) {
    ElMessage.warning('请先输入有效的GeoJSON数据')
    return
  }

  converting.value = true
  globalLoading.value = true
  loadingMessage.value = '正在转换为WKT格式...'

  try {
    const geojson = JSON.parse(geojsonText.value)
    let wktResult = ''

    if (geojson.type === 'FeatureCollection') {
      const wktArray = geojson.features.map((feature, i) => {
        const wkt = wellknown.stringify(feature.geometry)
        const properties = feature.properties || {}
        const propStr =
          Object.keys(properties).length > 0 ? ` -- Properties: ${JSON.stringify(properties)}` : ''
        return `-- Feature ${i + 1} (${feature.geometry.type})${propStr}\n${wkt}`
      })
      wktResult = wktArray.join('\n\n')
    } else if (geojson.type === 'Feature') {
      const wkt = wellknown.stringify(geojson.geometry)
      const properties = geojson.properties || {}
      const propStr =
        Object.keys(properties).length > 0 ? ` -- Properties: ${JSON.stringify(properties)}` : ''
      wktResult = `-- ${geojson.geometry.type}${propStr}\n${wkt}`
    } else {
      wktResult = `-- ${geojson.type}\n${wellknown.stringify(geojson)}`
    }

    // 模拟转换过程
    await new Promise((resolve) => setTimeout(resolve, 500))

    wktText.value = wktResult
    ElMessage.success('转换成功！')
  } catch (e) {
    console.error('GeoJSON转WKT失败:', e)
    ElMessage.error('转换失败：' + e.message)
  } finally {
    converting.value = false
    globalLoading.value = false
  }
}

const convertWktToGeoJson = async () => {
  if (!wktText.value || wktError.value) {
    ElMessage.warning('请先输入有效的WKT数据')
    return
  }

  converting.value = true
  globalLoading.value = true
  loadingMessage.value = '正在转换为GeoJSON格式...'

  try {
    const lines = wktText.value
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('--'))

    if (lines.length === 0) {
      throw new Error('没有有效的WKT内容')
    }

    let result
    if (lines.length === 1) {
      const geometry = wellknown.parse(lines[0].trim())
      result = {
        type: 'Feature',
        geometry: geometry,
        properties: {
          created: new Date().toISOString(),
          source: 'WKT_conversion',
        },
      }
    } else {
      const features = lines
        .map((line, index) => {
          try {
            const geometry = wellknown.parse(line.trim())
            return {
              type: 'Feature',
              geometry: geometry,
              properties: {
                id: index + 1,
                created: new Date().toISOString(),
                source: 'WKT_conversion',
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

      result = {
        type: 'FeatureCollection',
        features: features,
      }
    }

    // 模拟转换过程
    await new Promise((resolve) => setTimeout(resolve, 500))

    geojsonText.value = JSON.stringify(result, null, 2)
    ElMessage.success('转换成功！')
  } catch (e) {
    console.error('WKT转GeoJSON失败:', e)
    ElMessage.error('转换失败：' + e.message)
  } finally {
    converting.value = false
    globalLoading.value = false
  }
}

// 几何验证功能 - 改进版本
const validateGeometry = () => {
  if (!geojsonText.value || geojsonError.value) {
    ElMessage.warning('请先输入有效的GeoJSON数据')
    return
  }

  try {
    const geojson = JSON.parse(geojsonText.value)
    let isValid = true
    let issues = []
    let warnings = []

    const validateFeature = (feature, index = 0) => {
      try {
        const geometry = feature.geometry || feature

        // 使用 Turf.js 验证几何有效性
        if (geometry.type === 'Polygon') {
          try {
            const kinks = turf.kinks(turf.feature(geometry))
            if (kinks.features.length > 0) {
              issues.push(`多边形${index + 1}存在自相交`)
              isValid = false
            }
          } catch (e) {
            console.warn('检查多边形自相交失败:', e)
          }

          // 检查多边形是否封闭
          if (geometry.coordinates && geometry.coordinates.length > 0) {
            geometry.coordinates.forEach((ring, ringIndex) => {
              if (ring.length < 4) {
                issues.push(`多边形${index + 1}的第${ringIndex + 1}个环点数不足（至少需要4个点）`)
                isValid = false
              } else {
                const first = ring[0]
                const last = ring[ring.length - 1]
                if (first[0] !== last[0] || first[1] !== last[1]) {
                  issues.push(`多边形${index + 1}的第${ringIndex + 1}个环未封闭`)
                  isValid = false
                }
              }
            })
          }
        }

        if (geometry.type === 'LineString') {
          if (geometry.coordinates.length < 2) {
            issues.push(`线段${index + 1}点数不足（至少需要2个点）`)
            isValid = false
          }
        }

        // 检查坐标范围和精度
        const checkCoordinates = (coords, depth = 0) => {
          if (depth > 10) return // 防止无限递归

          if (Array.isArray(coords)) {
            if (
              coords.length === 2 &&
              typeof coords[0] === 'number' &&
              typeof coords[1] === 'number'
            ) {
              const [lng, lat] = coords

              // 坐标范围检查
              if (lng < -180 || lng > 180) {
                issues.push(`图形${index + 1}经度超出范围: ${lng}`)
                isValid = false
              }
              if (lat < -90 || lat > 90) {
                issues.push(`图形${index + 1}纬度超出范围: ${lat}`)
                isValid = false
              }

              // 精度检查
              if (lng.toString().includes('.') && lng.toString().split('.')[1].length > 10) {
                warnings.push(`图形${index + 1}经度精度过高，可能影响性能`)
              }
              if (lat.toString().includes('.') && lat.toString().split('.')[1].length > 10) {
                warnings.push(`图形${index + 1}纬度精度过高，可能影响性能`)
              }
            } else {
              coords.forEach((coord) => checkCoordinates(coord, depth + 1))
            }
          }
        }

        checkCoordinates(geometry.coordinates)

        // 使用Turf.js进行额外验证
        try {
          if (geometry.type.includes('Polygon')) {
            const area = turf.area(turf.feature(geometry))
            if (area === 0) {
              warnings.push(`图形${index + 1}面积为0，可能是退化的几何`)
            }
          }
        } catch (e) {
          console.warn('Turf.js验证失败:', e)
        }
      } catch (e) {
        issues.push(`图形${index + 1}验证错误: ${e.message}`)
        isValid = false
      }
    }

    if (geojson.type === 'FeatureCollection') {
      geojson.features.forEach((feature, index) => validateFeature(feature, index))
    } else if (geojson.type === 'Feature') {
      validateFeature(geojson)
    } else {
      validateFeature({ geometry: geojson })
    }

    // 显示验证结果
    let message = ''
    let type = 'success'

    if (isValid && warnings.length === 0) {
      message = '✅ 几何数据完全有效！'
      type = 'success'
    } else if (isValid && warnings.length > 0) {
      message = `✅ 几何数据有效，但有${warnings.length}个警告：\n${warnings.slice(0, 5).join('\n')}`
      type = 'warning'
    } else {
      message = `❌ 发现${issues.length}个问题：\n${issues.slice(0, 5).join('\n')}`
      type = 'error'
    }

    ElNotification({
      title: '几何验证结果',
      message: message,
      type: type,
      duration: type === 'success' ? 3000 : 8000,
    })
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
      '请输入简化容差（0.0001-0.1，值越小越精确）',
      '简化几何',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: '0.01',
        inputPattern: /^0\.\d+$/,
        inputErrorMessage: '请输入0到1之间的小数',
      },
    )

    globalLoading.value = true
    loadingMessage.value = '正在简化几何...'

    const geojson = JSON.parse(geojsonText.value)
    let simplified
    let originalCount = 0
    let simplifiedCount = 0

    // 计算原始坐标数量
    const countCoordinates = (obj) => {
      const coordStr = JSON.stringify(obj.coordinates || obj.geometry?.coordinates || [])
      return (coordStr.match(/\d+\.\d+/g) || []).length / 2
    }

    const simplifyFeature = (feature) => {
      try {
        originalCount += countCoordinates(feature)
        const result = turf.simplify(feature, {
          tolerance: parseFloat(tolerance),
          highQuality: true,
        })
        simplifiedCount += countCoordinates(result)
        return result
      } catch (e) {
        console.warn('简化特征失败:', e)
        return feature
      }
    }

    if (geojson.type === 'FeatureCollection') {
      simplified = {
        ...geojson,
        features: geojson.features.map(simplifyFeature),
      }
    } else {
      simplified = simplifyFeature(geojson)
    }

    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, 1000))

    geojsonText.value = JSON.stringify(simplified, null, 2)

    const reduction =
      originalCount > 0 ? (((originalCount - simplifiedCount) / originalCount) * 100).toFixed(1) : 0
    ElMessage.success(
      `几何简化完成！坐标点数从${originalCount}减少到${simplifiedCount}（减少${reduction}%）`,
    )
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('简化失败：' + e.message)
    }
  } finally {
    globalLoading.value = false
  }
}

// 格式化功能 - 改进版本
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

        // WKT格式化：标准化空格和括号
        return line
          .trim()
          .replace(/,\s*/g, ', ')
          .replace(/\(\s*/g, '(')
          .replace(/\s*\)/g, ')')
          .replace(/\s+/g, ' ')
      })
      .join('\n')

    wktText.value = formatted
    ElMessage.success('WKT格式化完成')
  } catch (e) {
    ElMessage.error('格式化失败：' + e.message)
  }
}

// 地图功能
const exportMap = () => {
  if (!map) {
    ElMessage.warning('地图未准备好')
    return
  }

  try {
    // 使用html2canvas导出地图（需要引入库）
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
        // 创建地图快照信息
        const mapState = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bounds: map.getBounds(),
          geojson: geojsonText.value,
        }

        const mapInfo = `地图状态信息：
中心点: ${mapState.center.lat.toFixed(6)}, ${mapState.center.lng.toFixed(6)}
缩放级别: ${mapState.zoom}
边界: ${JSON.stringify(mapState.bounds)}
几何数据: ${mapState.geojson ? '已包含' : '无'}`

        ElMessageBox.alert(mapInfo, '地图状态')
      })
      .catch(() => {})
  } catch (e) {
    ElMessage.error('导出失败：' + e.message)
  }
}

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

// 文件处理 - 改进版本
const handleFileUpload = (file) => {
  if (file.size > 10 * 1024 * 1024) {
    // 10MB限制
    ElMessage.error('文件大小不能超过10MB')
    return false
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result

      // 验证JSON格式
      JSON.parse(content)

      geojsonText.value = content
      ElMessage.success(`文件"${file.name}"导入成功`)
    } catch (error) {
      ElMessage.error(`文件读取失败：${error.message}`)
    }
  }

  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }

  reader.readAsText(file, 'utf-8')
  return false // 阻止自动上传
}

const handleWktFileUpload = (file) => {
  if (file.size > 10 * 1024 * 1024) {
    // 10MB限制
    ElMessage.error('文件大小不能超过10MB')
    return false
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      wktText.value = e.target.result
      ElMessage.success(`文件"${file.name}"导入成功`)
    } catch (error) {
      ElMessage.error(`文件读取失败：${error.message}`)
    }
  }

  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }

  reader.readAsText(file, 'utf-8')
  return false
}

// 辅助功能
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
            level: 'district',
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
            visitors_per_year: 15000000,
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
            length_km: 13.4,
            lanes: 10,
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
    wktText.value = `-- 北京市区多边形 (行政区)
POLYGON((116.3 39.9, 116.4 39.9, 116.4 40.0, 116.3 40.0, 116.3 39.9))

-- 天安门广场点位 (地标)
POINT(116.3912 39.9042)

-- 长安街线段 (主干道)
LINESTRING(116.35 39.91, 116.39 39.91, 116.42 39.91)

-- 示例圆形区域
POLYGON((116.4 39.95, 116.41 39.95, 116.41 39.96, 116.4 39.96, 116.4 39.95))`
  }
  ElMessage.success('示例数据已加载')
}

const clearInput = async (type) => {
  try {
    await ElMessageBox.confirm('确定要清空输入内容吗？', '确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    if (type === 'geojson') {
      geojsonText.value = ''
    } else {
      wktText.value = ''
    }
    ElMessage.success('已清空')
  } catch {
    // 用户取消
  }
}

const clearMap = async () => {
  if (!drawnItems || drawnItems.getLayers().length === 0) {
    ElMessage.info('地图上没有图形')
    return
  }

  try {
    await ElMessageBox.confirm('确定要清空地图上的所有图形吗？', '确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    drawnItems.clearLayers()
    clearSelection()

    // 清空文本框
    isUndoing = true
    geojsonText.value = ''
    setTimeout(() => (isUndoing = false), 100)

    ElMessage.success('地图已清空')
  } catch {
    // 用户取消
  }
}

const copyToClipboard = async (text) => {
  if (!text) {
    ElMessage.warning('没有内容可复制')
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    // 降级方案
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('已复制到剪贴板')
    } catch (fallbackError) {
      ElMessage.error('复制失败，请手动复制')
    }
  }
}

const saveToFile = (text, filename) => {
  if (!text) {
    ElMessage.warning('没有内容可保存')
    return
  }

  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success(`文件"${filename}"已保存`)
  } catch (e) {
    ElMessage.error('保存失败：' + e.message)
  }
}

const undo = (type) => {
  const history = type === 'geojson' ? geojsonHistory.value : wktHistory.value

  if (history.length === 0) {
    ElMessage.info('没有可撤销的操作')
    return
  }

  isUndoing = true
  try {
    const lastValue = history.pop()
    if (type === 'geojson') {
      geojsonText.value = lastValue
    } else {
      wktText.value = lastValue
    }
    ElMessage.success('已撤销')
  } finally {
    setTimeout(() => (isUndoing = false), 100)
  }
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
  overflow-x: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 2.2em;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.header p {
  margin: 0;
  font-size: 1.1em;
  opacity: 0.9;
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
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.input-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3em;
  font-weight: 600;
}

.header-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.code-input :deep(.el-textarea__inner) {
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  border-radius: 12px;
  resize: vertical;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
}

.code-input :deep(.el-textarea__inner):focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.success-border :deep(.el-textarea__inner) {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.error-border :deep(.el-textarea__inner) {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.error-tip {
  color: #f56c6c;
  font-size: 13px;
  margin-top: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border: 1px solid #fbc4c4;
  border-radius: 8px;
  border-left: 4px solid #f56c6c;
  animation: slideInDown 0.3s ease;
}

.success-tip {
  color: #67c23a;
  font-size: 13px;
  margin-top: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e1f5fe 100%);
  border: 1px solid #b3e5fc;
  border-radius: 8px;
  border-left: 4px solid #67c23a;
  animation: slideInDown 0.3s ease;
}

.button-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  gap: 12px;
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
  gap: 16px;
  padding: 24px;
  align-items: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.convert-btn {
  min-width: 180px;
  height: 44px;
  font-weight: 600;
  font-size: 15px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.convert-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.3);
}

.tool-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

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
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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
}

.draw-tools-info {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: 1px solid #ffcc02;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-left: 4px solid #ff9800;
}

.tool-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e65100;
}

.tool-icon {
  font-size: 16px;
}

.tool-list {
  color: #bf360c;
  font-weight: 500;
}

#map-container {
  width: 100%;
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e4e7ed;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.map-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 12px;
}

.map-loading-overlay p {
  margin-top: 16px;
  color: #409eff;
  font-weight: 500;
}

.stats-section {
  width: 100%;
  margin-bottom: 20px;
}

.stats-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.stats-card h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.3em;
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.stat-item:hover {
  border-color: #409eff;
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.2);
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

.stat-item:hover::before {
  transform: translateX(0);
}

.stat-value {
  font-size: 2.2em;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.stat-item:hover .stat-value {
  color: #1976d2;
  transform: scale(1.1);
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detailed-stats {
  margin-top: 20px;
}

.stats-details p {
  margin: 8px 0;
  line-height: 1.6;
  color: #495057;
}

/* 右键菜单样式 */
.context-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 8px 0;
  min-width: 200px;
  font-size: 14px;
  backdrop-filter: blur(10px);
  animation: contextMenuSlide 0.2s ease;
}

@keyframes contextMenuSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.context-menu-item {
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.context-menu-item:hover {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  color: #1976d2;
  padding-left: 24px;
}

.context-menu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
  margin: 8px 16px;
}

.geometry-info h4 {
  margin: 20px 0 12px 0;
  color: #2c3e50;
  border-bottom: 2px solid #e3f2fd;
  padding-bottom: 8px;
  font-weight: 600;
}

.geometry-info h4:first-child {
  margin-top: 0;
}

.coordinate-details {
  max-height: 200px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e9ecef;
}

.coordinate-details pre {
  margin: 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #495057;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.global-loading p {
  margin-top: 16px;
  font-size: 16px;
  color: #409eff;
  font-weight: 500;
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
    padding: 0 12px;
  }

  .header {
    padding: 24px 16px;
  }

  .header h1 {
    font-size: 1.8em;
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-buttons {
    justify-content: center;
  }

  .button-group {
    flex-direction: column;
    gap: 12px;
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
    gap: 16px;
  }

  .map-controls {
    justify-content: center;
  }

  #map-container {
    height: 400px;
  }

  .convert-btn {
    min-width: 140px;
    height: 40px;
    font-size: 14px;
  }

  .map-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tool-tip {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .input-card,
  .map-card,
  .stats-card {
    padding: 20px;
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

  .header h1 {
    font-size: 1.6em;
  }

  .input-card,
  .map-card,
  .stats-card {
    padding: 16px;
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

/* 绘制工具图标 */
:deep(.leaflet-draw-draw-polygon a::after) {
  content: '⬟' !important;
  font-size: 18px !important;
  color: inherit !important;
}

:deep(.leaflet-draw-draw-polyline a::after) {
  content: '📏' !important;
  font-size: 16px !important;
}

:deep(.leaflet-draw-draw-rectangle a::after) {
  content: '▢' !important;
  font-size: 18px !important;
  color: inherit !important;
}

:deep(.leaflet-draw-draw-circle a::after) {
  content: '○' !important;
  font-size: 18px !important;
  color: inherit !important;
}

:deep(.leaflet-draw-draw-marker a::after) {
  content: '📍' !important;
  font-size: 16px !important;
}

:deep(.leaflet-draw-edit-edit a::after) {
  content: '✏️' !important;
  font-size: 16px !important;
}

:deep(.leaflet-draw-edit-remove a::after) {
  content: '🗑️' !important;
  font-size: 14px !important;
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

:deep(.leaflet-draw-tooltip::before) {
  border-top-color: rgba(0, 0, 0, 0.85) !important;
}

/* 操作按钮样式 */
:deep(.leaflet-draw-actions) {
  margin-top: 12px !important;
  padding: 8px !important;
  background: white !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

:deep(.leaflet-draw-actions a) {
  background: white !important;
  border: 1px solid #ddd !important;
  border-radius: 6px !important;
  padding: 6px 12px !important;
  margin: 0 4px !important;
  font-size: 12px !important;
  color: #333 !important;
  text-decoration: none !important;
  transition: all 0.2s ease !important;
}

:deep(.leaflet-draw-actions a:hover) {
  background: #f0f9ff !important;
  border-color: #409eff !important;
  color: #409eff !important;
  transform: translateY(-1px) !important;
}

/* Element Plus 组件样式优化 */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-2px);
}

:deep(.el-button--small) {
  padding: 6px 14px;
  font-size: 13px;
}

:deep(.el-textarea__inner) {
  font-family: 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace !important;
}

:deep(.el-upload) {
  display: inline-block;
}

:deep(.el-radio-group) {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-radio-button__inner) {
  border: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 8px 0 0 8px;
}

:deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 8px 8px 0;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, #409eff 0%, #1976d2 100%);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

:deep(.el-divider--horizontal) {
  margin: 16px 0;
  background: linear-gradient(90deg, transparent, #e4e7ed, transparent);
}

:deep(.el-descriptions__body) {
  background: #fafafa;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  color: #2c3e50;
}

/* 滚动条样式 */
:deep(.el-textarea__inner)::-webkit-scrollbar,
.coordinate-details::-webkit-scrollbar {
  width: 8px;
}

:deep(.el-textarea__inner)::-webkit-scrollbar-track,
.coordinate-details::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

:deep(.el-textarea__inner)::-webkit-scrollbar-thumb,
.coordinate-details::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #c1c1c1 0%, #a1a1a1 100%);
  border-radius: 4px;
  transition: background 0.3s ease;
}

:deep(.el-textarea__inner)::-webkit-scrollbar-thumb:hover,
.coordinate-details::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #a1a1a1 0%, #8a8a8a 100%);
}

/* 动画效果 */
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

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(64, 158, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

.convert-btn:active {
  animation: pulse 0.6s;
}

/* 加载动画 */
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 工具提示增强 */
.enhanced-tooltip {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .app-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #e0e6ed;
  }

  .input-card,
  .map-card,
  .stats-card {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
    color: #e0e6ed;
  }

  .card-header h3,
  .map-header h3,
  .stats-card h3 {
    color: #e0e6ed;
  }

  .code-input :deep(.el-textarea__inner) {
    background-color: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.2);
    color: #e0e6ed;
  }
}
</style>
