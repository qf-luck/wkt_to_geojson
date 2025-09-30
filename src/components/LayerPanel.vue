<template>
  <div class="layer-panel" :class="{ 'collapsed': isCollapsed }">
    <!-- 面板内容 -->
    <div class="panel-content">
      <!-- 头部操作栏 -->
      <div class="panel-header">
        <div class="header-left">
          <el-icon><Menu /></el-icon>
          <span class="title">图层管理 ({{ layers.length }})</span>
        </div>
        <div class="header-actions">
          <el-button size="small" @click="selectAllLayers" :disabled="layers.length === 0">
            全选
          </el-button>
          <el-button size="small" @click="invertSelection" :disabled="layers.length === 0">
            反选
          </el-button>
          <el-button size="small" @click="clearSelection" :disabled="selectedCount === 0">
            取消选择
          </el-button>
          <el-button
            size="small"
            :icon="isCollapsed ? 'ArrowUp' : 'ArrowDown'"
            @click="togglePanel"
          >
            {{ isCollapsed ? '展开' : '收起' }}
          </el-button>
        </div>
      </div>

      <!-- 图层列表 -->
      <div class="layer-list" v-show="!isCollapsed">
        <el-scrollbar max-height="200px">
          <div v-if="layers.length === 0" class="empty-state">
            <el-empty description="暂无图层" :image-size="60" />
          </div>

          <div class="layers-grid">
            <div
              v-for="(layer, index) in layers"
              :key="layer.id"
              class="layer-item"
              :class="{ 'selected': layer.selected, 'hidden': !layer.visible }"
              @click="handleLayerClick(layer, $event)"
              @contextmenu.prevent="handleLayerRightClick(layer, $event)"
            >
              <div class="layer-info">
                <el-checkbox
                  v-model="layer.visible"
                  @change="toggleLayerVisibility(layer)"
                  @click.stop
                />
                <span class="layer-icon">{{ getLayerIcon(layer.type) }}</span>
                <span class="layer-name">{{ layer.name }}</span>
                <span class="layer-type">{{ layer.type }}</span>
              </div>

              <div class="layer-actions" @click.stop>
                <el-button
                  size="small"
                  text
                  @click="zoomToLayer(layer)"
                  :icon="Aim"
                  title="缩放到此图层"
                />
                <el-button
                  size="small"
                  text
                  type="danger"
                  @click="deleteLayer(layer)"
                  :icon="Delete"
                  title="删除图层"
                />
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 图层操作 -->
      <div class="layer-operations" v-show="!isCollapsed">
        <!-- 图层透明度控制 -->
        <div class="opacity-control">
          <label>透明度</label>
          <el-slider
            v-model="globalOpacity"
            :min="0"
            :max="100"
            @change="handleOpacityChange"
            :disabled="layers.length === 0"
            style="width: 200px"
          />
          <span class="opacity-value">{{ globalOpacity }}%</span>
        </div>

        <!-- 图层统计 -->
        <div class="layer-stats">
          <div class="stat-item">
            <span class="label">已选:</span>
            <span class="value">{{ selectedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="label">可见:</span>
            <span class="value">{{ visibleCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Menu, ArrowRight, Delete, Aim } from '@element-plus/icons-vue'

const props = defineProps({
  layers: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'layer-select',
  'layer-visibility-change',
  'layer-delete',
  'zoom-to-layer',
  'opacity-change',
  'selection-change'
])

// 状态
const isCollapsed = ref(true) // 默认收起
const globalOpacity = ref(80)

// 计算属性
const selectedCount = computed(() => {
  return props.layers.filter(l => l.selected).length
})

const visibleCount = computed(() => {
  return props.layers.filter(l => l.visible).length
})

// 方法
const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value
}

const getLayerIcon = (type) => {
  const icons = {
    Point: '📍',
    LineString: '📏',
    Polygon: '⬛',
    MultiPoint: '📍📍',
    MultiLineString: '📏📏',
    MultiPolygon: '⬛⬛',
    Circle: '⭕',
    Rectangle: '▭',
    Marker: '📌'
  }
  return icons[type] || '🗺️'
}

const handleLayerClick = (layer, event) => {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+点击 = 多选
    layer.selected = !layer.selected
  } else {
    // 普通点击 = 单选
    props.layers.forEach(l => l.selected = false)
    layer.selected = true
  }
  emit('layer-select', layer)
  emit('selection-change', props.layers.filter(l => l.selected))
}

const handleLayerRightClick = (layer, event) => {
  // 右键点击逻辑可以在这里扩展
  console.log('右键点击图层:', layer)
}

const toggleLayerVisibility = (layer) => {
  emit('layer-visibility-change', layer)
}

const zoomToLayer = (layer) => {
  emit('zoom-to-layer', layer)
}

const deleteLayer = (layer) => {
  emit('layer-delete', layer)
}

const selectAllLayers = () => {
  props.layers.forEach(l => l.selected = true)
  emit('selection-change', props.layers)
  ElMessage.success(`已选择 ${props.layers.length} 个图层`)
}

const invertSelection = () => {
  props.layers.forEach(l => l.selected = !l.selected)
  emit('selection-change', props.layers.filter(l => l.selected))
  ElMessage.success('已反选图层')
}

const clearSelection = () => {
  props.layers.forEach(l => l.selected = false)
  emit('selection-change', [])
  ElMessage.success('已清除选择')
}

const handleOpacityChange = (value) => {
  emit('opacity-change', value / 100)
}
</script>

<style scoped>
.layer-panel {
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  margin-top: 16px;
}

.layer-panel.collapsed .layer-list,
.layer-panel.collapsed .layer-operations {
  display: none;
}

.panel-content {
  padding: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 2px solid #e4e7ed;
  border-radius: 12px 12px 0 0;
}

.layer-panel.collapsed .panel-header {
  border-radius: 12px;
  border-bottom: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.header-left .el-icon {
  font-size: 18px;
  color: #667eea;
}

.header-left .title {
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.layer-list {
  padding: 12px;
}

.empty-state {
  padding: 20px;
  text-align: center;
}

.layers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.layer-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.layer-item.selected {
  background: #e7f3ff;
  border-color: #409eff;
}

.layer-item.hidden {
  opacity: 0.5;
}

.layer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.layer-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.layer-name {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.layer-type {
  font-size: 11px;
  color: #909399;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.layer-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.layer-item:hover .layer-actions {
  opacity: 1;
}

.layer-operations {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #e4e7ed;
  border-radius: 0 0 12px 12px;
}

.opacity-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.opacity-control label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.opacity-value {
  font-size: 12px;
  font-weight: 600;
  color: #409eff;
  min-width: 40px;
}

.layer-stats {
  display: flex;
  gap: 16px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.stat-item .label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.stat-item .value {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

/* 响应式 */
@media (max-width: 768px) {
  .layers-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .layer-operations {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .opacity-control {
    width: 100%;
  }

  .layer-stats {
    width: 100%;
    justify-content: space-around;
  }
}

@media (max-width: 480px) {
  .layers-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-left {
    justify-content: center;
  }

  .header-actions {
    justify-content: center;
  }

  .layer-item {
    padding: 8px 10px;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .layer-panel {
    background: rgba(30, 41, 59, 0.95);
  }

  .layer-item {
    background: rgba(51, 65, 85, 0.6);
    color: #e0e6ed;
  }

  .layer-item:hover {
    background: rgba(51, 65, 85, 0.8);
  }

  .layer-name {
    color: #e0e6ed;
  }

  .layer-stats {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(51, 65, 85, 0.6) 100%);
  }

  .stat-item .label {
    color: #a8b3c1;
  }
}
</style>