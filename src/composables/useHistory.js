import { computed, ref } from 'vue'

/**
 * 增强的历史记录管理 - 支持撤销/重做堆栈
 * @param {number} maxHistory - 最大历史记录数量
 */
export function useHistory(maxHistory = 50) {
  // 撤销栈
  const undoStack = ref([])
  // 重做栈
  const redoStack = ref([])
  // 当前状态
  const currentState = ref(null)

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  const historyCount = computed(() => undoStack.value.length)

  /**
   * 添加新状态到历史记录
   * @param {any} state - 要保存的状态
   * @param {string} description - 状态描述
   */
  const addToHistory = (state, description = '') => {
    if (!state) return

    // 如果当前状态存在，先保存到撤销栈
    if (currentState.value !== null) {
      const stateEntry = {
        state: currentState.value,
        description: description || '操作',
        timestamp: Date.now()
      }

      undoStack.value.push(stateEntry)

      // 限制历史记录数量
      if (undoStack.value.length > maxHistory) {
        undoStack.value.shift()
      }
    }

    // 更新当前状态
    currentState.value = state

    // 添加新状态后，清空重做栈
    redoStack.value = []
  }

  /**
   * 撤销操作
   * @returns {any} 撤销后的状态
   */
  const undo = () => {
    if (undoStack.value.length === 0) {
      return null
    }

    // 将当前状态保存到重做栈
    if (currentState.value !== null) {
      redoStack.value.push({
        state: currentState.value,
        description: '当前状态',
        timestamp: Date.now()
      })
    }

    // 从撤销栈中取出上一个状态
    const previousEntry = undoStack.value.pop()
    currentState.value = previousEntry.state

    return previousEntry.state
  }

  /**
   * 重做操作
   * @returns {any} 重做后的状态
   */
  const redo = () => {
    if (redoStack.value.length === 0) {
      return null
    }

    // 将当前状态保存到撤销栈
    if (currentState.value !== null) {
      undoStack.value.push({
        state: currentState.value,
        description: '当前状态',
        timestamp: Date.now()
      })
    }

    // 从重做栈中取出状态
    const nextEntry = redoStack.value.pop()
    currentState.value = nextEntry.state

    return nextEntry.state
  }

  /**
   * 清空所有历史记录
   */
  const clear = () => {
    undoStack.value = []
    redoStack.value = []
    currentState.value = null
  }

  /**
   * 获取历史记录列表（用于显示）
   * @returns {Array} 历史记录数组
   */
  const getHistoryList = () => {
    return undoStack.value.map((entry, index) => ({
      index,
      description: entry.description,
      timestamp: new Date(entry.timestamp).toLocaleTimeString()
    }))
  }

  /**
   * 跳转到指定的历史记录
   * @param {number} index - 历史记录索引
   * @returns {any} 跳转后的状态
   */
  const jumpToHistory = (index) => {
    if (index < 0 || index >= undoStack.value.length) {
      return null
    }

    // 将当前状态和之后的状态移到重做栈
    const itemsToMove = undoStack.value.splice(index + 1)

    if (currentState.value !== null) {
      redoStack.value = [
        { state: currentState.value, description: '当前状态', timestamp: Date.now() },
        ...itemsToMove
      ]
    } else {
      redoStack.value = itemsToMove
    }

    // 设置目标状态为当前状态
    const targetEntry = undoStack.value.pop()
    currentState.value = targetEntry.state

    return targetEntry.state
  }

  /**
   * 获取当前状态
   * @returns {any} 当前状态
   */
  const getCurrentState = () => currentState.value

  return {
    // 状态
    undoStack,
    redoStack,
    currentState,

    // 计算属性
    canUndo,
    canRedo,
    historyCount,

    // 方法
    addToHistory,
    undo,
    redo,
    clear,
    getHistoryList,
    jumpToHistory,
    getCurrentState,
  }
}
