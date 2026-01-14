import { createApp } from 'vue'
import './assets/main.css'
import './assets/editors.css'
import App from './App.vue'
import { initTheme } from './composables/useTheme'

// 初始化主题 (在 app 挂载前)
initTheme()

createApp(App).mount('#app')

