<script setup>
/**
 * Asosiy sahifa (HomeView).
 * - Yuqori panel: mobil burger tugmasi, tanlangan loyiha nomi, yangi vazifa tugmasi
 * - Muddat turlari tablari (Kunlik, Haftalik, Oylik, Yillik)
 * - Davr navigatori (← Bugun →, Sarlavha)
 * - Statistika va progress bar (Jami, Bajarilgan, Qolgan, %)
 * - Filtr va qidiruv paneli
 * - Vazifalar ro'yxati (muddati o'tganlar bloki bilan)
 * - Vazifa yaratish/tahrirlash modali
 */
import { ref, computed } from 'vue'
import { usePeriod } from '@/composables/usePeriod'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore, computeStats } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'
import PeriodTabs from '@/components/PeriodTabs.vue'
import PeriodNavigator from '@/components/PeriodNavigator.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import TaskToolbar from '@/components/TaskToolbar.vue'
import TaskList from '@/components/TaskList.vue'
import TaskForm from '@/components/TaskForm.vue'
import FocusModal from '@/components/FocusModal.vue'
import ProductivityModal from '@/components/ProductivityModal.vue'
import AppIcon from '@/components/AppIcon.vue'

const { periodType, key, currentKey, isCurrent } = usePeriod()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const uiStore = useUiStore()

// Modallar holati
const taskFormOpen = ref(false)
const taskToEdit = ref(null)

const focusModalOpen = ref(false)
const selectedTaskForFocus = ref(null)

const productivityModalOpen = ref(false)

// Tanlangan loyiha nomi va rangi
const currentProject = computed(() => {
  if (tasksStore.filter.projectId === 'all') {
    return { name: 'Barcha loyihalar', icon: '', color: 'var(--accent)' }
  }
  return projectsStore.byId[tasksStore.filter.projectId] || projectsStore.inbox
})

// Shu davrning tanlangan loyihadagi BARCHA xom vazifalari (statistika uchun)
// Clarification A2: "Ko'rsatilgan davrning sidebar'da tanlangan loyihadagi vazifalari.
// Holat filtri va qidiruv statistikaga ta'sir qilmaydi, 'Muddati o'tgan' bloki ham kirmaydi"
const periodRawTasks = computed(() => {
  return tasksStore.tasksInPeriod(periodType.value, key.value)
})

// Statistika hisobi
const stats = computed(() => computeStats(periodRawTasks.value))

// Ro'yxatda ko'rsatiladigan vazifalar (filtr, qidiruv va saralash qo'llangan)
const displayTasks = computed(() => {
  return tasksStore.applyView(periodRawTasks.value)
})

// Muddati o'tgan vazifalar (faqat joriy davr ko'rilayotganda)
const overdueTasks = computed(() => {
  if (!isCurrent.value) return []
  return tasksStore.overdueBefore(periodType.value, currentKey.value)
})

function openCreateTask() {
  taskToEdit.value = null
  taskFormOpen.value = true
}

function handleEditTask(task) {
  taskToEdit.value = task
  taskFormOpen.value = true
}

function handleDeleteTask(id) {
  tasksStore.remove(id)
}

function openFocusForTask(task) {
  selectedTaskForFocus.value = task
  focusModalOpen.value = true
}

function openGeneralFocus() {
  selectedTaskForFocus.value = null
  focusModalOpen.value = true
}
</script>

<template>
  <div class="home-view">
    <!-- Yuqori mobil panel -->
    <header class="view-header">
      <div class="header-left">
        <button
          type="button"
          class="btn btn-ghost btn-icon menu-btn"
          aria-label="Menyuni ochish"
          @click="uiStore.sidebarOpen = true"
        >
          <AppIcon name="menu" :size="22" />
        </button>

        <div class="project-tag">
          <span
            v-if="currentProject?.icon"
            class="project-tag-emoji"
          >
            {{ currentProject.icon }}
          </span>
          <span
            v-else
            class="project-tag-dot"
            :style="{ backgroundColor: currentProject?.color }"
          ></span>
          <h2 class="project-tag-title">{{ currentProject?.name }}</h2>
        </div>
      </div>

      <div class="header-actions">
        <!-- Streak va Statistika tugmasi -->
        <button
          type="button"
          class="btn btn-secondary header-action-btn streak-btn"
          :class="{ active: tasksStore.productivityStats.streak > 0 }"
          title="Streak va Unumdorlik statistikasi"
          @click="productivityModalOpen = true"
        >
          <AppIcon name="flame" :size="17" />
          <span class="streak-btn-text">{{ tasksStore.productivityStats.streak }} kun</span>
        </button>

        <!-- Pomodoro Fokus tugmasi -->
        <button
          type="button"
          class="btn btn-secondary header-action-btn focus-trigger-btn"
          title="Fokus rejimi (Pomodoro)"
          @click="openGeneralFocus"
        >
          <AppIcon name="timer" :size="17" />
          <span class="focus-btn-text">Fokus</span>
        </button>

        <button
          type="button"
          class="btn btn-primary new-task-btn"
          @click="openCreateTask"
        >
          <AppIcon name="plus" :size="18" />
          <span class="btn-text">Vazifa qo'shish</span>
        </button>
      </div>
    </header>

    <!-- Asosiy kontent maydoni -->
    <main class="view-content">
      <!-- 1. Muddat turlari tablari -->
      <section class="section-tabs">
        <PeriodTabs />
      </section>

      <!-- 2. Davr navigatori (sarlavha, sanalar, oldingi/keyingi) -->
      <section class="section-navigator">
        <PeriodNavigator />
      </section>

      <!-- 3. Statistika kartochkasi va progress bar -->
      <section class="section-stats card">
        <div class="stats-top">
          <div class="stats-badges">
            <span class="stat-item">
              <span class="stat-num">{{ stats.total }}</span>
              <span class="stat-lbl">jami</span>
            </span>
            <span class="stat-sep">•</span>
            <span class="stat-item success">
              <span class="stat-num">{{ stats.done }}</span>
              <span class="stat-lbl">bajarilgan</span>
            </span>
            <span class="stat-sep">•</span>
            <span class="stat-item">
              <span class="stat-num">{{ stats.left }}</span>
              <span class="stat-lbl">qolgan</span>
            </span>
          </div>

          <div class="stats-percent">
            <span class="percent-value">{{ stats.percent }}%</span>
          </div>
        </div>

        <ProgressBar :value="stats.percent" />
      </section>

      <!-- 4. Qidiruv va filtrlar paneli -->
      <section class="section-toolbar">
        <TaskToolbar />
      </section>

      <!-- 5. Vazifalar ro'yxati (muddati o'tganlar bilan) -->
      <section class="section-list">
        <TaskList
          :tasks="displayTasks"
          :overdue-tasks="overdueTasks"
          @create="openCreateTask"
          @edit="handleEditTask"
          @delete="handleDeleteTask"
          @focus="openFocusForTask"
        />
      </section>
    </main>

    <!-- Floating Action Button (Mobilda oson qo'shish uchun) -->
    <button
      type="button"
      class="fab-btn"
      aria-label="Vazifa qo'shish"
      @click="openCreateTask"
    >
      <AppIcon name="plus" :size="24" :stroke="2.5" />
    </button>

    <!-- Vazifa yaratish/tahrirlash modali -->
    <TaskForm
      :open="taskFormOpen"
      :task="taskToEdit"
      :default-period-type="periodType"
      :default-date="key"
      :default-project-id="tasksStore.filter.projectId"
      @close="taskFormOpen = false"
    />

    <!-- Pomodoro Fokus modali -->
    <FocusModal
      :open="focusModalOpen"
      :task="selectedTaskForFocus"
      @close="focusModalOpen = false"
    />

    <!-- Unumdorlik va Streak modali -->
    <ProductivityModal
      :open="productivityModalOpen"
      @close="productivityModalOpen = false"
    />
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.view-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: calc(14px + var(--safe-top)) 24px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.menu-btn {
  display: none;
}

.project-tag {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-tag-emoji {
  font-size: 18px;
}

.project-tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.project-tag-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.view-content {
  flex: 1;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 24px calc(60px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Statistika kartochkasi */
.section-stats {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-2);
}

.stat-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.stat-num {
  font-weight: 700;
  color: var(--text);
  font-size: 15px;
}

.stat-item.success .stat-num {
  color: var(--success);
}

.stat-sep {
  color: var(--text-3);
  font-size: 10px;
}

.percent-value {
  font-size: 15px;
  font-weight: 800;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* Floating Action Button */
.fab-btn {
  display: none;
  position: fixed;
  right: 20px;
  bottom: calc(24px + var(--safe-bottom));
  z-index: 30;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--grad-brand);
  color: #fff;
  box-shadow: 0 10px 25px -4px rgba(99, 70, 240, 0.6);
  place-items: center;
  transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}

.fab-btn:active {
  transform: scale(0.92);
}

@media (max-width: 900px) {
  .menu-btn {
    display: grid;
  }
}

@media (max-width: 640px) {
  .view-header {
    padding: calc(10px + var(--safe-top)) 16px 10px;
  }
  .view-content {
    padding: 16px 16px calc(80px + var(--safe-bottom));
    gap: 16px;
  }
  .new-task-btn .btn-text {
    display: none;
  }
  .new-task-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 10px;
  }
  .fab-btn {
    display: grid;
  }
  .streak-btn .streak-btn-text,
  .focus-trigger-btn .focus-btn-text {
    display: none;
  }
  .header-action-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.streak-btn {
  color: var(--text-2);
}

.streak-btn.active {
  color: #ea580c;
  background: rgba(249, 115, 22, 0.12);
  border-color: rgba(249, 115, 22, 0.3);
}

.streak-btn.active:hover {
  background: rgba(249, 115, 22, 0.18);
}

.focus-trigger-btn:hover {
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
