<template>
  <div class="header">
    <div class="header-content">
      <div class="header-text">
        <h1>🗺️ GeoJSON & WKT 转换工具</h1>
        <p>支持在线编辑、可视化绘制和格式转换</p>
      </div>

      <div class="header-actions">
        <el-button-group class="action-group">
          <el-button @click="$emit('open-file')" type="primary" :icon="FolderOpened">
            导入文件
          </el-button>
          <el-button @click="$emit('export-file')" type="success" :icon="Download">
            导出文件
          </el-button>
          <el-button @click="$emit('show-shortcuts')" type="info" :icon="Position">
            快捷键
          </el-button>
          <el-button @click="$emit('show-help')" type="warning" :icon="QuestionFilled">
            帮助
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 进度指示器 -->
    <div v-if="loading" class="loading-bar">
      <div class="loading-progress" :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { FolderOpened, Download, Position, QuestionFilled } from '@element-plus/icons-vue'

// Props
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  }
})

// Emits
defineEmits(['open-file', 'export-file', 'show-shortcuts', 'show-help'])
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.3;
  z-index: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  gap: 20px;
}

.header-text {
  flex: 1;
  text-align: left;
}

.header-text h1 {
  margin: 0 0 8px 0;
  font-size: 2.2em;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.5px;
  animation: slideInDown 0.6s ease-out;
}

.header-text p {
  margin: 0;
  font-size: 1em;
  opacity: 0.95;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  animation: slideInDown 0.8s ease-out;
}

.header-actions {
  display: flex;
  align-items: center;
  animation: slideInDown 1s ease-out;
}

.action-group {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.action-group .el-button {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  font-weight: 500;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.action-group .el-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.action-group .el-button:active {
  transform: translateY(0);
}

/* 加载条 */
.loading-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.loading-progress {
  height: 100%;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(79, 172, 254, 0.5);
  animation: shimmer 1.5s infinite;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.8;
  }
}

/* 响应式 */
@media (max-width: 1024px) {
  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .header-text {
    text-align: center;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .action-group {
    width: 100%;
  }

  .action-group .el-button {
    flex: 1;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 20px 16px;
  }

  .header-text h1 {
    font-size: 1.8em;
  }

  .header-text p {
    font-size: 0.95em;
  }

  .action-group .el-button {
    padding: 8px 12px;
    font-size: 12px;
  }

  .action-group .el-button span {
    display: none;
  }

  .action-group .el-button .el-icon {
    margin: 0 !important;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 16px 12px;
  }

  .header-text h1 {
    font-size: 1.5em;
  }

  .header-text p {
    font-size: 0.9em;
  }

  .action-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .action-group .el-button {
    border-radius: 6px;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .header {
    background: linear-gradient(135deg, #434343 0%, #000000 100%);
  }
}

/* 打印样式 */
@media print {
  .header-actions {
    display: none;
  }
}
</style>
