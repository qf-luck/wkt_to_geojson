<template>
  <div class="header">
    <h1>GeoJSON & WKT 转换工具</h1>
    <p>支持在线编辑、可视化绘制和格式转换</p>
  </div>
</template>

<script setup>
// 纯展示组件，无需逻辑
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 2.2em;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.header p {
  margin: 0;
  font-size: 1.1em;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .header {
    padding: 24px 16px;
  }

  .header h1 {
    font-size: 1.8em;
  }
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 1.6em;
  }
}
</style>
