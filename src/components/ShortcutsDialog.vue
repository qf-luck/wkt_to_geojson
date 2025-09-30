<template>
  <el-dialog
    v-model="visible"
    title="⌨️ 键盘快捷键"
    width="700px"
    :close-on-click-modal="true"
    class="shortcuts-dialog"
  >
    <div class="shortcuts-content">
      <el-alert
        title="提示"
        type="info"
        :closable="false"
        show-icon
        class="tip-alert"
      >
        <template #default>
          按 <kbd>?</kbd> 或 <kbd>F1</kbd> 可随时打开此帮助面板
        </template>
      </el-alert>

      <el-tabs v-model="activeTab" class="shortcuts-tabs">
        <!-- 通用操作 -->
        <el-tab-pane label="📋 通用操作" name="general">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>Z</kbd>
              </div>
              <div class="shortcut-desc">撤销上一步操作</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>Y</kbd>
              </div>
              <div class="shortcut-desc">重做</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>C</kbd>
              </div>
              <div class="shortcut-desc">复制选中的图形</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>V</kbd>
              </div>
              <div class="shortcut-desc">粘贴图形</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>X</kbd>
              </div>
              <div class="shortcut-desc">剪切选中的图形</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Delete</kbd>
              </div>
              <div class="shortcut-desc">删除选中的图形</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Escape</kbd>
              </div>
              <div class="shortcut-desc">取消当前操作</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 选择操作 -->
        <el-tab-pane label="✅ 选择操作" name="selection">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>A</kbd>
              </div>
              <div class="shortcut-desc">选择所有图形</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>D</kbd>
              </div>
              <div class="shortcut-desc">取消所有选择</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>Click</kbd>
              </div>
              <div class="shortcut-desc">多选图形</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Double Click</kbd>
              </div>
              <div class="shortcut-desc">查看图形属性</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 视图操作 -->
        <el-tab-pane label="🔍 视图操作" name="view">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>F</kbd>
              </div>
              <div class="shortcut-desc">适应地图视图</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>+</kbd>
              </div>
              <div class="shortcut-desc">放大地图</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>-</kbd>
              </div>
              <div class="shortcut-desc">缩小地图</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>0</kbd>
              </div>
              <div class="shortcut-desc">重置地图缩放</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 文件操作 -->
        <el-tab-pane label="📁 文件操作" name="file">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>S</kbd>
              </div>
              <div class="shortcut-desc">保存当前数据</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>O</kbd>
              </div>
              <div class="shortcut-desc">打开文件</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>Ctrl</kbd> + <kbd>E</kbd>
              </div>
              <div class="shortcut-desc">导出数据</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 绘图工具 -->
        <el-tab-pane label="✏️ 绘图工具" name="tools">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>1</kbd>
              </div>
              <div class="shortcut-desc">切换到标记工具</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>2</kbd>
              </div>
              <div class="shortcut-desc">切换到线条工具</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>3</kbd>
              </div>
              <div class="shortcut-desc">切换到多边形工具</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>4</kbd>
              </div>
              <div class="shortcut-desc">切换到矩形工具</div>
            </div>

            <div class="shortcut-item">
              <div class="shortcut-keys">
                <kbd>5</kbd>
              </div>
              <div class="shortcut-desc">切换到圆形工具</div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-divider />

      <div class="tips-section">
        <h4>💡 使用技巧</h4>
        <ul class="tips-list">
          <li>在输入框中时，部分快捷键可能不会生效</li>
          <li>按住 <kbd>Shift</kbd> 键可以绘制规则图形</li>
          <li>右键点击图形可以打开上下文菜单</li>
          <li>使用鼠标滚轮可以缩放地图</li>
          <li>按住鼠标左键可以拖动地图</li>
        </ul>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="visible = false">我知道了</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// 响应式数据
const activeTab = ref('general')

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<style scoped>
.shortcuts-dialog {
  .el-dialog__body {
    padding: 20px !important;
  }
}

.shortcuts-content {
  max-height: 70vh;
  overflow-y: auto;
}

.tip-alert {
  margin-bottom: 20px;
}

.shortcuts-tabs {
  margin-bottom: 20px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.shortcut-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

kbd {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-weight: 600;
  line-height: 1;
  color: #495057;
  background: linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%);
  border: 1px solid #adb5bd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1),
              inset 0 -2px 0 rgba(0, 0, 0, 0.1);
  text-transform: uppercase;
  white-space: nowrap;
}

.shortcut-desc {
  flex: 1;
  text-align: right;
  color: #495057;
  font-size: 14px;
  font-weight: 500;
}

.tips-section {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.tips-section h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: #495057;
  line-height: 1.8;
}

.tips-list li {
  margin-bottom: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .shortcuts-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .shortcut-desc {
    text-align: left;
  }

  kbd {
    font-size: 11px;
    padding: 3px 6px;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .shortcut-item {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(51, 65, 85, 0.6) 100%);
    border-color: rgba(255, 255, 255, 0.1);
  }

  kbd {
    color: #e0e6ed;
    background: linear-gradient(135deg, rgba(51, 65, 85, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .shortcut-desc {
    color: #e0e6ed;
  }

  .tips-section {
    background: rgba(30, 41, 59, 0.6);
    border-color: #409eff;
  }

  .tips-section h4 {
    color: #e0e6ed;
  }

  .tips-list {
    color: #e0e6ed;
  }
}

/* 滚动条样式 */
.shortcuts-content::-webkit-scrollbar {
  width: 8px;
}

.shortcuts-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.shortcuts-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.shortcuts-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>