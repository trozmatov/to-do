/**
 * PWA o'rnatish holati.
 * - Chrome / Edge / Android / Windows: `beforeinstallprompt` hodisasi orqali tizim oynasi
 * - iOS va macOS Safari: hodisa yo'q, shuning uchun qo'llanma oynasi ko'rsatiladi
 */
import { ref, computed } from 'vue'

const deferredPrompt = ref(null)
const installed = ref(false)
const displayStandalone = ref(false)

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
// iPadOS 13+ o'zini "Macintosh" deb ko'rsatadi, sensorli ekran bo'yicha ajratamiz
const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
const isSafari = /^((?!chrome|android|crios|fxios|edgios|edg|opr).)*safari/i.test(ua)
const isMacSafari = !isIOS && /Macintosh/.test(ua) && isSafari
const isAndroid = /Android/i.test(ua)
const isWindows = /Windows/i.test(ua)
const isMac = !isIOS && /Macintosh/.test(ua)

let listening = false

/** main.js'da imkon qadar erta chaqiriladi: hodisa sahifa yuklanishi bilan keladi */
export function listenInstallPrompt() {
  if (listening || typeof window === 'undefined') return
  listening = true

  const mq = window.matchMedia('(display-mode: standalone)')
  const update = () => (displayStandalone.value = mq.matches || window.navigator.standalone === true)
  update()
  mq.addEventListener?.('change', update)

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // brauzerning o'z bannerini to'xtatamiz, o'z tugmamizni ko'rsatamiz
    deferredPrompt.value = e
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null
    installed.value = true
  })
}

export function useInstallPrompt() {
  const isStandalone = computed(() => displayStandalone.value)
  /** Tizim o'rnatish oynasini chaqirish mumkinmi */
  const canPrompt = computed(() => !!deferredPrompt.value && !isStandalone.value)
  /** Qo'lda o'rnatish qo'llanmasi kerakmi (iOS / macOS Safari) */
  const needsGuide = computed(() => !isStandalone.value && !canPrompt.value && (isIOS || isMacSafari))
  const showInstallButton = computed(() => canPrompt.value || needsGuide.value)

  const platform = isIOS ? 'ios' : isMacSafari ? 'mac-safari' : isAndroid ? 'android' : isWindows ? 'windows' : isMac ? 'mac' : 'other'

  async function promptInstall() {
    const e = deferredPrompt.value
    if (!e) return 'unavailable'
    e.prompt()
    const { outcome } = await e.userChoice
    deferredPrompt.value = null
    return outcome // 'accepted' | 'dismissed'
  }

  return { isStandalone, canPrompt, needsGuide, showInstallButton, installed, platform, promptInstall }
}
