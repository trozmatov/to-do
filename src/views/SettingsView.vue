<script setup>
/**
 * Sozlamalar va Zaxira sahifasi (SettingsView).
 * - Mavzu: Tizim / Yorug' / Qorong'i
 * - Standart saralash tartibi (Qo'lda / Muhimlik)
 * - Xotira va Doimiy saqlash (storage.persist, storage.estimate)
 * - JSON Zaxira eksport va import (Almashtirish yoki Birlashtirish rejimi bilan)
 * - 30 kunlik zaxira eslatmasi
 * - macOS Widget darajasi (8a PWA, 8b Tauri, 8c WidgetKit) va platforma qo'llanmalari
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import {
  exportData,
  validateBackup,
  importData,
  getStorageStatus,
} from '@/services/db'
import BaseModal from '@/components/BaseModal.vue'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

const storageStatus = getStorageStatus()
const fileInput = ref(null)

// Import modali
const importModalOpen = ref(false)
const importFileSummary = ref(null)
const importValidatedData = ref(null)
const importMode = ref('merge') // 'replace' | 'merge' (default: c tanlovi asosida)
const isImporting = ref(false)

// Mavzu variantlari
const themeOptions = [
  { value: 'system', label: 'Tizim', icon: 'monitor' },
  { value: 'light', label: "Yorug'", icon: 'sun' },
  { value: 'dark', label: "Qorong'i", icon: 'moon' },
]

// Saralash variantlari
const sortOptions = [
  { value: 'manual', label: "Qo'lda tartib" },
  { value: 'priority', label: 'Muhimlik bo\u02BBricha' },
]

// Zaxira sanasi formati
const formattedLastBackup = computed(() => {
  if (!settingsStore.lastBackupAt) return "Hozircha zaxira olinmagan"
  const d = new Date(settingsStore.lastBackupAt)
  return `${d.toLocaleDateString('uz-UZ')} ${d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`
})

// Xotira hajmi
const formattedStorageUsage = computed(() => {
  const est = settingsStore.storageEstimate
  if (!est || !est.usage) return "Noma'lum"
  const kb = est.usage / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
})

// Doimiy saqlash holati matni
const persistStatusText = computed(() => {
  if (settingsStore.persisted === true) return "Faol (himoyalangan)"
  if (settingsStore.persisted === false) return "Nofaol (brauzer tozalashi mumkin)"
  if (settingsStore.persisted === 'unsupported') return "Brauzer qo'llab-quvvatlamaydi"
  return "Tekshirilmoqda..."
})

// 1. Zaxira eksport qilish
async function handleExport() {
  try {
    const backup = await exportData()
    const jsonStr = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const dateStr = new Date().toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = url
    a.download = `vazifalar-zaxira-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    await settingsStore.markBackup()
    uiStore.notify("Zaxira nusxasi muvaffaqiyatli yuklab olindi", { type: 'success' })
  } catch (err) {
    uiStore.notify("Zaxira olishda xatolik yuz berdi", { type: 'error' })
  }
}

// 2. Fayl tanlanganda tekshirish
function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const text = e.target?.result
    const result = validateBackup(text)

    if (!result.ok) {
      uiStore.notify(result.errors.join(' '), { type: 'error', timeout: 8000 })
      event.target.value = ''
      return
    }

    importValidatedData.value = result.data
    importFileSummary.value = result.summary
    importMode.value = 'merge'
    importModalOpen.value = true
    event.target.value = ''
  }
  reader.readAsText(file)
}

// 3. Importni tasdiqlash
async function confirmImport() {
  if (!importValidatedData.value) return
  isImporting.value = true

  try {
    const res = await importData(importValidatedData.value, importMode.value)
    // Qayta yuklash
    await projectsStore.load()
    await tasksStore.load()

    importModalOpen.value = false
    importValidatedData.value = null
    importFileSummary.value = null

    if (importMode.value === 'replace') {
      uiStore.notify("Ma'lumotlar zaxiradan to'liq tiklandi", { type: 'success' })
    } else {
      uiStore.notify(
        `Zaxira birlashtirildi: +${res.added} ta yangi, ${res.updated} ta yangilandi`,
        { type: 'success' },
      )
    }
  } catch (err) {
    uiStore.notify("Import qilishda xatolik yuz berdi", { type: 'error' })
  } finally {
    isImporting.value = false
  }
}

async function requestPersist() {
  await settingsStore.checkPersistence(true)
  if (settingsStore.persisted === true) {
    uiStore.notify("Doimiy saqlash muvaffaqiyatli yoqildi", { type: 'success' })
  } else {
    uiStore.notify("Brauzer doimiy saqlashga ruxsat bermadi", { type: 'warning' })
  }
}
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <div class="header-inner">
        <button
          type="button"
          class="btn btn-ghost btn-icon back-btn"
          aria-label="Orqaga"
          @click="router.push('/')"
        >
          <AppIcon name="arrow-left" :size="20" />
        </button>
        <h1 class="settings-title">Sozlamalar va Zaxira</h1>
      </div>
    </header>

    <main class="settings-content">
      <!-- 1. Ko'rinish va interfeys -->
      <section class="settings-card card">
        <h2 class="card-section-title">Ko'rinish va Mavzu</h2>

        <div class="setting-item">
          <div class="setting-text">
            <span class="setting-label">Mavzu rejimi</span>
            <span class="setting-desc">Tizimga mos, yorug' yoki qorong'i dizayn</span>
          </div>
          <div class="segmented">
            <button
              v-for="t in themeOptions"
              :key="t.value"
              type="button"
              :class="{ active: settingsStore.theme === t.value }"
              @click="settingsStore.setTheme(t.value)"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-text">
            <span class="setting-label">Vazifalarni saralash</span>
            <span class="setting-desc">Ro'yxatdagi birlamchi tartib</span>
          </div>
          <select
            :value="settingsStore.sortMode"
            class="select select-compact"
            @change="settingsStore.setSortMode($event.target.value)"
          >
            <option v-for="s in sortOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
        </div>
      </section>

      <!-- 2. Ma'lumotlarni saqlash va Xavfsizlik -->
      <section class="settings-card card">
        <h2 class="card-section-title">Xotira va Offline-First</h2>

        <div class="setting-item">
          <div class="setting-text">
            <span class="setting-label">Ma'lumotlar bazasi</span>
            <span class="setting-desc">
              {{ storageStatus.mode === 'idb' ? "IndexedDB (qurilma xotirasida)" : "Xotirada (vaqtincha, sahifa yopilsa o'chadi)" }}
            </span>
          </div>
          <span class="chip" :class="storageStatus.mode === 'idb' ? 'chip-success' : 'chip-danger'">
            {{ storageStatus.mode === 'idb' ? 'IndexedDB' : 'Vaqtincha' }}
          </span>
        </div>

        <div class="setting-item">
          <div class="setting-text">
            <span class="setting-label">Doimiy saqlash (Persistent Storage)</span>
            <span class="setting-desc">Qurilma xotirasi to'lganda brauzer ma'lumotni avtomatik tozalab yubormasligi uchun himoya</span>
          </div>
          <div class="persist-action-wrap">
            <span class="status-badge" :class="{ ok: settingsStore.persisted === true }">
              {{ persistStatusText }}
            </span>
            <button
              v-if="settingsStore.persisted === false"
              type="button"
              class="btn btn-sm btn-secondary"
              @click="requestPersist"
            >
              Ruxsat so'rash
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-text">
            <span class="setting-label">Foydalanilayotgan hajm</span>
            <span class="setting-desc">Ilova kesh va ma'lumotlari</span>
          </div>
          <span class="storage-value">{{ formattedStorageUsage }}</span>
        </div>

        <!-- Muhim izoh -->
        <div class="privacy-notice">
          <AppIcon name="shield" :size="18" class="notice-icon" />
          <p>
            <strong>Maxfiylik va oflayn saqlash:</strong> Barcha ma'lumotlar faqat sizning qurilmangizda (brauzeringiz xotirasida) saqlanadi. Hech qanday ma'lumot tashqi serverga yuborilmaydi. Ma'lumotlarni yo'qotmaslik uchun muntazam ravishda zaxira nusxa oling.
          </p>
        </div>
      </section>

      <!-- 3. Zaxira nusxa (JSON Eksport va Import) -->
      <section class="settings-card card">
        <div class="section-head-with-alert">
          <h2 class="card-section-title">Zaxira nusxa (Backup)</h2>
          <span v-if="settingsStore.backupReminderDue" class="chip chip-danger">
            Oxirgi zaxiradan 30 kundan oshdi!
          </span>
        </div>

        <p class="section-hint">
          Boshqa telefon yoki kompyuterga o'tishda ma'lumotlarni ko'chirish yoki xavfsizlik uchun JSON zaxirasini yuklab oling.
        </p>

        <div class="backup-info-row">
          <span class="backup-lbl">Oxirgi zaxira:</span>
          <span class="backup-val">{{ formattedLastBackup }}</span>
        </div>

        <div class="backup-actions">
          <button
            type="button"
            class="btn btn-primary"
            @click="handleExport"
          >
            <AppIcon name="download" :size="17" />
            <span>Eksport (JSON yuklab olish)</span>
          </button>

          <label class="btn btn-secondary file-input-label">
            <AppIcon name="upload" :size="17" />
            <span>Import (Fayldan tiklash)</span>
            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              class="sr-only"
              @change="handleFileSelect"
            />
          </label>
        </div>
      </section>

      <!-- 4. macOS Widget va Rejalar haqida ma'lumot -->
      <section class="settings-card card">
        <h2 class="card-section-title">macOS Widget va Integratsiya</h2>
        <div class="widget-plans-list">
          <div class="plan-item">
            <div class="plan-badge">Aholat (Joriy)</div>
            <h3 class="plan-title">PWA + Ixcham Widget oynasi (/widget)</h3>
            <p class="plan-desc">
              Safari "Dock'ka qo'shish" yoki Chrome orqali mustaqil ixcham (360×480) oyna sifatida ekranning chekkasida ishlatish mumkin. Loginsiz va to'liq oflayn.
            </p>
          </div>

          <div class="plan-item">
            <div class="plan-badge secondary">Reja (Tauri)</div>
            <h3 class="plan-title">Tauri Menu-Bar (Tray) Mini-Ilova</h3>
            <p class="plan-desc">
              Rust + Tauri yordamida macOS yuqori menyu panelida (menu-bar) ikonka paydo bo'ladi. Bosilganda mini `/widget` darchasi ochiladi.
            </p>
          </div>

          <div class="plan-item">
            <div class="plan-badge secondary">Reja (Native Swift)</div>
            <h3 class="plan-title">WidgetKit Desktop Widget (Swift)</h3>
            <p class="plan-desc">
              Haqiqiy macOS Notification Center yoki Desktop widgeti faqat Apple Swift/WidgetKit orqali yaratiladi. Ma'lumot almashish uchun App Group + SQLite yoki JSON fayl orqali bog'lanish talab etiladi.
            </p>
          </div>
        </div>
      </section>
    </main>

    <!-- Zaxirani tiklash (Import) Modali -->
    <BaseModal
      :open="importModalOpen"
      title="Zaxira nusxani tiklash"
      width="480px"
      @close="importModalOpen = false"
    >
      <div v-if="importFileSummary" class="import-modal-content">
        <div class="summary-box">
          <div class="summary-row">
            <span>Loyihalar:</span>
            <strong>{{ importFileSummary.projects }} ta</strong>
          </div>
          <div class="summary-row">
            <span>Vazifalar:</span>
            <strong>{{ importFileSummary.tasks }} ta</strong>
          </div>
          <div v-if="importFileSummary.exportedAt" class="summary-row">
            <span>Yaratilgan sana:</span>
            <strong>{{ new Date(importFileSummary.exportedAt).toLocaleDateString('uz-UZ') }}</strong>
          </div>
        </div>

        <div class="mode-select-section">
          <label class="mode-title">Tiklash usulini tanlang:</label>

          <div class="radio-options">
            <label class="mode-radio-card" :class="{ active: importMode === 'merge' }">
              <input
                v-model="importMode"
                type="radio"
                value="merge"
                class="sr-only"
              />
              <span class="custom-radio-dot" :class="{ active: importMode === 'merge' }"></span>
              <div class="mode-info">
                <strong>Qo'shib birlashtirish (Tavsiya etiladi)</strong>
                <span>Mavjud vazifalar o'chirilmaydi, faqat yangi vazifalar qo'shiladi va bir xil ID lilar yangilanadi.</span>
              </div>
            </label>

            <label class="mode-radio-card" :class="{ active: importMode === 'replace' }">
              <input
                v-model="importMode"
                type="radio"
                value="replace"
                class="sr-only"
              />
              <span class="custom-radio-dot" :class="{ active: importMode === 'replace' }"></span>
              <div class="mode-info">
                <strong class="danger-text">To'liq almashtirish</strong>
                <span>Joriy qurilmadagi barcha loyihalar va vazifalar o'chirilib, fayldagilar yoziladi.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="isImporting"
          @click="importModalOpen = false"
        >
          Bekor qilish
        </button>
        <button
          type="button"
          class="btn"
          :class="importMode === 'replace' ? 'btn-danger' : 'btn-primary'"
          :disabled="isImporting"
          @click="confirmImport"
        >
          <AppIcon v-if="isImporting" name="refresh" :size="16" />
          <span>{{ isImporting ? 'Tiklanmoqda...' : 'Tasdiqlash va tiklash' }}</span>
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.settings-view {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.settings-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: calc(14px + var(--safe-top)) 24px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

.header-inner {
  max-width: 780px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}

.settings-content {
  flex: 1;
  max-width: 780px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px calc(60px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-card {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.section-head-with-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-hint {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.45;
  margin: 0;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.setting-label {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text);
}

.setting-desc {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.4;
}

.select-compact {
  width: auto;
  min-height: 38px;
  padding: 6px 32px 6px 12px;
  font-size: 13.5px;
}

.chip-success {
  background: var(--success-soft);
  color: var(--success);
}

.persist-action-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--warning);
}

.status-badge.ok {
  color: var(--success);
}

.storage-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text);
}

.notice-icon {
  color: var(--accent);
  margin-top: 2px;
  flex-shrink: 0;
}

/* Backup */
.backup-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}

.backup-lbl {
  color: var(--text-2);
}

.backup-val {
  font-weight: 600;
  color: var(--text);
}

.backup-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.file-input-label {
  cursor: pointer;
}

/* Widget Plans */
.widget-plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-item {
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  margin-bottom: 2px;
}

.plan-badge.secondary {
  background: var(--surface-solid);
  color: var(--text-2);
  border: 1px solid var(--border-strong);
}

.plan-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text);
}

.plan-desc {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.4;
  margin: 0;
}

/* Import Modal */
.import-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-box {
  background: var(--surface-2);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
}

.mode-select-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mode-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}

.radio-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-radio-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface-solid);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.mode-radio-card.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.custom-radio-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  margin-top: 2px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.custom-radio-dot.active {
  border-color: var(--accent);
}

.custom-radio-dot.active::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.mode-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.mode-info span {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.35;
}

@media (max-width: 640px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .backup-actions {
    flex-direction: column;
  }
  .backup-actions .btn {
    width: 100%;
  }
}
</style>
