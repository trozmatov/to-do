<script setup>
/**
 * Vazifalar ro'yxati:
 * - Muddati o'tgan vazifalar bloki (agar joriy davr ko'rilayotgan bo'lsa)
 * - Davr vazifalari ro'yxati (vue-draggable-plus orqali sudrab tartiblash)
 * - Bo'sh holat ko'rinishi
 */
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useTasksStore } from '@/stores/tasks'
import { useSettingsStore } from '@/stores/settings'
import { usePeriod } from '@/composables/usePeriod'
import TaskItem from './TaskItem.vue'
import EmptyState from './EmptyState.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  tasks: { type: Array, required: true },
  overdueTasks: { type: Array, default: () => [] },
})

const emit = defineEmits(['edit', 'delete', 'create'])

const tasksStore = useTasksStore()
const settingsStore = useSettingsStore()
const { isCurrent } = usePeriod()

// Muddati o'tganlar bo'limini yopish/ochish holati
const overdueExpanded = ref(true)

// Sudrab tartiblash faqat quyidagi shartlarda faol:
// 1. Sozlamalarda "Qo'lda tartib" (manual) tanlangan
// 2. Qidiruv kiritilmagan
// 3. Holat filtri "Barchasi" (all) da turibdi
const canDrag = computed(() => {
  return (
    settingsStore.sortMode === 'manual' &&
    tasksStore.filter.status === 'all' &&
    !tasksStore.filter.search.trim()
  )
})

// Draggable ro'yxat uchun mahalliy reaktiv massiv
const localTasks = ref([...props.tasks])

watch(
  () => props.tasks,
  (newTasks) => {
    localTasks.value = [...newTasks]
  },
  { deep: false, immediate: true },
)

function onDragEnd() {
  const ids = localTasks.value.map((t) => t.id)
  tasksStore.reorder(ids)
}
</script>

<template>
  <div class="task-list-wrapper">
    <!-- 1. Muddati o'tgan vazifalar bloki (faqat joriy davrda va mavjud bo'lsa) -->
    <section
      v-if="isCurrent && overdueTasks.length > 0"
      class="overdue-section"
      aria-labelledby="overdue-heading"
    >
      <button
        type="button"
        class="overdue-header"
        :aria-expanded="overdueExpanded"
        @click="overdueExpanded = !overdueExpanded"
      >
        <div class="overdue-title-group">
          <span class="overdue-icon"><AppIcon name="alert" :size="16" /></span>
          <h3 id="overdue-heading" class="overdue-title">
            Muddati o'tgan vazifalar
          </h3>
          <span class="overdue-badge">{{ overdueTasks.length }}</span>
        </div>
        <span class="expand-icon" :class="{ rotated: overdueExpanded }">
          <AppIcon name="chevron-down" :size="18" />
        </span>
      </button>

      <div v-show="overdueExpanded" class="overdue-list">
        <p class="overdue-hint">
          Bu vazifalar o'tgan davrlarda bajarilmay qolgan. Ularni joriy davrga ko'chirishingiz yoki bajarishingiz mumkin.
        </p>
        <div class="tasks-container">
          <TaskItem
            v-for="task in overdueTasks"
            :key="task.id"
            :task="task"
            :can-drag="false"
            :show-move-action="true"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
        </div>
      </div>
    </section>

    <!-- 2. Asosiy davr vazifalari -->
    <section class="main-tasks-section" aria-label="Davr vazifalari">
      <div v-if="localTasks.length > 0">
        <VueDraggable
          v-model="localTasks"
          :animation="220"
          handle=".drag-handle"
          :disabled="!canDrag"
          ghost-class="sortable-ghost"
          drag-class="sortable-drag"
          class="tasks-container"
          @end="onDragEnd"
        >
          <TaskItem
            v-for="task in localTasks"
            :key="task.id"
            :task="task"
            :can-drag="canDrag"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
        </VueDraggable>
      </div>

      <!-- Bo'sh holat -->
      <EmptyState
        v-else-if="overdueTasks.length === 0"
        title="Ushbu davrda vazifalar yo'q"
        text="Yangi vazifa qo'shib rejalaringizni boshlang."
      >
        <button
          type="button"
          class="btn btn-primary"
          style="margin-top: 14px;"
          @click="emit('create')"
        >
          <AppIcon name="plus" :size="18" />
          <span>Vazifa qo'shish</span>
        </button>
      </EmptyState>

      <div v-else class="period-empty-sub">
        <p class="muted">Ushbu davrning o'zida yangi vazifalar yo'q.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.task-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Muddati o'tganlar bloki */
.overdue-section {
  background: var(--surface);
  border: 1px solid var(--danger);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 4px 16px -4px rgba(229, 72, 77, 0.15);
}

.overdue-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 700;
  text-align: left;
  border: none;
  cursor: pointer;
}

.overdue-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.overdue-icon {
  display: grid;
  place-items: center;
}

.overdue-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--danger);
}

.overdue-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: var(--danger);
  color: #fff;
}

.expand-icon {
  color: var(--danger);
  display: grid;
  place-items: center;
  transition: transform var(--dur) var(--ease);
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.overdue-list {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--surface);
}

.overdue-hint {
  font-size: 13px;
  color: var(--text-2);
  margin: 0;
}

/* Drag & Drop holatlari */
:deep(.sortable-ghost) {
  opacity: 0.35;
  background: var(--accent-soft) !important;
  border: 2px dashed var(--accent) !important;
}

:deep(.sortable-drag) {
  opacity: 0.95;
  cursor: grabbing !important;
  box-shadow: var(--shadow-lg) !important;
  transform: scale(1.02);
}

.period-empty-sub {
  text-align: center;
  padding: 24px;
}
</style>
