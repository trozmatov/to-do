/**
 * IndexedDB adapteri.
 *
 * Pinia store'lar FAQAT shu fayldagi funksiyalar orqali ma'lumot bilan ishlaydi.
 * Keyinchalik backend ulash kerak bo'lsa, shu funksiyalarni fetch() bilan
 * almashtirish kifoya: store'lar o'zgarmaydi.
 *
 * Agar IndexedDB mavjud bo'lmasa (ba'zi inkognito rejimlar), xuddi shu API'ga ega
 * xotiradagi (vaqtincha) adapter ishlatiladi.
 */
import { openDB } from 'idb'

export const DB_NAME = 'todo-app'
export const DB_VERSION = 2
export const INBOX_ID = 'inbox'

export const BACKUP_FORMAT = 'todo-app-backup'
export const BACKUP_VERSION = 2

const STORES = ['projects', 'tasks', 'meta', 'notes', 'attachments']
const VALID_PERIODS = ['day', 'week', 'month', 'year']
const VALID_PRIORITIES = ['low', 'medium', 'high']
/** Zaxiraga kiradigan sozlamalar (qurilmaga xos qiymatlar kirmaydi) */
const EXPORTABLE_META = ['theme', 'sortMode', 'startInWidget', 'soundEnabled', 'confettiEnabled', 'notificationsEnabled']

/** Noyob ID. randomUUID faqat HTTPS/localhost'da bor, shuning uchun zaxira varianti ham bor. */
export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

/** Vue reactive proxy'larni oddiy obyektga aylantiradi (IndexedDB proxy'ni saqlay olmaydi) */
const plain = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

/** Standart "Kiruvchi" loyihasi */
export function createInboxProject() {
  const now = new Date().toISOString()
  return { id: INBOX_ID, name: 'Kiruvchi', color: '#6366f1', icon: '📥', createdAt: now, updatedAt: now }
}

/** Blob faylini Base64 matniga o'girish */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Base64 matnini Blob fayliga o'girish */
export function base64ToBlob(base64Data, contentType = '') {
  if (!base64Data) return null
  const parts = base64Data.split(';base64,')
  const mime = parts.length > 1 ? parts[0].replace('data:', '') : contentType
  const raw = atob(parts.length > 1 ? parts[1] : parts[0])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  return new Blob([uInt8Array], { type: mime || 'image/png' })
}

/* ------------------------------------------------------------------ */
/* Migratsiyalar                                                       */
/* ------------------------------------------------------------------ */

/**
 * Har bir versiya uchun alohida `case`. `break` yo'q: eski versiyadan kelgan
 * foydalanuvchida barcha keyingi migratsiyalar ketma-ket bajariladi.
 */
function upgrade(db, oldVersion) {
  switch (oldVersion) {
    case 0: {
      db.createObjectStore('projects', { keyPath: 'id' })

      const tasks = db.createObjectStore('tasks', { keyPath: 'id' })
      tasks.createIndex('projectId', 'projectId')
      tasks.createIndex('periodType', 'periodType')
      tasks.createIndex('date', 'date')
      // Eslatma: IndexedDB boolean qiymatlarni kalit sifatida indekslamaydi,
      // shuning uchun bu indeks bo'sh qoladi. Holat bo'yicha filtr xotirada (Pinia) bajariladi.
      tasks.createIndex('completed', 'completed')

      db.createObjectStore('meta', { keyPath: 'key' })
    }
    // eslint-disable-next-line no-fallthrough
    case 1: {
      const notes = db.createObjectStore('notes', { keyPath: 'id' })
      notes.createIndex('updatedAt', 'updatedAt')
      notes.createIndex('pinned', 'pinned')
      notes.createIndex('projectId', 'projectId')
      notes.createIndex('taskId', 'taskId')
      notes.createIndex('deletedAt', 'deletedAt')

      const attachments = db.createObjectStore('attachments', { keyPath: 'id' })
      attachments.createIndex('noteId', 'noteId')
    }
  }
}

/* ------------------------------------------------------------------ */
/* Adapterlar                                                          */
/* ------------------------------------------------------------------ */

function createIdbAdapter(db) {
  return {
    kind: 'idb',
    getAll: (store) => db.getAll(store),
    get: (store, key) => db.get(store, key),
    getAllByIndex: (store, index, value) => db.getAllFromIndex(store, index, value),
    /** Bir nechta amalni bitta tranzaksiyada bajaradi: yo hammasi, yo hech biri */
    async batch(ops) {
      const names = [...new Set(ops.map((o) => o.store))]
      if (!names.length) return
      const tx = db.transaction(names, 'readwrite')
      const requests = ops.map((op) => {
        const store = tx.objectStore(op.store)
        if (op.type === 'put') return store.put(plain(op.value))
        if (op.type === 'delete') return store.delete(op.key)
        if (op.type === 'clear') return store.clear()
        throw new Error(`Noma'lum amal: ${op.type}`)
      })
      await Promise.all([...requests, tx.done])
    },
  }
}

function createMemoryAdapter() {
  const data = Object.fromEntries(STORES.map((s) => [s, new Map()]))
  const keyOf = (store, v) => (store === 'meta' ? v.key : v.id)
  return {
    kind: 'memory',
    async getAll(store) {
      return [...data[store].values()].map(plain)
    },
    async get(store, key) {
      return plain(data[store].get(key))
    },
    async getAllByIndex(store, index, value) {
      return [...data[store].values()].filter((v) => v[index] === value).map(plain)
    },
    async batch(ops) {
      for (const op of ops) {
        if (op.type === 'put') data[op.store].set(keyOf(op.store, op.value), plain(op.value))
        else if (op.type === 'delete') data[op.store].delete(op.key)
        else if (op.type === 'clear') data[op.store].clear()
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Ishga tushirish                                                     */
/* ------------------------------------------------------------------ */

let adapter = null
let status = { mode: null, reason: null }

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' })), ms),
    ),
  ])
}

/**
 * Bazani ochadi. Natija: { mode: 'idb' | 'memory', reason: null | 'unsupported' | 'error' | 'timeout' }
 */
export async function initDB() {
  if (adapter) return status

  if (typeof indexedDB === 'undefined' || !indexedDB) {
    return useMemory('unsupported')
  }

  try {
    const db = await withTimeout(
      openDB(DB_NAME, DB_VERSION, {
        upgrade,
        // Boshqa oynada yangiroq versiya ochilmoqchi: ulanishni bo'shatamiz
        blocking(_cur, _next, event) {
          event.target.close()
          window.dispatchEvent(new CustomEvent('todo-db-blocking'))
        },
      }),
      8000,
    )
    // Ba'zi brauzerlar bazani ochadi, lekin yozishga ruxsat bermaydi: sinov yozuvi
    await db.put('meta', { key: '__probe', value: Date.now() })
    await db.delete('meta', '__probe')

    adapter = createIdbAdapter(db)
    status = { mode: 'idb', reason: null }
  } catch (err) {
    console.error('[db] IndexedDB ochilmadi:', err)
    useMemory(err?.name === 'TimeoutError' ? 'timeout' : 'error')
  }
  return status
}

function useMemory(reason) {
  adapter = createMemoryAdapter()
  status = { mode: 'memory', reason }
  return status
}

export const getStorageStatus = () => status

function A() {
  if (!adapter) throw new Error('initDB() chaqirilmagan')
  return adapter
}

/* ------------------------------------------------------------------ */
/* CRUD: loyihalar                                                     */
/* ------------------------------------------------------------------ */

export const getProjects = () => A().getAll('projects')

export const saveProject = (project) => A().batch([{ type: 'put', store: 'projects', value: project }])

/**
 * Loyihani o'chiradi. `moveTasksTo` berilsa vazifalar o'sha loyihaga ko'chiriladi,
 * aks holda loyiha bilan birga o'chiriladi. Hammasi bitta tranzaksiyada.
 */
export async function deleteProject(id, { moveTasksTo = null } = {}) {
  if (id === INBOX_ID) throw new Error("Kiruvchi loyihasini o'chirib bo'lmaydi")
  const tasks = await A().getAllByIndex('tasks', 'projectId', id)
  const now = new Date().toISOString()
  const ops = [{ type: 'delete', store: 'projects', key: id }]
  for (const t of tasks) {
    ops.push(
      moveTasksTo
        ? { type: 'put', store: 'tasks', value: { ...t, projectId: moveTasksTo, updatedAt: now } }
        : { type: 'delete', store: 'tasks', key: t.id },
    )
  }
  await A().batch(ops)
  return { affected: tasks.length }
}

/* ------------------------------------------------------------------ */
/* CRUD: vazifalar                                                     */
/* ------------------------------------------------------------------ */

export const getTasks = () => A().getAll('tasks')

export const saveTask = (task) => A().batch([{ type: 'put', store: 'tasks', value: task }])

/** Bir nechta vazifani bitta tranzaksiyada saqlash (masalan, tartiblashda) */
export const saveTasks = (tasks) => A().batch(tasks.map((value) => ({ type: 'put', store: 'tasks', value })))

export const deleteTask = (id) => A().batch([{ type: 'delete', store: 'tasks', key: id }])

export const deleteTasks = (ids) => A().batch(ids.map((key) => ({ type: 'delete', store: 'tasks', key })))

/* ------------------------------------------------------------------ */
/* CRUD: qaydlar (notes)                                              */
/* ------------------------------------------------------------------ */

export const getNotes = () => A().getAll('notes')

export const getNote = (id) => A().get('notes', id)

export const saveNote = (note) => A().batch([{ type: 'put', store: 'notes', value: note }])

export const saveNotes = (notes) => A().batch(notes.map((value) => ({ type: 'put', store: 'notes', value })))

export async function deleteNote(id) {
  const attachments = await getAttachmentsByNote(id)
  const ops = [
    { type: 'delete', store: 'notes', key: id },
    ...attachments.map((att) => ({ type: 'delete', store: 'attachments', key: att.id })),
  ]
  return A().batch(ops)
}

export async function deleteNotes(ids) {
  const ops = []
  for (const id of ids) {
    const attachments = await getAttachmentsByNote(id)
    ops.push({ type: 'delete', store: 'notes', key: id })
    attachments.forEach((att) => ops.push({ type: 'delete', store: 'attachments', key: att.id }))
  }
  return A().batch(ops)
}

/* ------------------------------------------------------------------ */
/* CRUD: biriktirmalar (attachments)                                  */
/* ------------------------------------------------------------------ */

export const getAttachments = () => A().getAll('attachments')

export async function getAttachmentsByNote(noteId) {
  if (A().kind === 'idb') {
    return A().getAllByIndex('attachments', 'noteId', noteId)
  }
  const all = await A().getAll('attachments')
  return all.filter((a) => a.noteId === noteId)
}

export const getAttachment = (id) => A().get('attachments', id)

export const saveAttachment = (attachment) => A().batch([{ type: 'put', store: 'attachments', value: attachment }])

export const deleteAttachment = (id) => A().batch([{ type: 'delete', store: 'attachments', key: id }])

/* ------------------------------------------------------------------ */
/* Meta (sozlamalar)                                                   */
/* ------------------------------------------------------------------ */

/** Barcha sozlamalarni { key: value } ko'rinishida qaytaradi */
export async function getAllMeta() {
  const rows = await A().getAll('meta')
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export const setMeta = (key, value) => A().batch([{ type: 'put', store: 'meta', value: { key, value } }])

/* ------------------------------------------------------------------ */
/* Eksport / import                                                    */
/* ------------------------------------------------------------------ */

export async function exportData() {
  const [projects, tasks, meta, notes, attachments] = await Promise.all([
    A().getAll('projects'),
    A().getAll('tasks'),
    A().getAll('meta'),
    A().getAll('notes'),
    A().getAll('attachments'),
  ])

  // Attachments Blob'larni Base64 formatga aylantirish
  const serializedAttachments = await Promise.all(
    attachments.map(async (att) => {
      let dataBase64 = att.dataBase64
      if (!dataBase64 && att.blob) {
        try {
          dataBase64 = await blobToBase64(att.blob)
        } catch (e) {
          console.error("Blob base64 ga o'girilmadi:", e)
        }
      }
      return {
        id: att.id,
        noteId: att.noteId,
        name: att.name || 'attachment',
        type: att.type || 'image/png',
        size: att.size || 0,
        createdAt: att.createdAt || new Date().toISOString(),
        dataBase64: dataBase64 || null,
      }
    }),
  )

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'Vazifalar',
    exportedAt: new Date().toISOString(),
    data: {
      projects,
      tasks,
      meta: meta.filter((m) => EXPORTABLE_META.includes(m.key)),
      notes,
      attachments: serializedAttachments,
    },
  }
}

const isStr = (v) => typeof v === 'string'
const isISODate = (v) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
const validTs = (v) => (isStr(v) && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString())

/**
 * Zaxira faylini tekshiradi va normallashtiradi.
 * @param {string} text JSON matni
 * @returns {{ ok: true, data, summary } | { ok: false, errors: string[] }}
 */
export function validateBackup(text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['Fayl JSON formatida emas yoki shikastlangan.'] }
  }

  if (!json || typeof json !== 'object') return { ok: false, errors: ["Fayl tuzilmasi noto'g'ri."] }
  if (json.format !== BACKUP_FORMAT) {
    return { ok: false, errors: ["Bu fayl Vazifalar ilovasining zaxira nusxasi emas (format maydoni mos kelmadi)."] }
  }
  if (typeof json.version !== 'number' || json.version > BACKUP_VERSION) {
    return { ok: false, errors: ["Zaxira ilovaning yangiroq versiyasida yaratilgan. Avval ilovani yangilang."] }
  }
  const d = json.data
  if (!d || !Array.isArray(d.projects) || !Array.isArray(d.tasks)) {
    return { ok: false, errors: ["Faylda loyihalar yoki vazifalar ro'yxati topilmadi."] }
  }

  const errors = []
  const err = (msg) => errors.length < 6 && errors.push(msg)
  const projectIds = new Set()
  const taskIds = new Set()

  const projects = []
  d.projects.forEach((p, i) => {
    const n = `Loyiha #${i + 1}`
    if (!p || typeof p !== 'object') return err(`${n}: yozuv noto'g'ri.`)
    if (!isStr(p.id) || !p.id) return err(`${n}: "id" yo'q.`)
    if (projectIds.has(p.id)) return err(`${n}: "id" takrorlangan.`)
    if (!isStr(p.name) || !p.name.trim()) return err(`${n}: nomi yo'q.`)
    projectIds.add(p.id)
    projects.push({
      id: p.id,
      name: p.name.trim().slice(0, 60),
      color: isStr(p.color) && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#6366f1',
      icon: isStr(p.icon) ? p.icon.slice(0, 8) : '',
      createdAt: validTs(p.createdAt),
      updatedAt: validTs(p.updatedAt),
    })
  })

  let reassigned = 0
  const tasks = []
  d.tasks.forEach((t, i) => {
    const n = `Vazifa #${i + 1}`
    if (!t || typeof t !== 'object') return err(`${n}: yozuv noto'g'ri.`)
    if (!isStr(t.id) || !t.id) return err(`${n}: "id" yo'q.`)
    if (taskIds.has(t.id)) return err(`${n}: "id" takrorlangan.`)
    if (!isStr(t.title) || !t.title.trim()) return err(`${n}: sarlavha yo'q.`)
    if (!VALID_PERIODS.includes(t.periodType)) return err(`${n}: muddat turi noto'g'ri.`)
    if (!isISODate(t.date)) return err(`${n}: sana noto'g'ri.`)
    taskIds.add(t.id)
    // Loyihasi zaxirada yo'q vazifalar "Kiruvchi"ga o'tkaziladi
    let projectId = isStr(t.projectId) ? t.projectId : INBOX_ID
    if (projectId !== INBOX_ID && !projectIds.has(projectId)) {
      projectId = INBOX_ID
      reassigned++
    }
    const subtasks = Array.isArray(t.subtasks)
      ? t.subtasks
          .filter((s) => s && isStr(s.title) && s.title.trim())
          .map((s, si) => ({
            id: isStr(s.id) && s.id ? s.id : `sub_${i}_${si}`,
            title: s.title.trim().slice(0, 200),
            completed: s.completed === true,
          }))
      : []

    tasks.push({
      id: t.id,
      projectId,
      title: t.title.trim().slice(0, 200),
      description: isStr(t.description) ? t.description.slice(0, 2000) : '',
      periodType: t.periodType,
      date: t.date,
      priority: VALID_PRIORITIES.includes(t.priority) ? t.priority : 'medium',
      completed: t.completed === true,
      completedAt: isStr(t.completedAt) ? t.completedAt : null,
      deletedAt: isStr(t.deletedAt) ? t.deletedAt : null,
      subtasks,
      time: isStr(t.time) ? t.time : '',
      reminder: t.reminder === true,
      recurring: isStr(t.recurring) ? t.recurring : 'none',
      order: Number.isFinite(t.order) ? t.order : i,
      createdAt: validTs(t.createdAt),
      updatedAt: validTs(t.updatedAt),
    })
  })

  // Qaydlar (notes)
  const notes = []
  if (Array.isArray(d.notes)) {
    const noteIds = new Set()
    d.notes.forEach((n, i) => {
      const name = `Qayd #${i + 1}`
      if (!n || typeof n !== 'object') return err(`${name}: yozuv noto'g'ri.`)
      if (!isStr(n.id) || !n.id) return err(`${name}: "id" yo'q.`)
      if (noteIds.has(n.id)) return err(`${name}: "id" takrorlangan.`)
      noteIds.add(n.id)
      notes.push({
        id: n.id,
        title: isStr(n.title) ? n.title.slice(0, 300) : 'Sarlavhasiz qayd',
        content: n.content && typeof n.content === 'object' ? n.content : null,
        plainText: isStr(n.plainText) ? n.plainText : '',
        projectId: isStr(n.projectId) ? n.projectId : null,
        taskId: isStr(n.taskId) ? n.taskId : null,
        pinned: n.pinned === true,
        deletedAt: isStr(n.deletedAt) ? n.deletedAt : null,
        createdAt: validTs(n.createdAt),
        updatedAt: validTs(n.updatedAt),
      })
    })
  }

  // Biriktirmalar (attachments)
  const attachments = []
  if (Array.isArray(d.attachments)) {
    d.attachments.forEach((a) => {
      if (!a || typeof a !== 'object' || !isStr(a.id) || !isStr(a.noteId)) return
      attachments.push({
        id: a.id,
        noteId: a.noteId,
        name: isStr(a.name) ? a.name : 'attachment',
        type: isStr(a.type) ? a.type : 'image/png',
        size: Number.isFinite(a.size) ? a.size : 0,
        dataBase64: isStr(a.dataBase64) ? a.dataBase64 : null,
        createdAt: validTs(a.createdAt),
      })
    })
  }

  if (errors.length) return { ok: false, errors }

  const meta = Array.isArray(d.meta)
    ? d.meta.filter((m) => m && EXPORTABLE_META.includes(m.key)).map((m) => ({ key: m.key, value: m.value }))
    : []

  return {
    ok: true,
    data: { projects, tasks, meta, notes, attachments },
    summary: {
      projects: projects.length,
      tasks: tasks.length,
      notes: notes.length,
      attachments: attachments.length,
      reassigned,
      exportedAt: json.exportedAt ?? null,
    },
  }
}

/**
 * Tekshirilgan zaxirani yozadi.
 * - 'replace': joriy loyiha va vazifalar to'liq almashtiriladi
 * - 'merge': qo'shib birlashtiriladi; bir xil id bo'lsa updatedAt yangirog'i qoladi
 */
export async function importData(data, mode = 'replace') {
  const ops = []
  let added = 0
  let updated = 0
  let skipped = 0

  if (mode === 'replace') {
    ops.push(
      { type: 'clear', store: 'projects' },
      { type: 'clear', store: 'tasks' },
      { type: 'clear', store: 'notes' },
      { type: 'clear', store: 'attachments' },
    )
    data.projects.forEach((value) => ops.push({ type: 'put', store: 'projects', value }))
    data.tasks.forEach((value) => ops.push({ type: 'put', store: 'tasks', value }))
    data.meta.forEach((value) => ops.push({ type: 'put', store: 'meta', value }))
    if (data.notes) {
      data.notes.forEach((value) => ops.push({ type: 'put', store: 'notes', value }))
    }
    if (data.attachments) {
      data.attachments.forEach((att) => {
        const blob = att.dataBase64 ? base64ToBlob(att.dataBase64, att.type) : (att.blob || null)
        ops.push({ type: 'put', store: 'attachments', value: { ...att, blob } })
      })
    }
    if (!data.projects.some((p) => p.id === INBOX_ID)) {
      ops.push({ type: 'put', store: 'projects', value: createInboxProject() })
    }
    added = data.projects.length + data.tasks.length + (data.notes?.length || 0)
  } else {
    const [curProjects, curTasks, curNotes, curAttachments] = await Promise.all([
      A().getAll('projects'),
      A().getAll('tasks'),
      A().getAll('notes'),
      A().getAll('attachments'),
    ])
    const merge = (store, current, incoming, transform = (x) => x) => {
      const map = new Map(current.map((x) => [x.id, x]))
      for (const rawItem of incoming) {
        const item = transform(rawItem)
        const existing = map.get(item.id)
        if (!existing) {
          ops.push({ type: 'put', store, value: item })
          added++
        } else if ((item.updatedAt || item.createdAt || '') > (existing.updatedAt || existing.createdAt || '')) {
          ops.push({ type: 'put', store, value: item })
          updated++
        } else {
          skipped++
        }
      }
    }
    merge('projects', curProjects, data.projects)
    merge('tasks', curTasks, data.tasks)
    if (data.notes) merge('notes', curNotes, data.notes)
    if (data.attachments) {
      merge('attachments', curAttachments, data.attachments, (att) => {
        const blob = att.dataBase64 ? base64ToBlob(att.dataBase64, att.type) : (att.blob || null)
        return { ...att, blob }
      })
    }
  }

  await A().batch(ops)
  return { added, updated, skipped }
}

/* ------------------------------------------------------------------ */
/* Xatoliklar                                                          */
/* ------------------------------------------------------------------ */

/** Texnik xatoni foydalanuvchiga tushunarli o'zbekcha xabarga aylantiradi */
export function describeError(err) {
  switch (err?.name) {
    case 'QuotaExceededError':
      return "Qurilma xotirasi to'lgan. Zaxira oling va keraksiz ma'lumotlarni o'chiring."
    case 'InvalidStateError':
    case 'TransactionInactiveError':
      return "Ma'lumotlar bazasi bilan aloqa uzildi. Sahifani qayta yuklang."
    case 'VersionError':
      return "Bazaning yangiroq versiyasi topildi. Sahifani qayta yuklang."
    default:
      return "Ma'lumotni saqlashda xatolik yuz berdi. Qayta urinib ko'ring."
  }
}
