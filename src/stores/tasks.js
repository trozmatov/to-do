/**
 * Vazifalar: CRUD, filtr/saralash, davr bo'yicha tanlash, tartiblash, statistika.
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import * as db from '@/services/db'
import { INBOX_ID } from '@/services/db'
import { PERIOD_TYPES, periodKey, parseISODate } from '@/composables/usePeriod'
import { useUiStore } from './ui'
import { useSettingsStore } from './settings'

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

  /** Sidebar uchun: har bir loyihadagi bajarilmagan vazifalar soni */
  const openCountByProject = computed(() => {
    const map = {}
    for (const t of items.value) if (!t.completed) map[t.projectId] = (map[t.projectId] || 0) + 1
    return map
  })
  const openCountTotal = computed(() => items.value.filter((t) => !t.completed).length)

  const inSelectedProject = (t) => filter.projectId === 'all' || t.projectId === filter.projectId

  /** Aniq bir davrning vazifalari (loyiha filtri bilan) */
  function tasksInPeriod(type, key, { allProjects = false } = {}) {
    return items.value.filter((t) => t.periodType === type && t.date === key && (allProjects || inSelectedProject(t)))
  }

  /** Joriy davrdan oldin qolib ketgan bajarilmagan vazifalar */
  function overdueBefore(type, currentKey, { allProjects = false } = {}) {
    return sortTasks(
      items.value.filter(
        (t) => !t.completed && t.periodType === type && t.date < currentKey && (allProjects || inSelectedProject(t)),
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

  const toggle = (id) => update(id, { completed: !byId.value[id]?.completed })

  /** Muddati o'tgan vazifani joriy davrga ko'chirish */
  const moveToPeriod = (id, date) => update(id, { date })

  async function remove(id) {
    const task = byId.value[id]
    if (!task) return
    if (!(await ui.guard(() => db.deleteTask(id)))) return
    items.value = items.value.filter((t) => t.id !== id)
    ui.notify("Vazifa o'chirildi", {
      timeout: 6000,
      action: { label: 'Qaytarish', run: () => restore(task) },
    })
  }

  async function restore(task) {
    if (byId.value[task.id]) return
    if (await ui.guard(() => db.saveTask(task))) items.value.push(task)
  }

  /**
   * Drag & drop'dan keyingi yangi tartib (ko'rinib turgan ro'yxat).
   * Shu vazifalarning mavjud `order` qiymatlari yangi ketma-ketlikda qayta taqsimlanadi,
   * shuning uchun filtrda yashiringan vazifalarning o'rni buzilmaydi.
   */
  async function reorder(orderedIds) {
    const tasks = orderedIds.map((id) => byId.value[id]).filter(Boolean)
    const slots = tasks.map((t) => t.order ?? 0).sort((a, b) => a - b)
    // Takroriy qiymatlar bo'lsa ham qat'iy o'suvchi qilamiz
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

  return {
    items,
    filter,
    byId,
    openCountByProject,
    openCountTotal,
    load,
    tasksInPeriod,
    overdueBefore,
    overdueCountsByType,
    applyView,
    create,
    update,
    toggle,
    moveToPeriod,
    remove,
    restore,
    reorder,
  }
})
