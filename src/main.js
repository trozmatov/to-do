import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Mahalliy Inter shrifti (oflayn ishlash uchun)
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

// Dizayn tizimi va global stillar
import './assets/main.css'

// PWA o'rnatish hodisasini sahifa yuklanishi bilan iloji boricha erta tinglash
import { listenInstallPrompt } from './composables/useInstallPrompt'
listenInstallPrompt()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
