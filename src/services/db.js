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
export const DB_VERSION = 1
export const INBOX_ID = 'inbox'

export const BACKUP_FORMAT = 'todo-app-backup'
export const BACKUP_VERSION = 1

const STORES = ['projects', 'tasks', 'meta']
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
    // case 1: kelajakdagi migratsiya shu yerga yoziladi (DB_VERSION = 2 bo'lganda)
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
  const [projects, tasks, meta] = await Promise.all([A().getAll('projects'), A().getAll('tasks'), A().getAll('meta')])
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'Vazifalar',
    exportedAt: new Date().toISOString(),
    data: {
      projects,
      tasks,
      meta: meta.filter((m) => EXPORTABLE_META.includes(m.key)),
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

  if (errors.length) return { ok: false, errors }

  const meta = Array.isArray(d.meta)
    ? d.meta.filter((m) => m && EXPORTABLE_META.includes(m.key)).map((m) => ({ key: m.key, value: m.value }))
    : []

  return {
    ok: true,
    data: { projects, tasks, meta },
    summary: { projects: projects.length, tasks: tasks.length, reassigned, exportedAt: json.exportedAt ?? null },
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
    ops.push({ type: 'clear', store: 'projects' }, { type: 'clear', store: 'tasks' })
    data.projects.forEach((value) => ops.push({ type: 'put', store: 'projects', value }))
    data.tasks.forEach((value) => ops.push({ type: 'put', store: 'tasks', value }))
    data.meta.forEach((value) => ops.push({ type: 'put', store: 'meta', value }))
    if (!data.projects.some((p) => p.id === INBOX_ID)) {
      ops.push({ type: 'put', store: 'projects', value: createInboxProject() })
    }
    added = data.projects.length + data.tasks.length
  } else {
    const [curProjects, curTasks] = await Promise.all([A().getAll('projects'), A().getAll('tasks')])
    const merge = (store, current, incoming) => {
      const map = new Map(current.map((x) => [x.id, x]))
      for (const item of incoming) {
        const existing = map.get(item.id)
        if (!existing) {
          ops.push({ type: 'put', store, value: item })
          added++
        } else if ((item.updatedAt || '') > (existing.updatedAt || '')) {
          ops.push({ type: 'put', store, value: item })
          updated++
        } else {
          skipped++
        }
      }
    }
    merge('projects', curProjects, data.projects)
    merge('tasks', curTasks, data.tasks)
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
