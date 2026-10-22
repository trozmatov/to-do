import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // Yangi versiya chiqqanda avtomatik emas, foydalanuvchi "Yangilash"ni bosganda almashadi
      registerType: 'prompt',
      // Service worker'ni o'zimiz ro'yxatdan o'tkazamiz (UpdateToast.vue -> useRegisterSW)
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Vazifalar — To-Do',
        short_name: 'Vazifalar',
        description: "Oflayn ishlaydigan vazifalar ro'yxati: kunlik, haftalik, oylik va yillik rejalar.",
        lang: 'uz',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#4f46e5',
        background_color: '#f5f6fb',
        categories: ['productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Chrome/Edge: ilova ikonkasini o'ng tugma bilan bosganda chiqadigan tezkor havolalar
        shortcuts: [
          {
            name: 'Bugun (widget)',
            short_name: 'Widget',
            url: '/widget',
            icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // App shell: barcha statik fayllar oldindan keshlanadi -> ilova oflayn ochiladi
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Dev rejimda SW o'chiq (keshlash chalkashligining oldini olish uchun)
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
