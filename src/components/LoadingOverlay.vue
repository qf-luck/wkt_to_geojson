<template>
  <div class="global-loading">
    <div class="loading-spinner"></div>
    <p>{{ message || '加载中...' }}</p>
  </div>
</template>

<script setup>
// Props
defineProps({
  message: String,
})
</script>

<style scoped>
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.global-loading p {
  margin-top: 16px;
  font-size: 16px;
  color: #409eff;
  font-weight: 500;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
