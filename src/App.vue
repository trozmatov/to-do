<script setup>
/**
 * Asosiy ilova komponenti (App.vue).
 * - IndexedDB bazasini ishga tushiradi (xatolikda xotiradagi rejim ogohlantirishini ko'rsatadi)
 * - Pinia store'larni (settings, projects, tasks) yuklaydi
 * - /widget sahifasida bo'lsa Sidebar ko'rsatilmaydi
 * - 30 kunlik zaxira eslatmasi banneri
 * - ToastHost, UpdateToast va InstallPrompt modallari
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { initDB } from '@/services/db'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import Sidebar from '@/components/Sidebar.vue'
import ToastHost from '@/components/ToastHost.vue'
import UpdateToast from '@/components/UpdateToast.vue'
import InstallPrompt from '@/components/InstallPrompt.vue'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

const isReady = ref(false)
const installModalOpen = ref(false)

// Widget sahifasida Sidebar ko'rsatilmaydi
const isWidgetMode = computed(() => route.name === 'widget')

onMounted(async () => {
  // 1. IndexedDB ni ochamiz
  const status = await initDB()
  uiStore.storage = status

  // 2. Do'konlarni yuklaymiz
  await settingsStore.load()
  await projectsStore.load()
  await tasksStore.load()

  isReady.value = true
})
</script>

<template>
  <div class="app-container" :class="{ 'widget-mode': isWidgetMode }">
    <!-- Yuklanish holati -->
    <div v-if="!isReady" class="app-loading-screen">
      <div class="loader-spinner"></div>
      <p class="loading-text">Yuklanmoqda...</p>
    </div>

    <template v-else>
      <!-- Xotiradagi (vaqtincha) rejim ogohlantirish banneri -->
      <aside
        v-if="uiStore.storage.mode === 'memory'"
        class="system-banner warning"
        role="alert"
      >
        <AppIcon name="alert" :size="18" />
        <span class="banner-text">
          <strong>Diqqat:</strong> Brauzeringizda IndexedDB ishlamayapti (inkognito rejim bo'lishi mumkin). Ma'lumotlar vaqtincha xotirada saqlanadi va sahifa yopilganda o'chib ketadi.
        </span>
      </aside>

      <!-- 30 kunlik zaxira eslatmasi banneri -->
      <aside
        v-if="settingsStore.backupReminderDue && !uiStore.backupBannerDismissed && !isWidgetMode"
        class="system-banner info"
        role="status"
      >
        <AppIcon name="info" :size="18" />
        <span class="banner-text">
          Oxirgi zaxira olinganiga 30 kundan oshdi. Ma'lumotlaringiz xavfsizligi uchun zaxira nusxasini oling.
        </span>
        <div class="banner-actions">
          <router-link to="/settings" class="btn btn-sm btn-primary">
            Zaxira olish
          </router-link>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            aria-label="Yopish"
            @click="uiStore.backupBannerDismissed = true"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </div>
      </aside>

      <!-- Asosiy sxema -->
      <div class="app-layout">
        <!-- Sidebar (faqat to'liq ilovada) -->
        <Sidebar
          v-if="!isWidgetMode"
          @open-install="installModalOpen = true"
        />

        <!-- Asosiy ko'rinish -->
        <div class="app-main-content">
          <router-view />
        </div>
      </div>

      <!-- Toast xabarlari -->
      <ToastHost />

      <!-- PWA yangilanish xabari -->
      <UpdateToast />

      <!-- PWA o'rnatish modal oynasi -->
      <InstallPrompt
        :open="installModalOpen"
        @close="installModalOpen = false"
      />
    </template>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-loading-screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg);
}

.loader-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid var(--border-strong);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
}

/* Tizim bannerlari */
.system-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 18px;
  font-size: 13.5px;
  line-height: 1.4;
  z-index: 60;
  position: relative;
}

.system-banner.warning {
  background: var(--danger-soft);
  color: var(--danger);
  border-bottom: 1px solid var(--danger);
}

.system-banner.info {
  background: var(--accent-soft);
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.banner-text {
  flex: 1;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Layout */
.app-layout {
  display: flex;
  flex: 1;
  min-height: 100dvh;
}

.app-main-content {
  flex: 1;
  min-width: 0;
  margin-left: var(--sidebar-w);
  transition: margin-left 0.3s var(--ease);
}

.widget-mode .app-main-content {
  margin-left: 0;
}

@media (max-width: 900px) {
  .app-main-content {
    margin-left: 0;
  }
}
</style>
