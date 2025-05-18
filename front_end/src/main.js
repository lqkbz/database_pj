import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router/router.js'
import App from './App.vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

const app = createApp(App)

// 注册Element Plus
app.use(ElementPlus, {
  locale: zhCn
})

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册pinia持久化插件
app.use(piniaPluginPersistedstate)
const pinia = createPinia()
app.use(pinia)
// 注册路由
app.use(router)

app.mount('#app')
