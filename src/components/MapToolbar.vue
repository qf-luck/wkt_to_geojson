<template>
  <div class="map-toolbar">
    <!-- 工具按钮组 -->
    <div class="toolbar-group">
      <span class="group-label">坐标工具</span>
      <el-button-group size="small">
        <el-button @click="showCoordinateDialog">
          <el-icon><Location /></el-icon>
          坐标跳转
        </el-button>
        <el-button @click="showCRSDialog">
          <el-icon><Compass /></el-icon>
          坐标系统
        </el-button>
      </el-button-group>
    </div>

    <el-divider direction="vertical" />

    <div class="toolbar-group">
      <span class="group-label">测量工具</span>
      <el-button-group size="small">
        <el-button
          :type="measureMode === 'distance' ? 'primary' : ''"
          @click="startMeasureDistance"
        >
          <el-icon><Operation /></el-icon>
          测距离
        </el-button>
        <el-button
          :type="measureMode === 'area' ? 'primary' : ''"
          @click="startMeasureArea"
        >
          <el-icon><Grid /></el-icon>
          测面积
        </el-button>
        <el-button
          type="danger"
          @click="clearMeasure"
          :disabled="!measureMode"
        >
          清除
        </el-button>
      </el-button-group>
    </div>

    <el-divider direction="vertical" />

    <div class="toolbar-group">
      <span class="group-label">地图样式</span>
      <el-select
        v-model="currentStyle"
        size="small"
        style="width: 140px"
        @change="changeMapStyle"
      >
        <el-option
          v-for="style in mapStyles"
          :key="style.value"
          :label="style.label"
          :value="style.value"
        >
          <span>{{ style.icon }} {{ style.label }}</span>
        </el-option>
      </el-select>
    </div>

    <!-- 坐标跳转对话框 -->
    <el-dialog v-model="coordinateDialogVisible" title="坐标跳转" width="400px">
      <el-form label-width="60px">
        <el-form-item label="经度">
          <el-input-number
            v-model="jumpLng"
            :precision="6"
            :step="0.1"
            :min="-180"
            :max="180"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input-number
            v-model="jumpLat"
            :precision="6"
            :step="0.1"
            :min="-90"
            :max="90"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="缩放">
          <el-slider v-model="jumpZoom" :min="1" :max="18" :marks="zoomMarks" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="coordinateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="jumpToCoordinate">跳转</el-button>
      </template>
    </el-dialog>

    <!-- 坐标系统对话框 -->
    <el-dialog v-model="crsDialogVisible" title="坐标系统切换" width="400px">
      <el-radio-group v-model="selectedCRS" @change="handleCRSChange">
        <el-radio value="WGS84" label="WGS84">
          WGS84 (GPS标准)
        </el-radio>
        <el-radio value="GCJ02" label="GCJ02">
          GCJ02 (国测局火星坐标)
        </el-radio>
        <el-radio value="BD09" label="BD09">
          BD09 (百度坐标)
        </el-radio>
      </el-radio-group>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 12px"
      >
        <template #default>
          <div style="font-size: 12px">
            当前: {{ crsDescriptions[selectedCRS] }}
          </div>
        </template>
      </el-alert>
      <template #footer>
        <el-button @click="crsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Location,
  Compass,
  Operation,
  Grid
} from '@element-plus/icons-vue'

const emit = defineEmits([
  'jump-to-coordinate',
  'crs-change',
  'measure-distance',
  'measure-area',
  'clear-measure',
  'style-change'
])

// 对话框状态
const coordinateDialogVisible = ref(false)
const crsDialogVisible = ref(false)

// 坐标跳转
const jumpLng = ref(116.404)
const jumpLat = ref(39.915)
const jumpZoom = ref(12)
const zoomMarks = {
  1: '世界',
  5: '国家',
  10: '省市',
  15: '街道',
  18: '建筑'
}

// 坐标系统
const selectedCRS = ref('WGS84')
const crsDescriptions = {
  WGS84: 'GPS标准坐标，国际通用',
  GCJ02: '国测局加密坐标，适用于国内地图',
  BD09: '百度坐标系，用于百度地图'
}

// 测量工具
const measureMode = ref(null)

// 地图样式
const currentStyle = ref('gaode')
const mapStyles = [
  { value: 'gaode', label: '高德标准', icon: '🗺️' },
  { value: 'gaodeSatellite', label: '高德卫星', icon: '🛰️' },
  { value: 'osm', label: '开放街图', icon: '🌍' },
  { value: 'light', label: '简洁', icon: '☀️' },
  { value: 'dark', label: '暗色', icon: '🌙' }
]

// 方法
const showCoordinateDialog = () => {
  coordinateDialogVisible.value = true
}

const showCRSDialog = () => {
  crsDialogVisible.value = true
}

const jumpToCoordinate = () => {
  emit('jump-to-coordinate', {
    lng: jumpLng.value,
    lat: jumpLat.value,
    zoom: jumpZoom.value
  })
  coordinateDialogVisible.value = false
  ElMessage.success(`已跳转到 [${jumpLng.value}, ${jumpLat.value}]`)
}

const handleCRSChange = (value) => {
  emit('crs-change', value)
  ElMessage.success(`已切换到 ${crsDescriptions[value]}`)
}

const startMeasureDistance = () => {
  measureMode.value = 'distance'
  emit('measure-distance')
  ElMessage.info('请在地图上点击两个点测量距离')
}

const startMeasureArea = () => {
  measureMode.value = 'area'
  emit('measure-area')
  ElMessage.info('请在地图上绘制多边形测量面积')
}

const clearMeasure = () => {
  measureMode.value = null
  emit('clear-measure')
  ElMessage.success('已清除测量结果')
}

const changeMapStyle = (style) => {
  emit('style-change', style)
}
</script>

<style scoped>
.map-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-label {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  white-space: nowrap;
}

.el-divider--vertical {
  height: 24px;
  margin: 0;
}

.el-radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .map-toolbar {
    padding: 10px 12px;
    gap: 12px;
  }

  .group-label {
    display: none;
  }

  .toolbar-group {
    gap: 6px;
  }
}

@media (max-width: 480px) {
  .map-toolbar {
    padding: 8px;
    gap: 8px;
  }

  .el-divider--vertical {
    display: none;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .map-toolbar {
    background: rgba(30, 41, 59, 0.95);
  }

  .group-label {
    color: #e0e6ed;
  }
}
</style>