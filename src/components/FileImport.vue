<template>
  <el-dialog
    v-model="visible"
    title="📁 导入文件"
    width="600px"
    @close="handleClose"
  >
    <div class="import-container">
      <!-- 拖拽上传区域 -->
      <div
        class="drop-zone"
        :class="{ 'is-dragover': isDragOver }"
        @drop.prevent="handleDrop"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @click="triggerFileInput"
      >
        <div class="drop-zone-content">
          <el-icon class="upload-icon" :size="48">
            <UploadFilled />
          </el-icon>
          <h3>拖拽文件到此处或点击选择文件</h3>
          <p class="supported-formats">
            支持格式: GeoJSON (.geojson, .json) | WKT (.wkt, .txt) | KML (.kml)
          </p>
          <p class="file-size-hint">最大支持 10MB</p>
        </div>
      </div>

      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".geojson,.json,.wkt,.txt,.kml"
        @change="handleFileSelect"
        style="display: none"
      />

      <!-- 文件信息显示 -->
      <div v-if="selectedFile" class="file-info">
        <div class="file-details">
          <el-icon class="file-icon"><Document /></el-icon>
          <div class="file-meta">
            <p class="file-name">{{ selectedFile.name }}</p>
            <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            circle
            @click="clearFile"
          />
        </div>
      </div>

      <!-- 导入选项 -->
      <div v-if="selectedFile" class="import-options">
        <el-divider content-position="left">导入选项</el-divider>
        <el-form label-width="120px" size="small">
          <el-form-item label="导入模式">
            <el-radio-group v-model="importMode">
              <el-radio value="replace">替换现有数据</el-radio>
              <el-radio value="append">追加到地图</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="自动居中">
            <el-switch v-model="autoFit" />
            <span class="option-hint">导入后自动缩放到数据范围</span>
          </el-form-item>
        </el-form>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-overlay">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>正在导入文件...</p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          @click="handleImport"
          :disabled="!selectedFile || loading"
          :loading="loading"
        >
          导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document, Delete, Loading } from '@element-plus/icons-vue'
import wellknown from 'wellknown'

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'import-success'])

// State
const fileInputRef = ref(null)
const selectedFile = ref(null)
const isDragOver = ref(false)
const loading = ref(false)
const importMode = ref('replace')
const autoFit = ref(true)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Methods
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleDragOver = (e) => {
  isDragOver.value = true
}

const handleDragLeave = (e) => {
  isDragOver.value = false
}

const handleDrop = (e) => {
  isDragOver.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) {
    processFile(files[0])
  }
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    processFile(files[0])
  }
}

const processFile = (file) => {
  // 验证文件大小 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    return
  }

  // 验证文件类型
  const validExtensions = ['.geojson', '.json', '.wkt', '.txt', '.kml']
  const fileName = file.name.toLowerCase()
  const isValid = validExtensions.some(ext => fileName.endsWith(ext))

  if (!isValid) {
    ElMessage.error('不支持的文件格式，请上传 GeoJSON、WKT 或 KML 文件')
    return
  }

  selectedFile.value = file
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const detectFileType = (fileName, content) => {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
    return 'geojson'
  } else if (lower.endsWith('.wkt') || lower.endsWith('.txt')) {
    return 'wkt'
  } else if (lower.endsWith('.kml')) {
    return 'kml'
  }

  // 尝试通过内容判断
  try {
    JSON.parse(content)
    return 'geojson'
  } catch {
    if (content.trim().startsWith('<')) {
      return 'kml'
    }
    return 'wkt'
  }
}

const parseKML = (kmlString) => {
  // 简单的KML解析器 - 提取坐标
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(kmlString, 'text/xml')

  const features = []
  const placemarks = xmlDoc.getElementsByTagName('Placemark')

  for (let placemark of placemarks) {
    try {
      const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent.trim()
      if (!coordinates) continue

      const coordPairs = coordinates.split(/\s+/).map(coord => {
        const [lng, lat, alt] = coord.split(',').map(Number)
        return [lng, lat]
      })

      // 判断几何类型
      let geometry
      if (placemark.getElementsByTagName('Point').length > 0) {
        geometry = { type: 'Point', coordinates: coordPairs[0] }
      } else if (placemark.getElementsByTagName('LineString').length > 0) {
        geometry = { type: 'LineString', coordinates: coordPairs }
      } else if (placemark.getElementsByTagName('Polygon').length > 0) {
        geometry = { type: 'Polygon', coordinates: [coordPairs] }
      }

      if (geometry) {
        features.push({
          type: 'Feature',
          properties: {},
          geometry
        })
      }
    } catch (error) {
      console.warn('解析 Placemark 失败:', error)
    }
  }

  return {
    type: 'FeatureCollection',
    features
  }
}

const handleImport = async () => {
  if (!selectedFile.value) return

  loading.value = true

  try {
    const text = await selectedFile.value.text()
    const fileType = detectFileType(selectedFile.value.name, text)

    let geojson

    if (fileType === 'geojson') {
      geojson = JSON.parse(text)

      // 验证 GeoJSON 格式
      if (!geojson.type) {
        throw new Error('无效的 GeoJSON 格式')
      }

      // 如果是单个 Feature，转换为 FeatureCollection
      if (geojson.type === 'Feature') {
        geojson = {
          type: 'FeatureCollection',
          features: [geojson]
        }
      }
    } else if (fileType === 'wkt') {
      // WKT 可能包含多行，每行一个几何
      const lines = text.split('\n').filter(line => line.trim())
      const features = []

      for (const line of lines) {
        try {
          const geometry = wellknown.parse(line.trim())
          if (geometry) {
            features.push({
              type: 'Feature',
              properties: {},
              geometry
            })
          }
        } catch (error) {
          console.warn('解析 WKT 行失败:', line, error)
        }
      }

      if (features.length === 0) {
        throw new Error('未能从文件中解析出有效的 WKT 几何')
      }

      geojson = {
        type: 'FeatureCollection',
        features
      }
    } else if (fileType === 'kml') {
      geojson = parseKML(text)

      if (geojson.features.length === 0) {
        throw new Error('未能从 KML 文件中解析出有效的几何')
      }
    }

    // 发送导入成功事件
    emit('import-success', {
      geojson,
      mode: importMode.value,
      autoFit: autoFit.value
    })

    ElMessage.success(`成功导入 ${geojson.features?.length || 1} 个图形`)
    handleClose()
  } catch (error) {
    console.error('导入文件失败:', error)
    ElMessage.error('导入失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  visible.value = false
  clearFile()
  importMode.value = 'replace'
  autoFit.value = true
}

// 监听对话框打开/关闭
watch(visible, (newVal) => {
  if (!newVal) {
    clearFile()
  }
})
</script>

<style scoped>
.import-container {
  position: relative;
  min-height: 300px;
}

.drop-zone {
  border: 3px dashed #dcdfe6;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.drop-zone:hover {
  border-color: #409eff;
  background: linear-gradient(135deg, #e7f3ff 0%, #d4ebff 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.drop-zone.is-dragover {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2f1 100%);
  transform: scale(1.02);
}

.drop-zone-content {
  pointer-events: none;
}

.upload-icon {
  color: #409eff;
  margin-bottom: 16px;
  animation: bounce 2s infinite;
}

.drop-zone h3 {
  margin: 16px 0 8px 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
}

.supported-formats {
  color: #606266;
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.6;
}

.file-size-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.file-info {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 32px;
  color: #409eff;
  flex-shrink: 0;
}

.file-meta {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.import-options {
  margin-top: 20px;
}

.option-hint {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 10;
}

.loading-overlay p {
  margin-top: 16px;
  color: #409eff;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .drop-zone {
    padding: 24px 16px;
  }

  .drop-zone h3 {
    font-size: 16px;
  }

  .supported-formats {
    font-size: 12px;
  }
}
</style>