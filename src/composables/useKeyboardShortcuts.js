import { onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 键盘快捷键管理
 * @param {Object} handlers - 快捷键处理函数映射
 */
export function useKeyboardShortcuts(handlers = {}) {
  // 默认快捷键映射
  const defaultShortcuts = {
    // 通用操作
    'ctrl+z': 'undo', // 撤销
    'ctrl+y': 'redo', // 重做
    'ctrl+shift+z': 'redo', // 重做(替代)
    'ctrl+c': 'copy', // 复制
    'ctrl+v': 'paste', // 粘贴
    'ctrl+x': 'cut', // 剪切
    'delete': 'delete', // 删除
    'escape': 'escape', // 取消/退出

    // 选择操作
    'ctrl+a': 'selectAll', // 全选
    'ctrl+d': 'deselectAll', // 取消选择

    // 视图操作
    'ctrl+f': 'fit', // 适应视图
    'ctrl++': 'zoomIn', // 放大
    'ctrl+-': 'zoomOut', // 缩小
    'ctrl+0': 'resetZoom', // 重置缩放

    // 文件操作
    'ctrl+s': 'save', // 保存
    'ctrl+o': 'open', // 打开
    'ctrl+e': 'export', // 导出

    // 工具切换
    '1': 'toolMarker', // 标记工具
    '2': 'toolLine', // 线条工具
    '3': 'toolPolygon', // 多边形工具
    '4': 'toolRectangle', // 矩形工具
    '5': 'toolCircle', // 圆形工具

    // 帮助
    '?': 'showHelp', // 显示帮助
    'f1': 'showHelp', // 显示帮助
  }

  // 快捷键提示信息
  const shortcutDescriptions = {
    // 通用操作
    'undo': '撤销上一步操作',
    'redo': '重做',
    'copy': '复制选中的图形',
    'paste': '粘贴图形',
    'cut': '剪切选中的图形',
    'delete': '删除选中的图形',
    'escape': '取消当前操作',

    // 选择操作
    'selectAll': '选择所有图形',
    'deselectAll': '取消所有选择',

    // 视图操作
    'fit': '适应地图视图',
    'zoomIn': '放大地图',
    'zoomOut': '缩小地图',
    'resetZoom': '重置地图缩放',

    // 文件操作
    'save': '保存当前数据',
    'open': '打开文件',
    'export': '导出数据',

    // 工具
    'toolMarker': '切换到标记工具',
    'toolLine': '切换到线条工具',
    'toolPolygon': '切换到多边形工具',
    'toolRectangle': '切换到矩形工具',
    'toolCircle': '切换到圆形工具',

    // 帮助
    'showHelp': '显示快捷键帮助',
  }

  /**
   * 规范化快捷键字符串
   */
  const normalizeShortcut = (e) => {
    const keys = []

    if (e.ctrlKey || e.metaKey) keys.push('ctrl')
    if (e.shiftKey) keys.push('shift')
    if (e.altKey) keys.push('alt')

    const key = e.key.toLowerCase()
    if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
      keys.push(key)
    }

    return keys.join('+')
  }

  /**
   * 检查是否应该忽略快捷键
   */
  const shouldIgnoreShortcut = (e) => {
    // 在输入框、文本域等元素中忽略快捷键
    const tagName = e.target.tagName.toLowerCase()
    const isEditable = e.target.isContentEditable

    if (isEditable || tagName === 'input' || tagName === 'textarea') {
      // 但允许某些快捷键（如Ctrl+A, Ctrl+C等）在输入框中工作
      const allowedInInputs = ['ctrl+a', 'ctrl+c', 'ctrl+v', 'ctrl+x', 'ctrl+z', 'ctrl+y']
      const shortcut = normalizeShortcut(e)
      return !allowedInInputs.includes(shortcut)
    }

    return false
  }

  /**
   * 键盘事件处理
   */
  const handleKeyDown = (e) => {
    if (shouldIgnoreShortcut(e)) {
      return
    }

    const shortcut = normalizeShortcut(e)
    const action = defaultShortcuts[shortcut]

    if (action && handlers[action]) {
      // 阻止默认行为
      e.preventDefault()
      e.stopPropagation()

      try {
        handlers[action](e)
      } catch (error) {
        console.error(`执行快捷键 ${shortcut} (${action}) 失败:`, error)
        ElMessage.error(`快捷键操作失败: ${error.message}`)
      }
    }
  }

  /**
   * 显示快捷键帮助
   */
  const showShortcutHelp = () => {
    const helpContent = Object.entries(defaultShortcuts)
      .map(([shortcut, action]) => {
        const description = shortcutDescriptions[action] || action
        return `${shortcut.toUpperCase()}: ${description}`
      })
      .join('\n')

    ElMessage({
      message: `快捷键帮助:\n\n${helpContent}`,
      type: 'info',
      duration: 0,
      showClose: true,
      dangerouslyUseHTMLString: false
    })
  }

  /**
   * 获取快捷键列表
   */
  const getShortcutList = () => {
    return Object.entries(defaultShortcuts).map(([shortcut, action]) => ({
      shortcut: shortcut.toUpperCase(),
      action,
      description: shortcutDescriptions[action] || action
    }))
  }

  // 设置帮助处理器
  if (!handlers.showHelp) {
    handlers.showHelp = showShortcutHelp
  }

  // 生命周期
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    console.log('键盘快捷键已启用')
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown, true)
    console.log('键盘快捷键已禁用')
  })

  return {
    getShortcutList,
    showShortcutHelp,
    shortcutDescriptions
  }
}
