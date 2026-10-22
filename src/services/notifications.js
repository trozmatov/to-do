/**
 * Vazifa eslatmalari va Notification boshqaruvi.
 */
import { playReminderSound } from './sound'

class NotificationManager {
  constructor() {
    this.intervalId = null
    this.notifiedTaskIds = new Set()
  }

  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  getPermission() {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission
  }

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported'
    try {
      return await Notification.requestPermission()
    } catch {
      return 'denied'
    }
  }

  startScheduler(getTasksFn, notifyUiFn) {
    if (this.intervalId) return

    // Har 20 soniyada tekshirib boradi
    this.intervalId = setInterval(() => {
      this.checkDueTasks(getTasksFn, notifyUiFn)
    }, 20000)

    // Darhol ham bitta tekshirib qo'yadi
    this.checkDueTasks(getTasksFn, notifyUiFn)
  }

  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  checkDueTasks(getTasksFn, notifyUiFn) {
    if (typeof window === 'undefined') return
    const tasks = getTasksFn()
    if (!tasks || !tasks.length) return

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const currentHours = String(now.getHours()).padStart(2, '0')
    const currentMinutes = String(now.getMinutes()).padStart(2, '0')
    const currentTimeStr = `${currentHours}:${currentMinutes}`

    for (const task of tasks) {
      // Faqat o'chirilmagan, bajarilmagan, eslatmasi bor va aynan bugungi kunlik vazifalar
      if (
        task.deletedAt ||
        task.completed ||
        !task.reminder ||
        !task.time ||
        task.periodType !== 'day' ||
        task.date !== todayStr
      ) {
        continue
      }

      // Agar vaqti yetgan yoki ozgina o'tib ketgan bo'lsa (oxirgi 15 daqiqa ichida) va hali bildirilmagan bo'lsa
      const reminderKey = `${task.id}_${task.date}_${task.time}`
      if (!this.notifiedTaskIds.has(reminderKey)) {
        if (task.time <= currentTimeStr) {
          this.notifiedTaskIds.add(reminderKey)
          this.triggerReminder(task, notifyUiFn)
        }
      }
    }
  }

  triggerReminder(task, notifyUiFn) {
    playReminderSound()

    const title = `Eslatma: ${task.title}`
    const body = task.description || "Ushbu vazifani bajarish vaqti keldi!"

    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192.png',
          badge: '/pwa-192.png',
        })
      } catch {
        // Ba'zi brauzerlar xatolik bersa ham in-app toast ko'rsatiladi
      }
    }

    if (notifyUiFn) {
      notifyUiFn(title, {
        type: 'warning',
        timeout: 9000,
      })
    }
  }
}

export const notifications = new NotificationManager()
