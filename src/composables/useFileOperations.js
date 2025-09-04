import { ElMessage } from 'element-plus'

export function useFileOperations() {
  // 复制到剪贴板
  const copyToClipboard = async (text) => {
    if (!text) {
      ElMessage.warning('没有内容可复制')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制到剪贴板')
    } catch (e) {
      // 降级方案
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        ElMessage.success('已复制到剪贴板')
      } catch (fallbackError) {
        ElMessage.error('复制失败，请手动复制')
      }
    }
  }

  // 保存到文件
  const saveToFile = (text, filename) => {
    if (!text) {
      ElMessage.warning('没有内容可保存')
      return
    }

    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      ElMessage.success(`文件"${filename}"已保存`)
    } catch (e) {
      ElMessage.error('保存失败：' + e.message)
    }
  }

  // 读取文件内容
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('文件大小不能超过10MB'))
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        resolve(e.target.result)
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsText(file, 'utf-8')
    })
  }

  return {
    copyToClipboard,
    saveToFile,
    readFileContent,
  }
}
