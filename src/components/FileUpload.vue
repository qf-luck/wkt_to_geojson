<template>
  <el-upload :show-file-list="false" :before-upload="handleFileUpload" :accept="accept">
    <el-button size="small">📁 导入</el-button>
  </el-upload>
</template>

<script setup>
import { ElMessage } from 'element-plus'

// Props
defineProps({
  accept: {
    type: String,
    default: '*',
  },
})

// Emits
const emit = defineEmits(['file-loaded'])

// 方法
const handleFileUpload = (file) => {
  if (file.size > 10 * 1024 * 1024) {
    // 10MB限制
    ElMessage.error('文件大小不能超过10MB')
    return false
  }

  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const content = e.target.result
      emit('file-loaded', content)
      ElMessage.success(`文件"${file.name}"导入成功`)
    } catch (error) {
      ElMessage.error(`文件读取失败：${error.message}`)
    }
  }

  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }

  reader.readAsText(file, 'utf-8')
  return false // 阻止自动上传
}
</script>
