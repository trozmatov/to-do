/**
 * Loyihalar (bo'limlar). "Kiruvchi" har doim mavjud va o'chirilmaydi.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as db from '@/services/db'
import { INBOX_ID } from '@/services/db'
import { useUiStore } from './ui'
import { useTasksStore } from './tasks'

export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316',
  '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#0ea5e9', '#64748b',
]

export const PROJECT_ICONS = ['📥', '💼', '🏠', '📚', '💪', '🛒', '💡', '🎯', '✈️', '❤️', '🎨', '💰', '🧘', '🎓', '🛠️', '🌱']

export const useProjectsStore = defineStore('projects', () => {
  const ui = useUiStore()
  const items = ref([])

  /** Kiruvchi birinchi, qolganlari yaratilgan vaqti bo'yicha */
  const sorted = computed(() =>
    [...items.value].sort((a, b) => {
      if (a.id === INBOX_ID) return -1
      if (b.id === INBOX_ID) return 1
      return a.createdAt.localeCompare(b.createdAt)
    }),
  )
  const byId = computed(() => Object.fromEntries(items.value.map((p) => [p.id, p])))
  const inbox = computed(() => byId.value[INBOX_ID])
  const others = computed(() => sorted.value.filter((p) => p.id !== INBOX_ID))

  /** Bazadan yuklash; birinchi ishga tushishda Kiruvchi yaratiladi */
  async function load() {
    const list = await db.getProjects()
    if (!list.some((p) => p.id === INBOX_ID)) {
      const inboxProject = db.createInboxProject()
      await db.saveProject(inboxProject)
      list.push(inboxProject)
    }
    items.value = list
  }

  async function create({ name, color, icon }) {
    const now = new Date().toISOString()
    const project = { id: db.uid(), name: name.trim(), color, icon: icon || '', createdAt: now, updatedAt: now }
    if (!(await ui.guard(() => db.saveProject(project)))) return null
    items.value.push(project)
    ui.notify(`"${project.name}" loyihasi yaratildi`, { type: 'success' })
    return project
  }

  async function update(id, patch) {
    const current = byId.value[id]
    if (!current) return null
    const next = { ...current, ...patch, id, name: (patch.name ?? current.name).trim(), updatedAt: new Date().toISOString() }
    if (!(await ui.guard(() => db.saveProject(next)))) return null
    items.value = items.value.map((p) => (p.id === id ? next : p))
    return next
  }

  /**
   * O'chirish. withTasks=false bo'lsa vazifalar Kiruvchiga ko'chiriladi.
   */
  async function remove(id, { withTasks = false } = {}) {
    if (id === INBOX_ID) return false
    const project = byId.value[id]
    const ok = await ui.guard(() => db.deleteProject(id, { moveTasksTo: withTasks ? null : INBOX_ID }))
    if (!ok) return false
    items.value = items.value.filter((p) => p.id !== id)

    const tasks = useTasksStore()
    if (tasks.filter.projectId === id) tasks.filter.projectId = 'all'
    await tasks.load() // vazifalar bazada o'zgardi — qayta o'qiymiz

    ui.notify(
      withTasks ? `"${project?.name}" vazifalari bilan o'chirildi` : `"${project?.name}" o'chirildi, vazifalari Kiruvchiga ko'chirildi`,
      { type: 'success' },
    )
    return true
  }

  return { items, sorted, byId, inbox, others, load, create, update, remove }
})
