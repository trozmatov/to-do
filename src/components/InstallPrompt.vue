<script setup>
/**
 * PWA o'rnatish modali:
 * - Chrome/Android/Windows: tizim o'rnatish tugmasi
 * - iOS Safari: "Ulashish -> Asosiy ekranga qo'shish" qadam-baqadam yo'riqnomasi
 * - macOS Safari: "Fayl -> Dock'ka qo'shish" yo'riqnomasi
 * - Alohida xotira (storage isolation) haqida ogohlantirish
 */
import { ref } from 'vue'
import { useInstallPrompt } from '@/composables/useInstallPrompt'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const { canPrompt, platform, promptInstall, isStandalone } = useInstallPrompt()

const busy = ref(false)

async function handleInstallClick() {
  busy.value = true
  await promptInstall()
  busy.value = false
  emit('close')
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Ilovani o'rnatish"
    width="500px"
    @close="emit('close')"
  >
    <div class="install-modal-content">
      <div class="app-card-preview">
        <img
          src="/pwa-192.png"
          alt="Vazifalar ilovasi belgisi"
          class="app-logo"
          width="56"
          height="56"
        />
        <div class="app-info">
          <h3 class="app-name">Vazifalar</h3>
          <p class="app-meta">Oflayn rejimda ishlovchi mustaqil ilova</p>
        </div>
      </div>

      <!-- Agar allaqachon o'rnatilgan standalone bo'lsa -->
      <div v-if="isStandalone" class="installed-banner">
        <AppIcon name="shield" :size="20" />
        <span>Ilova allaqachon mustaqil rejimda ishlamoqda.</span>
      </div>

      <!-- 1. Chrome / Edge / Android / Windows (BeforeInstallPrompt qo'llab-quvvatlaydi) -->
      <div v-else-if="canPrompt" class="prompt-section">
        <p class="install-text">
          Ilovani kompyuter yoki telefoningizga o'rnatib, internet yo'qligida ham alohida oyna sifatida ishlatishingiz mumkin.
        </p>
        <button
          type="button"
          class="btn btn-primary btn-block install-action-btn"
          :disabled="busy"
          @click="handleInstallClick"
        >
          <AppIcon name="download" :size="18" />
          <span>Hozir o'rnatish</span>
        </button>
      </div>

      <!-- 2. iOS (iPhone / iPad) Safari yo'riqnomasi -->
      <div v-else-if="platform === 'ios'" class="guide-section">
        <p class="guide-intro">
          iPhone yoki iPad Safari brauzerida o'rnatish uchun quyidagi qadamlarni bajaring:
        </p>

        <ol class="steps-list">
          <li class="step-item">
            <span class="step-num">1</span>
            <div class="step-content">
              <span>Safari pastki panelidagi <strong>"Ulashish" (Share)</strong> tugmasini bosing:</span>
              <span class="step-icon-badge"><AppIcon name="share" :size="16" /></span>
            </div>
          </li>
          <li class="step-item">
            <span class="step-num">2</span>
            <div class="step-content">
              <span>Menyuni pastga surib, <strong>"Asosiy ekranga" (Add to Home Screen)</strong> bandini tanlang.</span>
            </div>
          </li>
          <li class="step-item">
            <span class="step-num">3</span>
            <div class="step-content">
              <span>Yuqori o'ng burchakdagi <strong>"Qo'shish" (Add)</strong> tugmasini bosing.</span>
            </div>
          </li>
        </ol>

        <div class="ios-warning-alert">
          <AppIcon name="alert" :size="18" class="warning-icon" />
          <div class="alert-text">
            <strong>Muhim eslatma (iOS):</strong>
            <p>
              iOS tizimida "Asosiy ekranga qo'shilgan" ilova Safari brauzeridagi sahifadan alohida xotiraga (IndexedDB) ega bo'lishi mumkin. Agar avval Safari'da vazifalar yozgan bo'lsangiz, Sozlamalar bo'limidan <strong>Zaxira eksport</strong> qilib, o'rnatilgan ilovaga <strong>import</strong> qilishingiz mumkin.
            </p>
          </div>
        </div>
      </div>

      <!-- 3. macOS Safari yo'riqnomasi -->
      <div v-else-if="platform === 'mac-safari' || platform === 'mac'" class="guide-section">
        <p class="guide-intro">
          macOS Safari brauzerida ilovani Dock'ka o'rnatish:
        </p>
        <ol class="steps-list">
          <li class="step-item">
            <span class="step-num">1</span>
            <div class="step-content">
              <span>Safari menyusidan <strong>Fayl (File)</strong> bo'limini oching.</span>
            </div>
          </li>
          <li class="step-item">
            <span class="step-num">2</span>
            <div class="step-content">
              <span><strong>"Dock'ka qo'shish..." (Add to Dock...)</strong> bandini tanlang.</span>
            </div>
          </li>
          <li class="step-item">
            <span class="step-num">3</span>
            <div class="step-content">
              <span>"Qo'shish" tugmasini bosing. Ilova Dock'da paydo bo'ladi va mustaqil oyna sifatida ochiladi.</span>
            </div>
          </li>
        </ol>
      </div>

      <!-- 4. Boshqa brauzerlar -->
      <div v-else class="guide-section">
        <p class="guide-intro">
          Ilovani o'rnatish uchun brauzeringiz menyusini (⋮ yoki ⋯) oching va <strong>"Ilovani o'rnatish" (Install app)</strong> yoki <strong>"Bosh ekranga qo'shish"</strong> bandini tanlang.
        </p>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="emit('close')">
        Yopish
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.install-modal-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.app-card-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--surface-2);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.app-logo {
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.app-name {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}

.app-meta {
  font-size: 13px;
  color: var(--text-2);
}

.installed-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--success-soft);
  color: var(--success);
  font-weight: 600;
  font-size: 14px;
}

.prompt-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.install-text {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.5;
}

.install-action-btn {
  height: 46px;
  font-size: 15px;
}

.btn-block {
  width: 100%;
}

.guide-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-intro {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--text);
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
  margin-top: 1px;
}

.step-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.step-icon-badge {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--accent);
}

.ios-warning-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--warning-soft);
  color: var(--text);
  font-size: 12.5px;
  line-height: 1.45;
  border: 1px solid var(--warning);
}

.warning-icon {
  color: var(--warning);
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-text p {
  margin-top: 4px;
  color: var(--text-2);
}
</style>
