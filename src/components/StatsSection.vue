<template>
  <div class="stats-section">
    <div class="stats-card">
      <h3>📊 数据统计</h3>
      <div class="stats-grid">
        <div
          class="stat-item"
          @click="$emit('select-geometry-type', 'total')"
        >
          <div class="stat-value">{{ geometryStats.total }}</div>
          <div class="stat-label">图形总数</div>
        </div>
        <div
          class="stat-item"
          @click="$emit('select-geometry-type', 'points')"
        >
          <div class="stat-value">{{ geometryStats.points }}</div>
          <div class="stat-label">点</div>
        </div>
        <div
          class="stat-item"
          @click="$emit('select-geometry-type', 'lines')"
        >
          <div class="stat-value">{{ geometryStats.lines }}</div>
          <div class="stat-label">线</div>
        </div>
        <div
          class="stat-item"
          @click="$emit('select-geometry-type', 'polygons')"
        >
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
</template>

<script setup>
// Props
defineProps({
  geometryStats: {
    type: Object,
    default: () => ({
      total: 0,
      points: 0,
      lines: 0,
      polygons: 0,
      totalLength: null,
      totalArea: null,
      boundingBox: null
    })
  }
})

// Emits
defineEmits(['select-geometry-type'])
</script>

<style scoped>
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

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-card {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stats-card {
    padding: 16px;
  }
}
</style>
