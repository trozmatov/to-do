/**
 * Sozlamalar: mavzu, saralash rejimi, zaxira sanasi, doimiy saqlash (persist) holati.
 * Qiymatlar IndexedDB'ning `meta` store'ida saqlanadi.
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import * as db from '@/services/db'
import { useUiStore } from './ui'

const THEME_COLORS = { light: '#f5f6fb', dark: '#0d0e1a' }
const BACKUP_REMINDER_DAYS = 30
const DAY = 86400000

export const useSettingsStore = defineStore('settings', () => {
  const ui = useUiStore()

  const theme = ref('system') // 'system' | 'light' | 'dark'
  const sortMode = ref('manual') // 'manual' | 'priority'
  const startInWidget = ref(false)
  const lastBackupAt = ref(null)
  const firstRunAt = ref(null)
  /** true | false | 'unsupported' | null (hali tekshirilmagan) */
  const persisted = ref(null)
  const storageEstimate = ref(null)

  const soundEnabled = ref(true)
  const confettiEnabled = ref(true)
  const notificationsEnabled = ref(false)

  // Tizim mavzusi (prefers-color-scheme) bilan sinxron
  const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
  const systemDark = ref(mq?.matches ?? false)
  mq?.addEventListener?.('change', (e) => (systemDark.value = e.matches))

  const resolvedTheme = computed(() => (theme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : theme.value))

  function applyTheme() {
    const t = resolvedTheme.value
    document.documentElement.dataset.theme = t
    document.getElementById('meta-theme-color')?.setAttribute('content', THEME_COLORS[t])
  }
  watch(resolvedTheme, applyTheme)

  /** Oxirgi zaxiradan (yoki birinchi ishga tushishdan) beri o'tgan kunlar */
  const daysSinceBackup = computed(() => {
    const base = lastBackupAt.value || firstRunAt.value
    if (!base) return 0
    return Math.floor((Date.now() - Date.parse(base)) / DAY)
  })
  const backupReminderDue = computed(() => daysSinceBackup.value > BACKUP_REMINDER_DAYS)

  async function load() {
    const meta = await db.getAllMeta()
    theme.value = meta.theme ?? 'system'
    sortMode.value = meta.sortMode ?? 'manual'
    startInWidget.value = meta.startInWidget ?? false
    soundEnabled.value = meta.soundEnabled ?? true
    confettiEnabled.value = meta.confettiEnabled ?? true
    notificationsEnabled.value = meta.notificationsEnabled ?? false
    lastBackupAt.value = meta.lastBackupAt ?? null
    firstRunAt.value = meta.firstRunAt ?? null
    if (!firstRunAt.value) {
      firstRunAt.value = new Date().toISOString()
      await save('firstRunAt', firstRunAt.value)
    }
    cacheTheme()
    applyTheme()
    // Birinchi yuklanishda doimiy saqlashni so'raymiz (brauzer ma'lumotni o'zi o'chirmasligi uchun)
    checkPersistence(true)
  }

  const save = (key, value) => ui.guard(() => db.setMeta(key, value))

  /** index.html'dagi miltillashga qarshi skript uchun nusxa */
  function cacheTheme() {
    try {
      localStorage.setItem('todo-theme', theme.value)
    } catch {
      /* localStorage yo'q bo'lishi mumkin */
    }
  }

  async function setTheme(value) {
    theme.value = value
    cacheTheme()
    await save('theme', value)
  }

  /** Tizim → Yorug' → Qorong'i → Tizim */
  function cycleTheme() {
    const order = ['system', 'light', 'dark']
    return setTheme(order[(order.indexOf(theme.value) + 1) % order.length])
  }

  async function setSortMode(value) {
    sortMode.value = value
    await save('sortMode', value)
  }

  async function setStartInWidget(value) {
    startInWidget.value = value
    await save('startInWidget', value)
  }

  async function markBackup() {
    lastBackupAt.value = new Date().toISOString()
    await save('lastBackupAt', lastBackupAt.value)
  }

  /** navigator.storage.persist() holatini tekshiradi; request=true bo'lsa so'raydi */
  async function checkPersistence(request = false) {
    const storage = navigator.storage
    if (!storage?.persisted) {
      persisted.value = 'unsupported'
      return persisted.value
    }
    try {
      let value = await storage.persisted()
      if (!value && request && storage.persist) value = await storage.persist()
      persisted.value = value
      if (storage.estimate) storageEstimate.value = await storage.estimate()
    } catch {
      persisted.value = 'unsupported'
    }
    return persisted.value
  }

  async function setSoundEnabled(value) {
    soundEnabled.value = value
    await save('soundEnabled', value)
  }

  async function setConfettiEnabled(value) {
    confettiEnabled.value = value
    await save('confettiEnabled', value)
  }

  async function setNotificationsEnabled(value) {
    notificationsEnabled.value = value
    await save('notificationsEnabled', value)
  }

  return {
    theme,
    resolvedTheme,
    sortMode,
    startInWidget,
    soundEnabled,
    confettiEnabled,
    notificationsEnabled,
    lastBackupAt,
    firstRunAt,
    persisted,
    storageEstimate,
    daysSinceBackup,
    backupReminderDue,
    load,
    setTheme,
    cycleTheme,
    setSortMode,
    setStartInWidget,
    setSoundEnabled,
    setConfettiEnabled,
    setNotificationsEnabled,
    markBackup,
    checkPersistence,
  }
})
