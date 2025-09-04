import { computed, ref } from 'vue'

export function useHistory(maxHistory = 20) {
  const history = ref([])

  const canUndo = computed(() => history.value.length > 0)

  const addToHistory = (value) => {
    if (value && value.trim() !== '') {
      // 避免重复添加相同的值
      if (history.value[history.value.length - 1] !== value) {
        history.value.push(value)

        // 限制历史记录数量
        if (history.value.length > maxHistory) {
          history.value.shift()
        }
      }
    }
  }

  const undo = () => {
    if (history.value.length > 0) {
      return history.value.pop()
    }
    return null
  }

  const clear = () => {
    history.value = []
  }

  return {
    history,
    canUndo,
    addToHistory,
    undo,
    clear,
  }
}
