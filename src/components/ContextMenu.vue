<template>
  <div v-show="visible" :style="style" class="context-menu" @click.stop>
    <div class="context-menu-item" @click="$emit('copy-geojson')">📋 复制为 GeoJSON</div>
    <div class="context-menu-item" @click="$emit('copy-wkt')">📐 复制为 WKT</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" @click="$emit('get-info')">ℹ️ 几何信息</div>
    <div
      class="context-menu-item"
      @click="$emit('measure-distance')"
      v-if="selectedLayersCount >= 2"
    >
      📏 测量距离
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" @click="$emit('delete-selected')">🗑️ 删除选中</div>
    <div class="context-menu-item" @click="$emit('duplicate')">📋 复制图形</div>
    <div class="context-menu-divider" v-if="selectedLayersCount > 1"></div>
    <div class="context-menu-item" @click="$emit('crop')" v-if="selectedLayersCount === 1">
      ✂️ 用选中图形裁剪
    </div>
    <div class="context-menu-item" @click="$emit('union')" v-if="selectedLayersCount > 1">
      🔗 合并选中图形
    </div>
    <div class="context-menu-item" @click="$emit('buffer')">📍 缓冲区分析</div>
    <div class="context-menu-item" @click="$emit('convex-hull')" v-if="selectedLayersCount > 2">
      🔺 凸包分析
    </div>
  </div>
</template>

<script setup>
// Props
defineProps({
  visible: Boolean,
  style: Object,
  selectedLayersCount: Number,
})

// Emits
defineEmits([
  'copy-geojson',
  'copy-wkt',
  'get-info',
  'measure-distance',
  'delete-selected',
  'duplicate',
  'crop',
  'union',
  'buffer',
  'convex-hull',
  'hide',
])
</script>

<style scoped>
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
  position: fixed;
  z-index: 10000;
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
</style>
