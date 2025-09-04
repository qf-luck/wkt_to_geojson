<template>
  <div class="convert-buttons">
    <el-button
      type="primary"
      @click="$emit('convert-geojson-to-wkt')"
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
      @click="$emit('convert-wkt-to-geojson')"
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
        @click="$emit('validate-geometry')"
        :disabled="!geojsonText || !!geojsonError"
        size="small"
      >
        🔍 验证几何
      </el-button>

      <el-button
        type="warning"
        @click="$emit('simplify-geometry')"
        :disabled="!geojsonText || !!geojsonError"
        size="small"
      >
        🔧 简化几何
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

// Props
defineProps({
  geojsonText: String,
  wktText: String,
  geojsonError: String,
  wktError: String,
  converting: Boolean,
})

// Emits
defineEmits([
  'convert-geojson-to-wkt',
  'convert-wkt-to-geojson',
  'validate-geometry',
  'simplify-geometry',
])
</script>

<style scoped>
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

.convert-btn:active {
  animation: pulse 0.6s;
}

.tool-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .convert-buttons {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .convert-btn {
    min-width: 140px;
    height: 40px;
    font-size: 14px;
  }
}
</style>
