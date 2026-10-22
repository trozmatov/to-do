/**
 * Vazifalar: CRUD, filtr/saralash, davr bo'yicha tanlash, tartiblash,
 * subtasklar, takrorlanish, savatcha, eslatmalar va unumdorlik statistikasi.
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import * as db from '@/services/db'
import { INBOX_ID } from '@/services/db'
import {
  PERIOD_TYPES,
  periodKey,
  parseISODate,
  toISODate,
  WEEKDAYS,
} from '@/composables/usePeriod'
import { useUiStore } from './ui'
import { useSettingsStore } from './settings'
import { playCompleteSound } from '@/services/sound'
import { fireConfetti } from '@/services/confetti'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

/** Bajarilmaganlar tepada; keyin muhimlik (agar tanlangan) va qo'lda tartib */
export function sortTasks(list, mode = 'manual') {
  return [...list].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      (mode === 'priority' ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] : 0) ||
      a.order - b.order ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

/** Jami / bajarilgan / qolgan / foiz */
export function computeStats(list) {
  const total = list.length
  const done = list.filter((t) => t.completed).length
  return { total, done, left: total - done, percent: total ? Math.round((done / total) * 100) : 0 }
}

/** Takrorlanuvchi vazifaning keyingi sanasini hisoblash */
export function computeNextRecurringDate(dateStr, recurringType) {
  const d = parseISODate(dateStr)
  if (recurringType === 'daily') {
    d.setDate(d.getDate() + 1)
  } else if (recurringType === 'weekdays') {
    const day = d.getDay() // 0 = Yakshanba, 5 = Juma, 6 = Shanba
    if (day === 5) {
      d.setDate(d.getDate() + 3) // Juma -> Dushanba
    } else if (day === 6) {
      d.setDate(d.getDate() + 2) // Shanba -> Dushanba
    } else {
      d.setDate(d.getDate() + 1)
    }
  } else if (recurringType === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (recurringType === 'monthly') {
    d.setMonth(d.getMonth() + 1)
  }
  return toISODate(d)
}

export const useTasksStore = defineStore('tasks', () => {
  const ui = useUiStore()
  const settings = useSettingsStore()

  const items = ref([])
  /** projectId: 'all' yoki loyiha id; status: 'all' | 'open' | 'done' */
  const filter = reactive({ projectId: 'all', status: 'all', search: '' })

  async function load() {
    items.value = await db.getTasks()
  }

  const byId = computed(() => Object.fromEntries(items.value.map((t) => [t.id, t])))

  /** Faol (savatchada bo'lmagan) vazifalar */
  const activeTasks = computed(() => items.value.filter((t) => !t.deletedAt))

  /** Savatchadagi vazifalar (o'chirilgan vaqti bo'yicha saralangan) */
  const trashTasks = computed(() =>
    items.value
      .filter((t) => t.deletedAt)
      .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')),
  )
  const trashCount = computed(() => trashTasks.value.length)

  /** Sidebar uchun: har bir loyihadagi bajarilmagan vazifalar soni */
  const openCountByProject = computed(() => {
    const map = {}
    for (const t of activeTasks.value) {
      if (!t.completed) map[t.projectId] = (map[t.projectId] || 0) + 1
    }
    return map
  })
  const openCountTotal = computed(() => activeTasks.value.filter((t) => !t.completed).length)

  const inSelectedProject = (t) => filter.projectId === 'all' || t.projectId === filter.projectId

  /** Aniq bir davrning vazifalari (loyiha filtri bilan) */
  function tasksInPeriod(type, key, { allProjects = false } = {}) {
    return activeTasks.value.filter(
      (t) => t.periodType === type && t.date === key && (allProjects || inSelectedProject(t)),
    )
  }

  /** Joriy davrdan oldin qolib ketgan bajarilmagan vazifalar */
  function overdueBefore(type, currentKey, { allProjects = false } = {}) {
    return sortTasks(
      activeTasks.value.filter(
        (t) =>
          !t.completed &&
          t.periodType === type &&
          t.date < currentKey &&
          (allProjects || inSelectedProject(t)),
      ),
      settings.sortMode,
    )
  }

  /** Tablardagi qizil belgi uchun: har bir turda muddati o'tganlar soni */
  function overdueCountsByType(todayISO) {
    const today = parseISODate(todayISO)
    return Object.fromEntries(
      PERIOD_TYPES.map((type) => [type, overdueBefore(type, periodKey(type, today)).length]),
    )
  }

  /** Holat filtri, qidiruv va saralashni qo'llaydi */
  function applyView(list) {
    const q = filter.search.trim().toLocaleLowerCase()
    let result = list
    if (filter.status === 'open') result = result.filter((t) => !t.completed)
    else if (filter.status === 'done') result = result.filter((t) => t.completed)
    if (q) result = result.filter((t) => t.title.toLocaleLowerCase().includes(q))
    return sortTasks(result, settings.sortMode)
  }

  const nextOrder = () => items.value.reduce((max, t) => Math.max(max, t.order ?? 0), 0) + 1

  /* ---------------- CRUD ---------------- */

  async function create(data) {
    const now = new Date().toISOString()
    const task = {
      id: db.uid(),
      projectId: data.projectId || INBOX_ID,
      title: data.title.trim(),
      description: (data.description || '').trim(),
      periodType: data.periodType || 'day',
      date: data.date,
      priority: data.priority || 'medium',
      completed: !!data.completed,
      completedAt: data.completed ? now : null,
      deletedAt: null,
      subtasks: Array.isArray(data.subtasks)
        ? data.subtasks.map((s) => ({
            id: s.id || db.uid(),
            title: s.title.trim(),
            completed: !!s.completed,
          }))
        : [],
      time: data.time || '',
      reminder: !!data.reminder,
      recurring: data.recurring || 'none',
      order: nextOrder(),
      createdAt: now,
      updatedAt: now,
    }
    if (!(await ui.guard(() => db.saveTask(task)))) return null
    items.value.push(task)
    return task
  }

  async function update(id, patch) {
    const current = byId.value[id]
    if (!current) return null
    const next = { ...current, ...patch, id, updatedAt: new Date().toISOString() }
    if (typeof next.title === 'string') next.title = next.title.trim()
    if (!(await ui.guard(() => db.saveTask(next)))) return null
    items.value = items.value.map((t) => (t.id === id ? next : t))
    return next
  }

  /**
   * Vazifani bajarilgan/bajarilmagan holatga o'tkazish.
   * Ovoz, konfetti, takrorlanish (recurring) va vaqtni boshqaradi.
   */
  async function toggle(id, event) {
    const task = byId.value[id]
    if (!task) return null

    const willBeCompleted = !task.completed
    const now = new Date().toISOString()

    const patch = {
      completed: willBeCompleted,
      completedAt: willBeCompleted ? now : null,
    }

    const updated = await update(id, patch)
    if (!updated) return null

    if (willBeCompleted) {
      if (settings.soundEnabled) {
        playCompleteSound()
      }
      if (settings.confettiEnabled) {
        fireConfetti(event?.clientX, event?.clientY)
      }

      // Takrorlanuvchi vazifa bo'lsa: keyingi davr uchun yangi nusxa ochish
      if (task.recurring && task.recurring !== 'none') {
        const nextDate = computeNextRecurringDate(task.date, task.recurring)
        const nextSubtasks = (task.subtasks || []).map((s) => ({
          id: db.uid(),
          title: s.title,
          completed: false,
        }))

        await create({
          projectId: task.projectId,
          title: task.title,
          description: task.description,
          periodType: task.periodType,
          date: nextDate,
          priority: task.priority,
          time: task.time,
          reminder: task.reminder,
          recurring: task.recurring,
          subtasks: nextSubtasks,
        })

        ui.notify("Takrorlanuvchi vazifaning keyingi nusxasi yaratildi", {
          type: 'success',
          timeout: 4000,
        })
      }
    }

    return updated
  }

  /** Subtask (checklist) holatini o'zgartirish */
  async function toggleSubtask(taskId, subtaskId) {
    const task = byId.value[taskId]
    if (!task || !task.subtasks) return
    const subtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s,
    )
    await update(taskId, { subtasks })
  }

  /** Muddati o'tgan vazifani joriy davrga ko'chirish */
  const moveToPeriod = (id, date) => update(id, { date })

  /** Savatchaga ko'chirish (Soft delete) */
  async function remove(id) {
    const task = byId.value[id]
    if (!task) return
    const now = new Date().toISOString()
    const updated = await update(id, { deletedAt: now })
    if (!updated) return

    ui.notify("Vazifa savatchaga o'tkazildi", {
      timeout: 6000,
      action: { label: 'Qaytarish', run: () => restore(id) },
    })
  }

  /** Savatchadan qayta tiklash */
  async function restore(id) {
    const task = byId.value[id]
    if (!task) return
    const updated = await update(id, { deletedAt: null })
    if (updated) {
      ui.notify("Vazifa qayta tiklandi", { type: 'success' })
    }
  }

  /** Butunlay o'chirish (savatchadan to'liq yo'qotish) */
  async function permanentDelete(id) {
    const task = byId.value[id]
    if (!task) return
    if (!(await ui.guard(() => db.deleteTask(id)))) return
    items.value = items.value.filter((t) => t.id !== id)
  }

  /** Savatchani butkul tozalash */
  async function emptyTrash() {
    const toDelete = trashTasks.value
    if (!toDelete.length) return
    const ids = toDelete.map((t) => t.id)
    if (!(await ui.guard(() => db.deleteTasks(ids)))) return
    items.value = items.value.filter((t) => !t.deletedAt)
    ui.notify("Savatcha tozalandi", { type: 'success' })
  }

  /** Drag & drop'dan keyingi yangi tartib */
  async function reorder(orderedIds) {
    const tasks = orderedIds.map((id) => byId.value[id]).filter(Boolean)
    const slots = tasks.map((t) => t.order ?? 0).sort((a, b) => a - b)
    for (let i = 1; i < slots.length; i++) if (slots[i] <= slots[i - 1]) slots[i] = slots[i - 1] + 1

    const now = new Date().toISOString()
    const changed = tasks
      .map((t, i) => (t.order === slots[i] ? null : { ...t, order: slots[i], updatedAt: now }))
      .filter(Boolean)
    if (!changed.length) return
    if (!(await ui.guard(() => db.saveTasks(changed)))) return
    const map = Object.fromEntries(changed.map((t) => [t.id, t]))
    items.value = items.value.map((t) => map[t.id] || t)
  }

  /* ---------------- Unumdorlik & Streak statistikasi ---------------- */

  const productivityStats = computed(() => {
    const now = new Date()
    const todayStr = toISODate(now)

    // Barcha faol va bajarilgan vazifalar
    const completedTasks = activeTasks.value.filter((t) => t.completed)
    const totalCompleted = completedTasks.length

    // Qaysi kunlarda kamida bitta vazifa bajarilgan (Set of "YYYY-MM-DD")
    const completedDateSet = new Set()
    for (const t of completedTasks) {
      if (t.completedAt) {
        completedDateSet.add(toISODate(new Date(t.completedAt)))
      } else if (t.date && t.periodType === 'day') {
        completedDateSet.add(t.date)
      }
    }

    // Ketma-ket kunlar (Streak) hisobi:
    let streak = 0
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Agar bugun bajarilgan bo'lsa, bugundan boshlaymiz.
    // Agar bugun hali bajarilmagan bo'lsa, kechagi kundan boshlaymiz (streak uzilmagan).
    if (completedDateSet.has(todayStr)) {
      while (completedDateSet.has(toISODate(cursor))) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      }
    } else {
      cursor.setDate(cursor.getDate() - 1)
      while (completedDateSet.has(toISODate(cursor))) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      }
    }

    // Oxirgi 7 kundagi bajarilishlar soni (ustunli grafik uchun)
    const last7Days = []
    const SHORT_DAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dStr = toISODate(d)
      const count = completedTasks.filter((t) => {
        if (t.completedAt) return toISODate(new Date(t.completedAt)) === dStr
        return t.date === dStr && t.periodType === 'day'
      }).length

      last7Days.push({
        date: dStr,
        dayName: SHORT_DAYS[d.getDay()],
        count,
        isToday: dStr === todayStr,
      })
    }

    const todayDone = last7Days[last7Days.length - 1]?.count || 0
    const maxCountInWeek = Math.max(1, ...last7Days.map((d) => d.count))

    return {
      streak,
      totalCompleted,
      todayDone,
      last7Days,
      maxCountInWeek,
    }
  })

  return {
    items,
    activeTasks,
    trashTasks,
    trashCount,
    filter,
    byId,
    openCountByProject,
    openCountTotal,
    productivityStats,
    load,
    tasksInPeriod,
    overdueBefore,
    overdueCountsByType,
    applyView,
    create,
    update,
    toggle,
    toggleSubtask,
    moveToPeriod,
    remove,
    restore,
    permanentDelete,
    emptyTrash,
    reorder,
  }
})
