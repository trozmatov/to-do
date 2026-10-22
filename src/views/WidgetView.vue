<script setup>
/**
 * macOS / Desktop Widget ko'rinishi (/widget).
 * - Ixcham 360-420px kenglikdagi oyna
 * - Faqat bugungi vazifalar va muddati o'tganlar
 * - Tezkor vazifa qo'shish maydoni
 * - Mini progress bar
 * - To'liq ilovaga o'tish havolasi
 * - macOS'da Safari "Add to Dock" yoki Chrome "Install" orqali oyna ochish yo'riqnomasi
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToday, periodKey, parseISODate, periodLabel, isOverdue } from '@/composables/usePeriod'
import { useTasksStore, computeStats } from '@/stores/tasks'
import { useProjectsStore } from '@/stores/projects'
import ProgressBar from '@/components/ProgressBar.vue'
import BaseModal from '@/components/BaseModal.vue'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const todayISO = useToday()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()

const quickTitle = ref('')
const isAdding = ref(false)
const infoModalOpen = ref(false)

const todayDate = computed(() => parseISODate(todayISO.value))
const headerLabel = computed(() => periodLabel('day', todayDate.value))

// Bugungi kunlik vazifalar
const todayTasks = computed(() => {
  return tasksStore.items.filter(
    (t) => t.periodType === 'day' && t.date === todayISO.value,
  )
})

// Muddati o'tgan kunlik vazifalar
const overdueDayTasks = computed(() => {
  return tasksStore.items.filter(
    (t) => !t.completed && t.periodType === 'day' && t.date < todayISO.value,
  )
})

// Barcha ko'rsatiladigan vazifalar: muddati o'tganlar + bugungilar
const allWidgetTasks = computed(() => {
  return [...overdueDayTasks.value, ...todayTasks.value]
})

const stats = computed(() => computeStats(todayTasks.value))

async function handleQuickAdd() {
  const text = quickTitle.value.trim()
  if (!text) return
  isAdding.value = true
  await tasksStore.create({
    title: text,
    periodType: 'day',
    date: todayISO.value,
    projectId: 'inbox',
    priority: 'medium',
  })
  quickTitle.value = ''
  isAdding.value = false
}

function handleToggle(id) {
  tasksStore.toggle(id)
}

function handleMove(id) {
  tasksStore.moveToPeriod(id, todayISO.value)
}

function handleDelete(id) {
  tasksStore.remove(id)
}
</script>

<template>
  <div class="widget-page">
    <div class="widget-card card">
      <!-- Widget Header -->
      <header class="widget-header">
        <div class="header-titles">
          <span class="widget-badge">Bugun</span>
          <h1 class="widget-date">{{ headerLabel }}</h1>
        </div>

        <div class="header-tools">
          <button
            type="button"
            class="tool-btn"
            title="Widget haqida ma'lumot"
            aria-label="Widget haqida"
            @click="infoModalOpen = true"
          >
            <AppIcon name="info" :size="16" />
          </button>
          <button
            type="button"
            class="tool-btn"
            title="To'liq ilovaga o'tish"
            aria-label="To'liq ilovaga o'tish"
            @click="router.push('/')"
          >
            <AppIcon name="external" :size="16" />
          </button>
        </div>
      </header>

      <!-- Progress bar -->
      <div class="widget-progress-section">
        <div class="progress-info">
          <span class="progress-counts">
            {{ stats.done }}/{{ stats.total }} bajarildi
          </span>
          <span class="progress-percent">{{ stats.percent }}%</span>
        </div>
        <ProgressBar :value="stats.percent" size="sm" />
      </div>

      <!-- Tezkor qo'shish maydoni -->
      <form class="quick-add-form" @submit.prevent="handleQuickAdd">
        <input
          v-model="quickTitle"
          type="text"
          class="quick-input"
          placeholder="Bugungi yangi vazifa..."
          maxlength="200"
          :disabled="isAdding"
        />
        <button
          type="submit"
          class="quick-add-btn"
          aria-label="Qo'shish"
          :disabled="!quickTitle.trim() || isAdding"
        >
          <AppIcon name="plus" :size="16" />
        </button>
      </form>

      <!-- Vazifalar ro'yxati -->
      <div class="widget-tasks-scroll">
        <!-- Muddati o'tganlar qisqa bloki -->
        <div v-if="overdueDayTasks.length > 0" class="widget-overdue-alert">
          <div class="alert-head">
            <AppIcon name="alert" :size="13" />
            <span>{{ overdueDayTasks.length }} ta o'tgan kunlardan qolgan</span>
          </div>
          <div class="overdue-items-mini">
            <div
              v-for="t in overdueDayTasks"
              :key="t.id"
              class="mini-task-row overdue-row"
            >
              <button
                type="button"
                class="mini-check"
                @click="handleToggle(t.id)"
              >
                <AppIcon v-if="t.completed" name="check" :size="12" :stroke="3" />
              </button>
              <span class="mini-title">{{ t.title }}</span>
              <button
                type="button"
                class="mini-move-btn"
                title="Bugunga ko'chirish"
                @click="handleMove(t.id)"
              >
                Bugunga
              </button>
            </div>
          </div>
        </div>

        <!-- Bugungi vazifalar ro'yxati -->
        <div v-if="todayTasks.length > 0" class="today-tasks-list">
          <div
            v-for="task in todayTasks"
            :key="task.id"
            class="mini-task-row"
            :class="{ completed: task.completed }"
          >
            <button
              type="button"
              class="mini-check"
              :class="{ checked: task.completed }"
              @click="handleToggle(task.id)"
            >
              <AppIcon v-if="task.completed" name="check" :size="12" :stroke="3" />
            </button>
            <span class="mini-title" :class="{ strike: task.completed }">
              {{ task.title }}
            </span>
            <button
              type="button"
              class="mini-del-btn"
              title="O'chirish"
              @click="handleDelete(task.id)"
            >
              <AppIcon name="x" :size="13" />
            </button>
          </div>
        </div>

        <!-- Bo'sh holat -->
        <div v-else-if="overdueDayTasks.length === 0" class="widget-empty">
          <AppIcon name="check" :size="28" class="empty-check" />
          <p class="empty-title">Bugun uchun vazifalar yo'q</p>
          <span class="empty-desc">Yuqoridagi maydondan tezda vazifa qo'shishingiz mumkin.</span>
        </div>
      </div>

      <!-- Footer havolasi -->
      <footer class="widget-footer">
        <router-link to="/" class="full-app-link">
          <span>To'liq ro'yxatni ochish</span>
          <AppIcon name="arrow-right" :size="14" />
        </router-link>
      </footer>
    </div>

    <!-- macOS Widget rejimi haqida ma'lumot modali -->
    <BaseModal
      :open="infoModalOpen"
      title="macOS Widget rejimi"
      width="440px"
      @close="infoModalOpen = false"
    >
      <div class="widget-info-modal">
        <p>
          Ushbu sahifa macOS va boshqa kompyuterlarda ixcham oyna (widget) shaklida foydalanish uchun mo'ljallangan.
        </p>

        <div class="how-to-box">
          <strong>Alohida oyna sifatida ochish:</strong>
          <ul>
            <li><strong>Chrome / Edge:</strong> Manzil panelidagi o'rnatish belgisini bosing yoki menyudan "Yorliq yaratish (Oyna sifatida ochish)" bandini tanlang.</li>
            <li><strong>macOS Sonoma+ Safari:</strong> "Fayl" &gt; "Dock'ka qo'shish..." orqali mini-ilova qiling. Oyna o'lchamini ixcham (360×480) qilib burchakka joylashtiring.</li>
          </ul>
        </div>

        <div class="note-box">
          <AppIcon name="info" :size="16" />
          <p>
            Haqiqiy macOS Notification Center widgeti (WidgetKit) faqat Swift native ilovasi orqali ishlaydi. PWA texnologiyasi esa mustaqil ixcham oyna sifatida ishlash imkoniyatini beradi.
          </p>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="btn btn-primary"
          @click="infoModalOpen = false"
        >
          Tushunarli
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.widget-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--bg);
}

.widget-card {
  width: 100%;
  max-width: 380px;
  height: 520px;
  display: flex;
  flex-direction: column;
  background: var(--surface-solid);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.widget-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.widget-date {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--text-2);
  transition: all var(--dur) var(--ease);
}

.tool-btn:hover {
  background: var(--hover);
  color: var(--text);
}

/* Progress */
.widget-progress-section {
  padding: 10px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--surface-2);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.progress-percent {
  color: var(--accent);
  font-weight: 700;
}

/* Quick Add */
.quick-add-form {
  position: relative;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.quick-input {
  width: 100%;
  height: 36px;
  padding: 0 34px 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--input-bg);
  color: var(--text);
  font-size: 13.5px;
}

.quick-input:focus {
  outline: none;
  border-color: var(--accent);
}

.quick-add-btn {
  position: absolute;
  right: 24px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  transition: transform var(--dur) var(--ease);
}

.quick-add-btn:disabled {
  opacity: 0.3;
}

/* Scrollable Tasks */
.widget-tasks-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-task-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all var(--dur) var(--ease);
}

.mini-task-row.completed {
  opacity: 0.6;
}

.mini-check {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--border-strong);
  display: grid;
  place-items: center;
  color: #fff;
  transition: all var(--dur) var(--ease);
}

.mini-check.checked {
  background: var(--accent);
  border-color: transparent;
}

.mini-title {
  flex: 1;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-title.strike {
  text-decoration: line-through;
  color: var(--text-3);
}

.mini-del-btn {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: var(--text-3);
  opacity: 0.4;
}

.mini-task-row:hover .mini-del-btn {
  opacity: 1;
}

.mini-del-btn:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

/* Muddati o'tganlar */
.widget-overdue-alert {
  background: var(--danger-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--danger);
}

.alert-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--danger);
}

.overdue-items-mini {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overdue-row {
  background: var(--surface-solid);
}

.mini-move-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent);
}

.mini-move-btn:hover {
  background: var(--accent);
  color: #fff;
}

/* Bo'sh holat */
.widget-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px 16px;
  gap: 6px;
}

.empty-check {
  color: var(--success);
  margin-bottom: 4px;
}

.empty-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.empty-desc {
  font-size: 12px;
  color: var(--text-2);
}

/* Footer */
.widget-footer {
  padding: 10px 18px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.full-app-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.full-app-link:hover {
  text-decoration: underline;
}

/* Info Modal */
.widget-info-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text);
}

.how-to-box {
  background: var(--surface-2);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.how-to-box ul {
  margin-top: 6px;
  padding-left: 18px;
  list-style: disc;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--text);
  font-size: 12.5px;
}
</style>
