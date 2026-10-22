/**
 * UI holati: toast xabarlar, mobil sidebar, saqlash rejimi ogohlantirishi.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { describeError } from '@/services/db'

export const useUiStore = defineStore('ui', () => {
  const toasts = ref([])
  const sidebarOpen = ref(false)
  /** { mode: 'idb' | 'memory', reason } — App.vue ishga tushganda to'ldiradi */
  const storage = ref({ mode: null, reason: null })
  /** Zaxira eslatmasi shu seans uchun yopilganmi */
  const backupBannerDismissed = ref(false)

  let seq = 0
  const timers = new Map()

  /**
   * Toast ko'rsatish.
   * @param {string} message
   * @param {{ type?: 'info'|'success'|'error'|'warning', timeout?: number, action?: { label: string, run: Function } }} opts
   */
  function notify(message, { type = 'info', timeout = 4000, action = null } = {}) {
    const id = ++seq
    toasts.value.push({ id, message, type, action })
    if (timeout) timers.set(id, setTimeout(() => dismiss(id), timeout))
    return id
  }

  function dismiss(id) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /**
   * Saqlash amalini xavfsiz bajaradi: xatolikda o'zbekcha xabar chiqaradi.
   * @returns {Promise<boolean>} muvaffaqiyatli bo'lsa true
   */
  async function guard(fn, errorMessage) {
    try {
      await fn()
      return true
    } catch (err) {
      console.error(err)
      notify(errorMessage || describeError(err), { type: 'error', timeout: 7000 })
      return false
    }
  }

  return { toasts, sidebarOpen, storage, backupBannerDismissed, notify, dismiss, guard }
})
