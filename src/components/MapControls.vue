<template>
  <div class="map-controls">
    <!-- 地图样式选择 -->
    <div class="control-group">
      <label class="control-label">地图样式:</label>
      <el-radio-group
        :model-value="currentMapStyle"
        @change="$emit('style-change', $event)"
        size="small"
      >
        <el-radio-button value="osm">🗺️ 标准</el-radio-button>
        <el-radio-button value="light">☀️ 简洁</el-radio-button>
        <el-radio-button value="dark">🌙 暗色</el-radio-button>
        <el-radio-button value="satellite">🛰️ 卫星</el-radio-button>
        <el-radio-button value="terrain">🏔️ 地形</el-radio-button>
      </el-radio-group>
    </div>

    <el-divider direction="vertical" />

    <!-- 视图控制 -->
    <div class="control-group">
      <label class="control-label">视图:</label>
      <el-button-group size="small">
        <el-button @click="$emit('zoom-to-fit')" :disabled="!hasGeometry" title="适应所有图形">
          🎯 适应范围
        </el-button>
        <el-button @click="$emit('zoom-to-selected')" :disabled="!hasSelection" title="缩放到选中图形">
          🔍 缩放选中
        </el-button>
        <el-button @click="$emit('reset-view')" title="重置到初始视图">
          🏠 重置视图
        </el-button>
      </el-button-group>
    </div>

    <el-divider direction="vertical" />

    <!-- 图层操作 -->
    <div class="control-group">
      <label class="control-label">图层:</label>
      <el-button-group size="small">
        <el-button @click="$emit('select-all')" :disabled="!hasGeometry" title="选择所有图层">
          ✅ 全选
        </el-button>
        <el-button @click="$emit('clear-selection')" :disabled="!hasSelection" title="清除选择">
          ❌ 清除选择
        </el-button>
        <el-button @click="$emit('invert-selection')" :disabled="!hasGeometry" title="反选图层">
          🔄 反选
        </el-button>
      </el-button-group>
    </div>

    <el-divider direction="vertical" />

    <!-- 工具操作 -->
    <div class="control-group">
      <label class="control-label">工具:</label>
      <el-button-group size="small">
        <el-button @click="$emit('measure-tool')" title="测量工具">
          📏 测量
        </el-button>
        <el-button @click="showSearchDialog = true" :disabled="!hasGeometry" title="搜索图层">
          🔎 搜索
        </el-button>
        <el-button @click="$emit('layer-info')" :disabled="!hasSelection" title="图层信息">
          ℹ️ 信息
        </el-button>
      </el-button-group>
    </div>

    <el-divider direction="vertical" />

    <!-- 导出导入 -->
    <div class="control-group">
      <label class="control-label">数据:</label>
      <el-button-group size="small">
        <el-button @click="$emit('export-map')" title="导出地图图片">
          📸 导出图片
        </el-button>
        <el-button @click="$emit('export-data')" :disabled="!hasGeometry" title="导出地理数据">
          💾 导出数据
        </el-button>
        <el-button @click="$emit('import-data')" title="导入地理数据">
          📁 导入数据
        </el-button>
      </el-button-group>
    </div>

    <el-divider direction="vertical" />

    <!-- 地图清理 -->
    <div class="control-group">
      <el-button
        size="small"
        type="danger"
        @click="confirmClearMap"
        :disabled="!hasGeometry"
        title="清空地图上的所有图形"
      >
        🗑️ 清空地图
      </el-button>
    </div>

    <!-- 搜索对话框 -->
    <el-dialog
      v-model="showSearchDialog"
      title="🔎 搜索图层"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="search-content">
        <el-input
          v-model="searchKeyword"
          placeholder="输入图层名称、类型等关键词..."
          @keyup.enter="performSearch"
          clearable
          autofocus
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <div class="search-options">
          <el-checkbox v-model="searchOptions.name">搜索名称</el-checkbox>
          <el-checkbox v-model="searchOptions.type">搜索类型</el-checkbox>
          <el-checkbox v-model="searchOptions.properties">搜索属性</el-checkbox>
        </div>

        <div v-if="searchResults.length > 0" class="search-results">
          <h4>搜索结果 ({{ searchResults.length }})</h4>
          <div
            v-for="(result, index) in searchResults"
            :key="index"
            class="search-result-item"
            @click="selectSearchResult(result)"
          >
            <div class="result-name">{{ result.name }}</div>
            <div class="result-type">{{ result.type }}</div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSearchDialog = false">取消</el-button>
          <el-button type="primary" @click="performSearch" :disabled="!searchKeyword">
            搜索
          </el-button>
          <el-button v-if="searchResults.length > 0" @click="selectAllResults">
            选择全部
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图层信息对话框 -->
    <el-dialog
      v-model="showLayerInfoDialog"
      title="📊 图层统计信息"
      width="500px"
    >
      <div class="layer-stats">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="总图层数">
            {{ layerStats.total }}
          </el-descriptions-item>
          <el-descriptions-item label="选中图层数">
            {{ layerStats.selected }}
          </el-descriptions-item>
          <el-descriptions-item label="点图层">
            {{ layerStats.points }}
          </el-descriptions-item>
          <el-descriptions-item label="线图层">
            {{ layerStats.lines }}
          </el-descriptions-item>
          <el-descriptions-item label="面图层">
            {{ layerStats.polygons }}
          </el-descriptions-item>
          <el-descriptions-item label="总面积">
            {{ layerStats.totalArea || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="总长度">
            {{ layerStats.totalLength || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  currentMapStyle: String,
  hasGeometry: Boolean,
  selectedLayersCount: {
    type: Number,
    default: 0
  },
  layerStats: {
    type: Object,
    default: () => ({
      total: 0,
      selected: 0,
      points: 0,
      lines: 0,
      polygons: 0,
      totalArea: null,
      totalLength: null
    })
  }
})

// 响应式数据
const showSearchDialog = ref(false)
const showLayerInfoDialog = ref(false)
const searchKeyword = ref('')
const searchResults = ref([])

const searchOptions = ref({
  name: true,
  type: true,
  properties: false
})

// 计算属性
const hasSelection = computed(() => props.selectedLayersCount > 0)

// 方法
const confirmClearMap = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空地图上的所有图形吗？此操作不可撤销。',
      '确认清空',
      {
        type: 'warning',
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )
    emit('clear-map')
  } catch {
    // 用户取消
  }
}

const performSearch = () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  emit('search-layers', {
    keyword: searchKeyword.value,
    options: searchOptions.value
  })

  // 模拟搜索结果（实际应该从父组件接收）
  searchResults.value = [
    { name: '搜索结果1', type: '多边形', id: 1 },
    { name: '搜索结果2', type: '线段', id: 2 }
  ]
}

const selectSearchResult = (result) => {
  emit('select-search-result', result)
  ElMessage.success(`已选择: ${result.name}`)
}

const selectAllResults = () => {
  emit('select-search-results', searchResults.value)
  ElMessage.success(`已选择所有 ${searchResults.value.length} 个搜索结果`)
  showSearchDialog.value = false
}

// const showLayerInfo = () => {
//   showLayerInfoDialog.value = true
// }

// 定义 emit
const emit = defineEmits([
  'style-change',
  'zoom-to-fit',
  'zoom-to-selected',
  'reset-view',
  'select-all',
  'clear-selection',
  'invert-selection',
  'measure-tool',
  'search-layers',
  'select-search-result',
  'select-search-results',
  'layer-info',
  'export-map',
  'export-data',
  'import-data',
  'clear-map'
])
</script>

<style scoped>
.map-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #dee2e6;
  margin-bottom: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.control-label {
  font-size: 13px;
  font-weight: 600;
  color: #495057;
  white-space: nowrap;
  margin-right: 4px;
}

.el-button-group {
  display: flex;
}

.el-button-group .el-button {
  margin: 0 !important;
  border-radius: 0 !important;
}

.el-button-group .el-button:first-child {
  border-radius: 6px 0 0 6px !important;
}

.el-button-group .el-button:last-child {
  border-radius: 0 6px 6px 0 !important;
}

.el-button-group .el-button:only-child {
  border-radius: 6px !important;
}

/* 搜索对话框样式 */
.search-content {
  padding: 8px 0;
}

.search-options {
  margin: 16px 0;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.search-results {
  margin-top: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.search-results h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 14px;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 8px;
}

.search-result-item {
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.search-result-item:hover {
  border-color: #409eff;
  background: #e3f2fd;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.result-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.result-type {
  font-size: 12px;
  color: #6c757d;
  background: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

/* 图层统计样式 */
.layer-stats {
  padding: 8px 0;
}

/* 分割线样式 */
.el-divider--vertical {
  height: 24px;
  margin: 0 8px;
}

/* 按钮组优化 */
.el-radio-group {
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.el-radio-button__inner {
  padding: 8px 12px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border: none !important;
  background: white !important;
  color: #606266 !important;
  transition: all 0.3s ease !important;
}

.el-radio-button__inner:hover {
  background: #f5f7fa !important;
  color: #409eff !important;
}

.el-radio-button:first-child .el-radio-button__inner {
  border-radius: 8px 0 0 8px !important;
}

.el-radio-button:last-child .el-radio-button__inner {
  border-radius: 0 8px 8px 0 !important;
}

.el-radio-button__original-radio:checked + .el-radio-button__inner {
  background: linear-gradient(135deg, #409eff 0%, #1976d2 100%) !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3) !important;
}

/* 危险按钮样式 */
.el-button--danger {
  background: linear-gradient(135deg, #f56c6c 0%, #e74c3c 100%) !important;
  border: none !important;
  color: white !important;
}

.el-button--danger:hover {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3) !important;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .map-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .control-group {
    justify-content: center;
  }

  .el-divider--vertical {
    display: none;
  }
}

@media (max-width: 768px) {
  .map-controls {
    padding: 8px 12px;
    gap: 8px;
  }

  .control-group {
    flex-direction: column;
    gap: 6px;
  }

  .control-label {
    font-size: 12px;
    text-align: center;
  }

  .el-radio-group {
    width: 100%;
  }

  .el-radio-button__inner {
    padding: 6px 8px !important;
    font-size: 12px !important;
  }

  .el-button-group {
    width: 100%;
  }

  .el-button-group .el-button {
    flex: 1;
    padding: 6px 8px !important;
    font-size: 12px !important;
  }
}

@media (max-width: 480px) {
  .el-radio-group {
    flex-direction: column !important;
  }

  .el-radio-button:first-child .el-radio-button__inner {
    border-radius: 8px 8px 0 0 !important;
  }

  .el-radio-button:last-child .el-radio-button__inner {
    border-radius: 0 0 8px 8px !important;
  }

  .el-radio-button__inner {
    width: 100% !important;
    text-align: center !important;
    padding: 8px 12px !important;
  }

  .el-button-group {
    flex-direction: column;
  }

  .el-button-group .el-button:first-child {
    border-radius: 6px 6px 0 0 !important;
  }

  .el-button-group .el-button:last-child {
    border-radius: 0 0 6px 6px !important;
  }
}

/* 加载动画 */
@keyframes controlsSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.map-controls {
  animation: controlsSlideIn 0.3s ease-out;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .map-controls {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .control-label {
    color: #e0e6ed;
  }

  .search-result-item {
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.2);
    color: #e0e6ed;
  }

  .search-result-item:hover {
    background: rgba(64, 158, 255, 0.2);
  }

  .result-name {
    color: #e0e6ed;
  }

  .result-type {
    background: rgba(255, 255, 255, 0.1);
    color: #e0e6ed;
  }
}

/* 无障碍优化 */
@media (prefers-reduced-motion: reduce) {
  .map-controls,
  .search-result-item,
  .el-button {
    animation: none !important;
    transition: none !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .map-controls {
    border: 2px solid currentColor;
  }

  .el-button {
    border: 2px solid currentColor !important;
  }

  .search-result-item {
    border: 2px solid currentColor;
  }
}
</style>
