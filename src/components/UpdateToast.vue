<script setup>
/**
 * Service Worker yangilanganda chiquvchi toast bildirishnomasi.
 * Foydalanuvchi "Yangilash" tugmasini bosganda yangi SW faollashadi va sahifa yangilanadi.
 */
import { useRegisterSW } from 'virtual:pwa-register/vue'
import AppIcon from './AppIcon.vue'

// vite-plugin-pwa orqali SW registratsiyasi
const { needRefresh, updateServiceWorker } = useRegisterSW()

function handleUpdate() {
  updateServiceWorker()
}

function handleDismiss() {
  needRefresh.value = false
}
</script>

<template>
  <Transition name="toast">
    <div v-if="needRefresh" class="update-toast" role="alert">
      <div class="toast-content">
        <span class="update-icon"><AppIcon name="refresh" :size="18" /></span>
        <div class="update-text">
          <strong class="update-title">Yangi versiya mavjud</strong>
          <span class="update-desc">Ilovani yangilash uchun tugmani bosing</span>
        </div>
      </div>

      <div class="update-actions">
        <button
          type="button"
          class="btn btn-sm btn-primary update-btn"
          @click="handleUpdate"
        >
          Yangilash
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost close-btn"
          aria-label="Yopish"
          @click="handleDismiss"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-toast {
  position: fixed;
  top: calc(16px + var(--safe-top));
  right: 16px;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: var(--radius);
  background: var(--bg-elev);
  border: 1px solid var(--accent);
  box-shadow: var(--shadow-lg), 0 0 0 1px var(--accent);
  max-width: 420px;
  width: calc(100vw - 32px);
  animation: slide-up 0.3s var(--ease-spring);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.update-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.update-title {
  font-size: 13.5px;
  color: var(--text);
  font-weight: 700;
}

.update-desc {
  font-size: 12px;
  color: var(--text-2);
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.update-btn {
  font-weight: 700;
  padding: 0 14px;
}

.close-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: 8px;
}

@media (max-width: 640px) {
  .update-toast {
    left: 16px;
    right: 16px;
    top: calc(12px + var(--safe-top));
    max-width: none;
  }
}
</style>
