import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './assets/style/index.css'

// 创建 Vue 根应用实例，作为整个前端项目的运行入口。
const app = createApp(App)

// 先挂载状态管理，再挂载路由，保证页面初始化时能读取会话与权限数据。
app.use(createPinia())
app.use(router)

// 把应用挂到页面根节点，前端正式启动。
app.mount('#app')
