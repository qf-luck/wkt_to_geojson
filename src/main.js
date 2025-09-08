import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/global.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue错误:', err)
  console.error('组件:', vm)
  console.error('错误信息:', info)
}

// 全局警告处理
app.config.warnHandler = (msg, vm, trace) => {
  console.warn('Vue警告:', msg)
  console.warn('组件:', vm)
  console.warn('追踪:', trace)
}

app.use(ElementPlus)

// 注册图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
