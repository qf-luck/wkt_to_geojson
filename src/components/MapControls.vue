<template>
  <div class="map-controls">
    <el-radio-group
      :model-value="currentMapStyle"
      @change="$emit('style-change', $event)"
      size="small"
    >
      <el-radio-button value="osm">标准</el-radio-button>
      <el-radio-button value="light">简洁</el-radio-button>
      <el-radio-button value="dark">暗色</el-radio-button>
      <el-radio-button value="satellite">卫星</el-radio-button>
    </el-radio-group>

    <el-button size="small" @click="$emit('export-map')"> 📸 导出图片 </el-button>

    <el-button size="small" @click="$emit('clear-map')"> 清空地图 </el-button>

    <el-button size="small" @click="$emit('zoom-to-fit')" :disabled="!hasGeometry">
      📍 适应范围
    </el-button>
  </div>
</template>

<script setup>
// Props
defineProps({
  currentMapStyle: String,
  hasGeometry: Boolean,
})

// Emits
defineEmits(['style-change', 'export-map', 'clear-map', 'zoom-to-fit'])
</script>

<style scoped>
.map-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-controls {
    justify-content: center;
  }
}
</style>
