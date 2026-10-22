/**
 * Davr (kun / hafta / oy / yil) hisoblash mantiqi. Faqat native Date.
 *
 * Sanalar "YYYY-MM-DD" (ISO sana, mahalliy vaqt) ko'rinishida saqlanadi:
 * vaqt mintaqasi muammosi yo'q va satrlarni to'g'ridan-to'g'ri solishtirish mumkin.
 * Vazifaning `date` maydoni — uning davri boshlanadigan sana
 * (hafta uchun dushanba, oy uchun 1-kun, yil uchun 1-yanvar).
 */
import { ref, computed } from 'vue'

export const PERIOD_TYPES = ['day', 'week', 'month', 'year']

export const PERIOD_LABELS = { day: 'Kunlik', week: 'Haftalik', month: 'Oylik', year: 'Yillik' }

export const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]
const MONTHS_LOWER = MONTHS.map((m) => m.toLowerCase())

/** Dushanbadan boshlanadi */
export const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

/* ---------------- Asosiy yordamchilar ---------------- */

const pad = (n) => String(n).padStart(2, '0')

/** Date -> "YYYY-MM-DD" (mahalliy vaqt bo'yicha) */
export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "YYYY-MM-DD" -> mahalliy yarim tundagi Date */
export function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()

/** Hafta kuni indeksi: dushanba = 0 ... yakshanba = 6 */
const weekdayIndex = (d) => (d.getDay() + 6) % 7

/** Davr boshi */
export function startOfPeriod(type, date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  switch (type) {
    case 'week':
      d.setDate(d.getDate() - weekdayIndex(d))
      return d
    case 'month':
      return new Date(d.getFullYear(), d.getMonth(), 1)
    case 'year':
      return new Date(d.getFullYear(), 0, 1)
    default:
      return d
  }
}

/** Davr oxiri (oxirgi kun, o'zi ham kiradi) */
export function endOfPeriod(type, date) {
  const s = startOfPeriod(type, date)
  switch (type) {
    case 'week':
      return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
    case 'month':
      return new Date(s.getFullYear(), s.getMonth() + 1, 0)
    case 'year':
      return new Date(s.getFullYear(), 11, 31)
    default:
      return s
  }
}

/** Sanani n ta davrga siljitadi (oy/yilda kun saqlanadi, oy oxiridan oshib ketmaydi) */
export function shiftPeriod(type, date, n) {
  const y = date.getFullYear()
  const m = date.getMonth()
  const day = date.getDate()
  switch (type) {
    case 'week':
      return new Date(y, m, day + 7 * n)
    case 'month': {
      const target = new Date(y, m + n, 1)
      return new Date(target.getFullYear(), target.getMonth(), Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())))
    }
    case 'year':
      return new Date(y + n, m, Math.min(day, daysInMonth(y + n, m)))
    default:
      return new Date(y, m, day + n)
  }
}

/** Vazifa uchun saqlanadigan kalit: davr boshining ISO sanasi */
export function periodKey(type, date) {
  return toISODate(startOfPeriod(type, date))
}

/** ISO 8601 hafta raqami (hafta dushanbadan, 1-hafta — yilning birinchi payshanbasi bor hafta) */
export function isoWeek(date) {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7)
  return { week, year: t.getUTCFullYear() }
}

/* ---------------- Nomlar ---------------- */

/** "16-oktyabr" */
export const dayMonth = (d) => `${d.getDate()}-${MONTHS_LOWER[d.getMonth()]}`

/** Hafta oralig'i: "12–18-oktyabr, 2026" yoki "29-sentyabr – 5-oktyabr, 2026" */
function weekRange(start) {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  if (start.getFullYear() !== end.getFullYear()) {
    return `${dayMonth(start)}, ${start.getFullYear()} – ${dayMonth(end)}, ${end.getFullYear()}`
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${dayMonth(start)} – ${dayMonth(end)}, ${end.getFullYear()}`
  }
  return `${start.getDate()}–${end.getDate()}-${MONTHS_LOWER[end.getMonth()]}, ${end.getFullYear()}`
}

/** Sarlavha: "16-oktyabr, 2026" | "42-hafta" | "Oktyabr 2026" | "2026-yil" */
export function periodLabel(type, date) {
  const s = startOfPeriod(type, date)
  switch (type) {
    case 'week':
      return `${isoWeek(s).week}-hafta`
    case 'month':
      return `${MONTHS[s.getMonth()]} ${s.getFullYear()}`
    case 'year':
      return `${s.getFullYear()}-yil`
    default:
      return `${dayMonth(s)}, ${s.getFullYear()}`
  }
}

/** Qo'shimcha izoh: hafta kuni, hafta oralig'i, oydagi kunlar soni */
export function periodSubtitle(type, date) {
  const s = startOfPeriod(type, date)
  switch (type) {
    case 'week':
      return weekRange(s)
    case 'month':
      return `1–${daysInMonth(s.getFullYear(), s.getMonth())}-${MONTHS_LOWER[s.getMonth()]}`
    case 'year':
      return '1-yanvar – 31-dekabr'
    default:
      return WEEKDAYS[weekdayIndex(s)]
  }
}

/** Vazifa kartochkasi uchun qisqa nom (joriy yildan farq qilsa yil qo'shiladi) */
export function periodShortLabel(type, isoDate, todayISO = toISODate(new Date())) {
  const d = parseISODate(isoDate)
  const sameYear = d.getFullYear() === parseISODate(todayISO).getFullYear()
  const yearSuffix = sameYear ? '' : `, ${d.getFullYear()}`
  switch (type) {
    case 'week':
      return `${isoWeek(d).week}-hafta${sameYear ? '' : `, ${isoWeek(d).year}`}`
    case 'month':
      return `${MONTHS[d.getMonth()]}${yearSuffix}`
    case 'year':
      return `${d.getFullYear()}-yil`
    default:
      return `${dayMonth(d)}${yearSuffix}`
  }
}

/** Bugun / Ertaga / Kecha yoki null */
export function relativeDay(isoDate, todayISO) {
  const diff = Math.round((parseISODate(isoDate) - parseISODate(todayISO)) / 86400000)
  if (diff === 0) return 'Bugun'
  if (diff === 1) return 'Ertaga'
  if (diff === -1) return 'Kecha'
  return null
}

/** Vazifa muddati o'tganmi: bajarilmagan va davri bugundan oldin tugagan */
export function isOverdue(task, todayISO) {
  if (task.completed) return false
  return toISODate(endOfPeriod(task.periodType, parseISODate(task.date))) < todayISO
}

/* ---------------- Umumiy (singleton) holat ---------------- */

const periodType = ref('day')
/** Tanlangan sana (davr shu sanani o'z ichiga oladi) */
const anchorISO = ref(toISODate(new Date()))
/** "Bugun" — yarim tundan keyin avtomatik yangilanadi */
const todayISO = ref(toISODate(new Date()))

let tickerStarted = false
function startTodayTicker() {
  if (tickerStarted || typeof window === 'undefined') return
  tickerStarted = true
  const tick = () => {
    const now = toISODate(new Date())
    if (now === todayISO.value) return
    // Foydalanuvchi bugungi davrni ko'rib turgan bo'lsa, yangi kunga o'tkazamiz
    if (anchorISO.value === todayISO.value) anchorISO.value = now
    todayISO.value = now
  }
  setInterval(tick, 60_000)
  document.addEventListener('visibilitychange', tick)
}

/**
 * Tanlangan davr bilan ishlash uchun composable.
 * Holat butun ilova bo'ylab umumiy (sarlavha, ro'yxat va statistika bir xil davrni ko'radi).
 */
export function usePeriod() {
  startTodayTicker()

  const anchor = computed(() => parseISODate(anchorISO.value))
  const start = computed(() => startOfPeriod(periodType.value, anchor.value))
  const end = computed(() => endOfPeriod(periodType.value, anchor.value))
  const key = computed(() => toISODate(start.value))
  const label = computed(() => periodLabel(periodType.value, anchor.value))
  const subtitle = computed(() => periodSubtitle(periodType.value, anchor.value))
  const currentKey = computed(() => periodKey(periodType.value, parseISODate(todayISO.value)))
  const isCurrent = computed(() => key.value === currentKey.value)
  const isPast = computed(() => key.value < currentKey.value)

  const setType = (t) => {
    if (PERIOD_TYPES.includes(t)) periodType.value = t
  }
  const prev = () => (anchorISO.value = toISODate(shiftPeriod(periodType.value, anchor.value, -1)))
  const next = () => (anchorISO.value = toISODate(shiftPeriod(periodType.value, anchor.value, 1)))
  const goToday = () => (anchorISO.value = todayISO.value)

  return {
    periodType,
    anchorISO,
    todayISO,
    start,
    end,
    key,
    label,
    subtitle,
    currentKey,
    isCurrent,
    isPast,
    setType,
    prev,
    next,
    goToday,
  }
}

/** Faqat "bugun" kerak bo'lganda (masalan, widget) */
export function useToday() {
  startTodayTicker()
  return todayISO
}
