<template>
  <div class="input-card">
    <div class="card-header">
      <h3>{{ title }}</h3>
      <div class="header-buttons">
        <el-button size="small" @click="loadSample">加载示例</el-button>
        <el-button size="small" @click="formatContent" :disabled="!modelValue"> 格式化</el-button>
        <el-button size="small" @click="clearInput">清空</el-button>
      </div>
    </div>

    <el-input
      :model-value="modelValue"
      @input="handleInput"
      type="textarea"
      :rows="12"
      :placeholder="placeholder"
      class="code-input"
      :class="{
        'success-border': modelValue && !error,
        'error-border': error,
      }"
    />

    <div v-if="error" class="error-tip">❌ {{ error }}</div>
    <div v-if="modelValue && !error" class="success-tip">
      ✅ {{ type === 'geojson' ? 'GeoJSON' : 'WKT' }}格式正确
    </div>

    <div class="button-group">
      <div class="left-buttons">
        <el-button size="small" @click="undo" :disabled="!canUndo"> ↶ 撤销</el-button>
        <el-button size="small" @click="handleCopyToClipboard" :disabled="!modelValue">
          📋 复制
        </el-button>
        <el-button size="small" @click="handleSaveToFile" :disabled="!modelValue">
          💾 保存
        </el-button>
        <FileUpload
          :accept="type === 'geojson' ? '.geojson,.json' : '.wkt,.txt'"
          @file-loaded="handleFileLoaded"
        />
      </div>
      <el-button
        type="primary"
        @click="drawOnMap"
        :disabled="!modelValue || !!error"
        :loading="loading"
      >
        🗺️ 显示到地图
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import FileUpload from './FileUpload.vue'
import { useHistory } from '../composables/useHistory'
import { useFileOperations } from '../composables/useFileOperations'

// Props
const props = defineProps({
  modelValue: String,
  type: {
    type: String,
    required: true,
    validator: (value) => ['geojson', 'wkt'].includes(value),
  },
  title: String,
  placeholder: String,
  error: String,
  loading: Boolean,
})

// Emits
const emit = defineEmits(['update:modelValue', 'draw-on-map'])

// 组合函数
const { history, canUndo, undo: undoHistory, addToHistory } = useHistory()
const { copyToClipboard, saveToFile } = useFileOperations()

// 方法
const handleInput = (value) => {
  addToHistory(props.modelValue)
  emit('update:modelValue', value)
}

const loadSample = () => {
  let sampleData

  if (props.type === 'geojson') {
    sampleData = {
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
      ],
    }
    emit('update:modelValue', JSON.stringify(sampleData, null, 2))
  } else {
    sampleData = `-- 北京市区多边形 (行政区)
POLYGON((116.3 39.9, 116.4 39.9, 116.4 40.0, 116.3 40.0, 116.3 39.9))

-- 天安门广场点位 (地标)
POINT(116.3912 39.9042)`
    emit('update:modelValue', sampleData)
  }

  ElMessage.success('示例数据已加载')
}

const formatContent = () => {
  if (!props.modelValue) {
    ElMessage.warning('没有内容可以格式化')
    return
  }

  try {
    if (props.type === 'geojson') {
      const parsed = JSON.parse(props.modelValue)
      emit('update:modelValue', JSON.stringify(parsed, null, 2))
    } else {
      // WKT 格式化逻辑
      const lines = props.modelValue.split('\n')
      const formatted = lines
        .map((line) => {
          if (line.trim().startsWith('--') || !line.trim()) {
            return line
          }
          return line
            .trim()
            .replace(/,\s*/g, ', ')
            .replace(/\(\s*/g, '(')
            .replace(/\s*\)/g, ')')
            .replace(/\s+/g, ' ')
        })
        .join('\n')
      emit('update:modelValue', formatted)
    }
    ElMessage.success('格式化完成')
  } catch (e) {
    ElMessage.error('格式化失败：' + e.message)
  }
}

const clearInput = async () => {
  try {
    await ElMessageBox.confirm('确定要清空输入内容吗？', '确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    emit('update:modelValue', '')
    ElMessage.success('已清空')
  } catch {
    // 用户取消
  }
}

const undo = () => {
  const lastValue = undoHistory()
  if (lastValue !== null) {
    emit('update:modelValue', lastValue)
    ElMessage.success('已撤销')
  } else {
    ElMessage.info('没有可撤销的操作')
  }
}

// 修复：正确调用 copyToClipboard
const handleCopyToClipboard = async () => {
  if (!props.modelValue) {
    ElMessage.warning('没有内容可复制')
    return
  }

  try {
    await copyToClipboard(props.modelValue)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 修复：正确调用 saveToFile 并添加文件名
const handleSaveToFile = () => {
  if (!props.modelValue) {
    ElMessage.warning('没有内容可保存')
    return
  }

  const timestamp = new Date().toISOString().split('T')[0]
  const extension = props.type === 'geojson' ? 'geojson' : 'wkt'
  const filename = `${props.type}_${timestamp}.${extension}`

  try {
    saveToFile(props.modelValue, filename)
  } catch (error) {
    console.error('保存失败:', error)
  }
}

const drawOnMap = () => {
  emit('draw-on-map', props.modelValue)
}

const handleFileLoaded = (content) => {
  emit('update:modelValue', content)
}
</script>

<style scoped>
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

/* 响应式设计 */
@media (max-width: 768px) {
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

  .input-card {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .left-buttons {
    flex-direction: column;
    width: 100%;
  }

  .left-buttons .el-button {
    width: 100%;
  }

  .input-card {
    padding: 16px;
  }
}
</style>
