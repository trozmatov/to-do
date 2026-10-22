<script setup>
/**
 * Yagona vazifa elementi kartochkasi.
 * - Bajarilgan/bajarilmagan checkbox (silliq animatsiya, konfetti/ovoz)
 * - Sarlavha va izoh
 * - Ichki vazifalar (Checklist) va mini progress bar
 * - Aniq vaqt va eslatma belgisi
 * - Takrorlanish belgisi (Har kuni, Har hafta...)
 * - Fokus rejimi (Pomodoro) tugmasi
 * - Muhimlik darajasi, loyiha va muddat nishonlari
 * - Muddati o'tganlik indikatori va "Joriy davrga ko'chirish"
 * - Tahrirlash va o'chirish amallari
 * - Drag handle (tutqich)
 */
import { ref, computed } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import { usePeriod, periodShortLabel, isOverdue } from '@/composables/usePeriod'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  task: { type: Object, required: true },
  canDrag: { type: Boolean, default: false },
  showMoveAction: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'delete', 'focus'])

const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const { todayISO, key: currentPeriodKey } = usePeriod()

const subtasksExpanded = ref(true)

const project = computed(() => projectsStore.byId[props.task.projectId])
const overdue = computed(() => isOverdue(props.task, todayISO.value))

const priorityLabels = {
  high: 'Yuqori',
  medium: "O'rta",
  low: 'Past',
}

const recurringLabels = {
  daily: 'Har kuni',
  weekdays: 'Ish kunlari',
  weekly: 'Har hafta',
  monthly: 'Har oy',
}

const dateLabel = computed(() => periodShortLabel(props.task.periodType, props.task.date, todayISO.value))

const hasSubtasks = computed(() => Array.isArray(props.task.subtasks) && props.task.subtasks.length > 0)
const subtasksDoneCount = computed(() => (props.task.subtasks || []).filter((s) => s.completed).length)
const subtasksPercent = computed(() => {
  if (!hasSubtasks.value) return 0
  return Math.round((subtasksDoneCount.value / props.task.subtasks.length) * 100)
})

function handleToggle(event) {
  tasksStore.toggle(props.task.id, event)
}

function handleToggleSubtask(subtaskId) {
  tasksStore.toggleSubtask(props.task.id, subtaskId)
}

function handleMoveToCurrent() {
  tasksStore.moveToPeriod(props.task.id, currentPeriodKey.value)
}
</script>

<template>
  <div
    class="task-item card"
    :class="{
      completed: task.completed,
      overdue: overdue && !task.completed,
      [`prio-${task.priority}`]: true,
    }"
  >
    <div v-if="canDrag" class="drag-handle" title="Tartibni o'zgartirish uchun sudrang">
      <AppIcon name="grip" :size="16" />
    </div>

    <!-- Checkbox -->
    <button
      type="button"
      class="checkbox-btn"
      :class="{ checked: task.completed }"
      role="checkbox"
      :aria-checked="task.completed"
      :aria-label="task.completed ? 'Bajarilmagan deb belgilash' : 'Bajarilgan deb belgilash'"
      @click="handleToggle"
    >
      <AppIcon v-if="task.completed" name="check" :size="14" :stroke="3" />
    </button>

    <!-- Kontent -->
    <div class="task-content">
      <div class="task-main">
        <h4 class="task-title" :class="{ strike: task.completed }">
          {{ task.title }}
        </h4>
        <p v-if="task.description" class="task-desc">
          {{ task.description }}
        </p>
      </div>

      <!-- Ichki vazifalar (Subtasks / Checklist) -->
      <div v-if="hasSubtasks" class="subtasks-container">
        <div
          class="subtasks-header"
          @click="subtasksExpanded = !subtasksExpanded"
        >
          <div class="subtasks-badge">
            <AppIcon name="list-checks" :size="13" />
            <span>{{ subtasksDoneCount }}/{{ task.subtasks.length }} qadam</span>
          </div>
          <div class="subtasks-progress-mini">
            <div
              class="subtasks-progress-fill"
              :style="{ width: `${subtasksPercent}%` }"
            ></div>
          </div>
          <span class="subtasks-chevron" :class="{ open: subtasksExpanded }">
            <AppIcon name="chevron-down" :size="13" />
          </span>
        </div>

        <div v-show="subtasksExpanded" class="subtasks-items">
          <div
            v-for="st in task.subtasks"
            :key="st.id"
            class="subtask-item"
            @click="handleToggleSubtask(st.id)"
          >
            <span class="subtask-checkbox" :class="{ checked: st.completed }">
              <AppIcon v-if="st.completed" name="check" :size="10" :stroke="3" />
            </span>
            <span class="subtask-title" :class="{ strike: st.completed }">
              {{ st.title }}
            </span>
          </div>
        </div>
      </div>

      <!-- Nishonlar: Loyiha, Sana, Vaqt, Takrorlanish, Muhimlik, Muddati o'tganlik -->
      <div class="task-meta">
        <!-- Loyiha -->
        <span
          v-if="project"
          class="meta-chip project-chip"
          :style="{ '--proj-color': project.color }"
        >
          <span class="proj-dot" :style="{ backgroundColor: project.color }"></span>
          <span v-if="project.icon" class="proj-emoji">{{ project.icon }}</span>
          <span class="proj-name">{{ project.name }}</span>
        </span>

        <!-- Sana / Davr -->
        <span class="meta-chip date-chip" :class="{ 'chip-danger': overdue && !task.completed }">
          <AppIcon name="calendar" :size="12" />
          <span>{{ dateLabel }}</span>
        </span>

        <!-- Aniq vaqt & Eslatma -->
        <span v-if="task.time" class="meta-chip time-chip">
          <AppIcon name="clock" :size="12" />
          <span>{{ task.time }}</span>
          <AppIcon v-if="task.reminder" name="bell" :size="11" class="reminder-bell-icon" />
        </span>

        <!-- Takrorlanish -->
        <span
          v-if="task.recurring && task.recurring !== 'none'"
          class="meta-chip recurring-chip"
          :title="`Takrorlanuvchi: ${recurringLabels[task.recurring]}`"
        >
          <AppIcon name="repeat" :size="11" />
          <span>{{ recurringLabels[task.recurring] }}</span>
        </span>

        <!-- Muhimlik -->
        <span class="meta-chip prio-chip" :class="`prio-${task.priority}`">
          <span class="prio-indicator"></span>
          <span>{{ priorityLabels[task.priority] }}</span>
        </span>

        <!-- Muddati o'tgan belgisi -->
        <span v-if="overdue && !task.completed" class="meta-chip overdue-chip">
          <AppIcon name="alert" :size="12" />
          <span>Muddati o'tgan</span>
        </span>
      </div>
    </div>

    <!-- Amallar -->
    <div class="task-actions">
      <!-- Pomodoro Fokus taymeri tugmasi -->
      <button
        type="button"
        class="action-btn focus-btn"
        title="Fokus rejimi (Pomodoro)"
        aria-label="Fokus rejimida ishlash"
        @click="emit('focus', task)"
      >
        <AppIcon name="timer" :size="15" />
      </button>

      <!-- Joriy davrga ko'chirish tugmasi (faqat muddati o'tgan vazifalarda) -->
      <button
        v-if="showMoveAction || (overdue && !task.completed)"
        type="button"
        class="action-btn move-btn"
        title="Joriy davrga ko'chirish"
        aria-label="Joriy davrga ko'chirish"
        @click="handleMoveToCurrent"
      >
        <AppIcon name="refresh" :size="15" />
        <span class="btn-text">Joriy davrga</span>
      </button>

      <button
        type="button"
        class="action-btn edit-btn"
        title="Tahrirlash"
        aria-label="Vazifani tahrirlash"
        @click="emit('edit', task)"
      >
        <AppIcon name="edit" :size="15" />
      </button>

      <button
        type="button"
        class="action-btn delete-btn"
        title="Savatchaga o'tkazish"
        aria-label="Vazifani o'chirish"
        @click="emit('delete', task.id)"
      >
        <AppIcon name="trash" :size="15" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all var(--dur) var(--ease);
  position: relative;
  box-shadow: var(--shadow-sm);
}

.task-item:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.task-item.completed {
  opacity: 0.65;
  background: var(--surface-2);
}

.task-item.overdue {
  border-left: 3px solid var(--danger);
}

.drag-handle {
  cursor: grab;
  color: var(--text-3);
  display: flex;
  align-items: center;
  padding-top: 4px;
  user-select: none;
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Checkbox */
.checkbox-btn {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  border-radius: 7px;
  border: 2px solid var(--border-strong);
  background: transparent;
  display: grid;
  place-items: center;
  margin-top: 2px;
  transition: all 0.2s var(--ease-spring);
  color: #fff;
  flex-shrink: 0;
  cursor: pointer;
}

.checkbox-btn:hover {
  border-color: var(--accent);
}

.checkbox-btn.checked {
  background: var(--grad-brand);
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(99, 70, 240, 0.4);
}

.task-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  word-break: break-word;
  transition: color var(--dur) var(--ease);
}

.task-title.strike {
  text-decoration: line-through;
  color: var(--text-3);
}

.task-desc {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Subtasks kartochka ichida */
.subtasks-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--surface-2);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.subtasks-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.subtasks-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-2);
}

.subtasks-progress-mini {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.subtasks-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.25s var(--ease);
}

.subtasks-chevron {
  color: var(--text-3);
  display: grid;
  place-items: center;
  transition: transform var(--dur) var(--ease);
}

.subtasks-chevron.open {
  transform: rotate(180deg);
}

.subtasks-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--border);
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}

.subtask-item:hover {
  background: var(--hover);
}

.subtask-checkbox {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1.5px solid var(--border-strong);
  background: var(--surface-solid);
  display: grid;
  place-items: center;
  color: #fff;
  flex-shrink: 0;
  transition: all var(--dur) var(--ease);
}

.subtask-checkbox.checked {
  background: var(--accent);
  border-color: var(--accent);
}

.subtask-title {
  font-size: 12.5px;
  color: var(--text);
  line-height: 1.3;
}

.subtask-title.strike {
  text-decoration: line-through;
  color: var(--text-3);
}

/* Meta ma'lumotlar nishonlari */
.task-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  background: var(--surface-2);
  color: var(--text-2);
  line-height: 1;
}

.time-chip {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.reminder-bell-icon {
  margin-left: 1px;
  color: var(--warning);
}

.recurring-chip {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface-2));
  color: var(--accent);
  font-weight: 600;
}

.proj-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.proj-emoji {
  font-size: 11px;
}

.prio-chip.prio-high {
  background: var(--danger-soft);
  color: var(--danger);
}
.prio-chip.prio-medium {
  background: var(--warning-soft);
  color: var(--warning);
}
.prio-chip.prio-low {
  background: var(--success-soft);
  color: var(--success);
}

.prio-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.overdue-chip {
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 600;
}

/* Amallar */
.task-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0.4;
  transition: opacity var(--dur) var(--ease);
  flex-shrink: 0;
}

.task-item:hover .task-actions,
.task-item:focus-within .task-actions {
  opacity: 1;
}

@media (pointer: coarse) {
  .task-actions {
    opacity: 0.85;
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 6px;
  border-radius: 8px;
  color: var(--text-3);
  transition: all var(--dur) var(--ease);
}

.action-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.focus-btn:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.move-btn {
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 12px;
  font-weight: 600;
  padding: 0 8px;
}

.move-btn:hover {
  background: var(--accent);
  color: #fff;
}

.delete-btn:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

@media (max-width: 640px) {
  .move-btn .btn-text {
    display: none;
  }
}
</style>
