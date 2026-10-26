/**
 * Qaydlar (Notes): CRUD, saralash, qidiruv, qadash,
 * vazifaga/loyihaga bog'lash, savatcha va biriktirmalar.
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import * as db from '@/services/db'
import { useUiStore } from './ui'

export const useNotesStore = defineStore('notes', () => {
  const ui = useUiStore()

  const items = ref([])
  const activeNoteId = ref(null)

  /** Filtr va saralash: projectId ('all' yoki loyiha id), search, sortBy ('updatedAt' | 'createdAt') */
  const filter = reactive({
    projectId: 'all',
    search: '',
    sortBy: 'updatedAt',
  })

  async function load() {
    items.value = await db.getNotes()
  }

  const byId = computed(() => Object.fromEntries(items.value.map((n) => [n.id, n])))

  /** Faol (savatchada bo'lmagan) qaydlar */
  const activeNotes = computed(() => items.value.filter((n) => !n.deletedAt))

  /** Savatchadagi qaydlar */
  const trashNotes = computed(() =>
    items.value
      .filter((n) => !!n.deletedAt)
      .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''))
  )

  /** Filtr va qidiruv bo'yicha qaydlar */
  const filteredNotes = computed(() => {
    let result = activeNotes.value

    // Loyiha bo'yicha filtr
    if (filter.projectId !== 'all') {
      result = result.filter((n) => n.projectId === filter.projectId)
    }

    // Matn bo'yicha qidiruv
    const query = filter.search.trim().toLowerCase()
    if (query) {
      result = result.filter((n) => {
        const titleMatch = (n.title || '').toLowerCase().includes(query)
        const textMatch = (n.plainText || '').toLowerCase().includes(query)
        return titleMatch || textMatch
      })
    }

    // Saralash: qadalganlar har doim tepada, keyin tanlangan tartib bo'yicha
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1
      }
      const field = filter.sortBy === 'createdAt' ? 'createdAt' : 'updatedAt'
      return (b[field] || '').localeCompare(a[field] || '')
    })
  })

  /** Qadalgan qaydlar */
  const pinnedNotes = computed(() => filteredNotes.value.filter((n) => n.pinned))

  /** Oddiy (qadalmagan) qaydlar */
  const unpinnedNotes = computed(() => filteredNotes.value.filter((n) => !n.pinned))

  /** Hozirgi tanlangan qayd */
  const currentNote = computed(() => {
    if (!activeNoteId.value) return null
    return byId.value[activeNoteId.value] || null
  })

  /** Yangi qayd yaratish */
  async function create({
    title = '',
    content = null,
    plainText = '',
    projectId = null,
    taskId = null,
  } = {}) {
    const now = new Date().toISOString()
    const newNote = {
      id: db.uid(),
      title: title.trim() || 'Yangi qayd',
      content: content || {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: title ? [{ type: 'text', text: title }] : [],
          },
        ],
      },
      plainText: plainText || title || '',
      projectId: projectId || (filter.projectId !== 'all' ? filter.projectId : null),
      taskId: taskId || null,
      pinned: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    const ok = await ui.guard(
      () => db.saveNote(newNote),
      "Qaydni yaratishda xatolik yuz berdi."
    )
    if (ok) {
      items.value.unshift(newNote)
      activeNoteId.value = newNote.id
      return newNote
    }
    return null
  }

  /** Qaydni yangilash */
  async function update(id, patch) {
    const note = byId.value[id]
    if (!note) return false

    const now = new Date().toISOString()
    const updated = {
      ...note,
      ...patch,
      updatedAt: now,
    }

    const ok = await ui.guard(
      () => db.saveNote(updated),
      "Qaydni saqlashda xatolik yuz berdi."
    )
    if (ok) {
      const idx = items.value.findIndex((n) => n.id === id)
      if (idx !== -1) {
        items.value[idx] = updated
      }
      return true
    }
    return false
  }

  /** Qadashni yoqish / o'chirish */
  async function togglePin(id) {
    const note = byId.value[id]
    if (!note) return
    const pinned = !note.pinned
    await update(id, { pinned })
    ui.notify(pinned ? "Qayd yuqoriga qadaldi" : "Qadash bekor qilindi", {
      type: 'info',
      timeout: 2000,
    })
  }

  /** Savatchaga ko'chirish */
  async function moveToTrash(id) {
    const note = byId.value[id]
    if (!note) return
    const now = new Date().toISOString()
    const ok = await update(id, { deletedAt: now })
    if (ok) {
      if (activeNoteId.value === id) {
        // Boshqa qaydni tanlash
        const remaining = filteredNotes.value.filter((n) => n.id !== id)
        activeNoteId.value = remaining.length > 0 ? remaining[0].id : null
      }
      ui.notify("Qayd savatchaga ko'chirildi", {
        type: 'info',
        action: {
          label: 'Qaytarish',
          run: () => restore(id),
        },
      })
    }
  }

  /** Savatchadan qayta tiklash */
  async function restore(id) {
    const note = byId.value[id]
    if (!note) return
    const ok = await update(id, { deletedAt: null })
    if (ok) {
      ui.notify("Qayd qayta tiklandi", { type: 'success' })
    }
  }

  /** Butunlay o'chirish */
  async function permanentDelete(id) {
    const ok = await ui.guard(
      () => db.deleteNote(id),
      "Qaydni o'chirishda xatolik yuz berdi."
    )
    if (ok) {
      items.value = items.value.filter((n) => n.id !== id)
      if (activeNoteId.value === id) {
        activeNoteId.value = null
      }
      ui.notify("Qayd butunlay o'chirildi", { type: 'info' })
    }
  }

  /** Savatchani to'liq tozalash */
  async function emptyTrash() {
    const trashIds = trashNotes.value.map((n) => n.id)
    if (!trashIds.length) return
    const ok = await ui.guard(
      () => db.deleteNotes(trashIds),
      "Savatchani tozalashda xatolik yuz berdi."
    )
    if (ok) {
      items.value = items.value.filter((n) => !trashIds.includes(n.id))
      ui.notify("Savatchadagi barcha qaydlar o'chirildi", { type: 'info' })
    }
  }

  return {
    items,
    activeNoteId,
    filter,
    load,
    byId,
    activeNotes,
    trashNotes,
    filteredNotes,
    pinnedNotes,
    unpinnedNotes,
    currentNote,
    create,
    update,
    togglePin,
    moveToTrash,
    restore,
    permanentDelete,
    emptyTrash,
  }
})
