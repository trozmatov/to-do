<script setup>
/**
 * Vazifa yaratish va tahrirlash formasi (BaseModal ichida).
 * - Sarlavha va izoh
 * - Loyiha tanlash
 * - Muddat turi va sana
 * - Aniq vaqt va Eslatma (Notification)
 * - Takrorlanish (Recurring: har kuni, ish kunlari, har hafta, har oy)
 * - Ichki vazifalar (Subtasks / Checklist)
 * - Muhimlik darajasi
 */
import { ref, computed, watch } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import {
  PERIOD_TYPES,
  PERIOD_LABELS,
  startOfPeriod,
  toISODate,
  parseISODate,
} from '@/composables/usePeriod'
import { notifications } from '@/services/notifications'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null }, // agar null bo'lsa yangi vazifa, aks holda tahrirlash
  defaultPeriodType: { type: String, default: 'day' },
  defaultDate: { type: String, default: '' },
  defaultProjectId: { type: String, default: '' },
})

const emit = defineEmits(['close', 'saved'])

const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

const title = ref('')
const description = ref('')
const projectId = ref('inbox')
const periodType = ref('day')
const date = ref('')
const time = ref('')
const reminder = ref(false)
const recurring = ref('none')
const subtasks = ref([])
const newSubtaskTitle = ref('')
const priority = ref('medium')
const completed = ref(false)
const busy = ref(false)
const errorMessage = ref('')

const isEditing = computed(() => !!props.task)

const priorityOptions = [
  { value: 'low', label: 'Past', color: 'var(--p-low)' },
  { value: 'medium', label: "O'rta", color: 'var(--p-medium)' },
  { value: 'high', label: 'Yuqori', color: 'var(--p-high)' },
]

const recurringOptions = [
  { value: 'none', label: 'Takrorlanmasin' },
  { value: 'daily', label: 'Har kuni' },
  { value: 'weekdays', label: 'Ish kunlari (Dush-Juma)' },
  { value: 'weekly', label: 'Har hafta' },
  { value: 'monthly', label: 'Har oy' },
]

// Modal ochilganda qiymatlarni tiklash
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    errorMessage.value = ''
    newSubtaskTitle.value = ''
    if (props.task) {
      title.value = props.task.title
      description.value = props.task.description || ''
      projectId.value = props.task.projectId || 'inbox'
      periodType.value = props.task.periodType || 'day'
      date.value = props.task.date
      time.value = props.task.time || ''
      reminder.value = !!props.task.reminder
      recurring.value = props.task.recurring || 'none'
      subtasks.value = (props.task.subtasks || []).map((s) => ({ ...s }))
      priority.value = props.task.priority || 'medium'
      completed.value = !!props.task.completed
    } else {
      title.value = ''
      description.value = ''
      projectId.value =
        props.defaultProjectId && props.defaultProjectId !== 'all'
          ? props.defaultProjectId
          : 'inbox'
      periodType.value = props.defaultPeriodType || 'day'
      date.value = props.defaultDate || toISODate(new Date())
      time.value = ''
      reminder.value = false
      recurring.value = 'none'
      subtasks.value = []
      priority.value = 'medium'
      completed.value = false
    }
  },
  { immediate: true },
)

// Muddat turi o'zgarsa, sanani o'sha davr boshiga moslashtiramiz
function onPeriodTypeChange(newType) {
  periodType.value = newType
  if (date.value) {
    const current = parseISODate(date.value)
    date.value = toISODate(startOfPeriod(newType, current))
  }
}

async function handleReminderToggle() {
  if (reminder.value) {
    const perm = await notifications.requestPermission()
    if (perm !== 'granted') {
      // Permission rad etilgan bo'lsa ham in-app eslatma ishlayveradi
    }
  }
}

function addSubtask() {
  const text = newSubtaskTitle.value.trim()
  if (!text) return
  subtasks.value.push({
    id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: text,
    completed: false,
  })
  newSubtaskTitle.value = ''
}

function removeSubtask(index) {
  subtasks.value.splice(index, 1)
}

async function handleSubmit() {
  if (!title.value.trim()) {
    errorMessage.value = 'Iltimos, vazifa sarlavhasini kiriting.'
    return
  }

  // Agar yangi subtask maydonida matn yozilgan bo'lsa, uni ham qo'shib ketamiz
  if (newSubtaskTitle.value.trim()) {
    addSubtask()
  }

  busy.value = true
  errorMessage.value = ''

  // Davr boshlanish sanasini kafolatlaymiz
  const normalizedDate = toISODate(startOfPeriod(periodType.value, parseISODate(date.value)))

  const payload = {
    title: title.value.trim(),
    description: description.value.trim(),
    projectId: projectId.value,
    periodType: periodType.value,
    date: normalizedDate,
    time: time.value || '',
    reminder: !!reminder.value,
    recurring: recurring.value,
    subtasks: subtasks.value.map((s) => ({
      id: s.id,
      title: s.title.trim(),
      completed: !!s.completed,
    })),
    priority: priority.value,
    completed: completed.value,
  }

  let result
  if (isEditing.value) {
    result = await tasksStore.update(props.task.id, payload)
  } else {
    result = await tasksStore.create(payload)
  }

  busy.value = false
  if (result) {
    emit('saved', result)
    emit('close')
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEditing ? 'Vazifani tahrirlash' : 'Yangi vazifa'"
    width="560px"
    @close="emit('close')"
  >
    <form class="task-form" @submit.prevent="handleSubmit">
      <div v-if="errorMessage" class="form-error" role="alert">
        <AppIcon name="alert" :size="16" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Sarlavha -->
      <div class="field">
        <label for="task-title" class="label">Sarlavha *</label>
        <input
          id="task-title"
          v-model="title"
          type="text"
          class="input"
          placeholder="Masalan: Hisobotni topshirish..."
          required
          autofocus
          maxlength="200"
        />
      </div>

      <!-- Izoh -->
      <div class="field">
        <label for="task-desc" class="label">Izoh (ixtiyoriy)</label>
        <textarea
          id="task-desc"
          v-model="description"
          class="textarea"
          placeholder="Batafsil ma'lumot yoki eslatmalar..."
          rows="2"
          maxlength="2000"
        ></textarea>
      </div>

      <!-- Loyiha tanlash -->
      <div class="field">
        <label for="task-project" class="label">Loyiha</label>
        <select id="task-project" v-model="projectId" class="select">
          <option
            v-for="p in projectsStore.sorted"
            :key="p.id"
            :value="p.id"
          >
            {{ p.icon ? p.icon + ' ' : '' }}{{ p.name }}
          </option>
        </select>
      </div>

      <!-- Muddat turi va sana -->
      <div class="form-row">
        <div class="field flex-1">
          <label class="label">Muddat turi</label>
          <div class="segmented segmented-compact">
            <button
              v-for="pt in PERIOD_TYPES"
              :key="pt"
              type="button"
              :class="{ active: periodType === pt }"
              @click="onPeriodTypeChange(pt)"
            >
              {{ PERIOD_LABELS[pt] }}
            </button>
          </div>
        </div>

        <div class="field flex-1">
          <label for="task-date" class="label">Sana</label>
          <input
            id="task-date"
            v-model="date"
            type="date"
            class="input"
            required
          />
        </div>
      </div>

      <!-- Aniq vaqt, Eslatma va Takrorlanish -->
      <div class="form-row">
        <!-- Aniq vaqt -->
        <div class="field flex-1">
          <label for="task-time" class="label">
            <AppIcon name="clock" :size="14" />
            <span>Vaqt (ixtiyoriy)</span>
          </label>
          <input
            id="task-time"
            v-model="time"
            type="time"
            class="input"
          />
        </div>

        <!-- Takrorlanish -->
        <div class="field flex-1">
          <label for="task-recurring" class="label">
            <AppIcon name="repeat" :size="14" />
            <span>Takrorlanish</span>
          </label>
          <select id="task-recurring" v-model="recurring" class="select">
            <option
              v-for="opt in recurringOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Eslatma bildirishnomasi switch (agar vaqt belgilangan bo'lsa) -->
      <div v-if="time" class="field reminder-field">
        <label class="checkbox-label reminder-label">
          <input
            v-model="reminder"
            type="checkbox"
            class="native-checkbox"
            @change="handleReminderToggle"
          />
          <span class="custom-check-box" :class="{ checked: reminder }">
            <AppIcon v-if="reminder" name="check" :size="13" :stroke="3" />
          </span>
          <span class="reminder-text">
            <AppIcon name="bell" :size="15" />
            <span>Belgilangan vaqtda bildirishnoma eslatmasi</span>
          </span>
        </label>
      </div>

      <!-- Ichki vazifalar (Subtasks / Checklist) -->
      <div class="field subtasks-section">
        <label class="label subtasks-label">
          <span class="label-with-icon">
            <AppIcon name="list-checks" :size="16" />
            <span>Ichki vazifalar (Checklist)</span>
          </span>
          <span v-if="subtasks.length" class="subtasks-count">
            {{ subtasks.filter((s) => s.completed).length }}/{{ subtasks.length }}
          </span>
        </label>

        <!-- Subtasklar ro'yxati -->
        <div v-if="subtasks.length" class="subtasks-list">
          <div
            v-for="(st, idx) in subtasks"
            :key="st.id || idx"
            class="subtask-row"
          >
            <label class="subtask-check-label">
              <input
                v-model="st.completed"
                type="checkbox"
                class="native-checkbox"
              />
              <span class="custom-check-box sm" :class="{ checked: st.completed }">
                <AppIcon v-if="st.completed" name="check" :size="11" :stroke="3" />
              </span>
            </label>
            <input
              v-model="st.title"
              type="text"
              class="subtask-input"
              :class="{ strike: st.completed }"
              placeholder="Qadam tavsifi..."
            />
            <button
              type="button"
              class="btn-remove-subtask"
              aria-label="O'chirish"
              @click="removeSubtask(idx)"
            >
              <AppIcon name="x" :size="14" />
            </button>
          </div>
        </div>

        <!-- Yangi subtask qo'shish kiritish maydoni -->
        <div class="subtask-add-row">
          <input
            v-model="newSubtaskTitle"
            type="text"
            class="input subtask-new-input"
            placeholder="Yangi qadam qo'shish (Enter bosing)..."
            @keydown.enter.prevent="addSubtask"
          />
          <button
            type="button"
            class="btn btn-sm btn-secondary add-subtask-btn"
            :disabled="!newSubtaskTitle.trim()"
            @click="addSubtask"
          >
            <AppIcon name="plus" :size="14" />
            <span>Qo'shish</span>
          </button>
        </div>
      </div>

      <!-- Muhimlik darajasi -->
      <div class="field">
        <label class="label">Muhimlik darajasi</label>
        <div class="priority-options">
          <label
            v-for="p in priorityOptions"
            :key="p.value"
            class="priority-label"
            :class="{ active: priority === p.value }"
            :style="{ '--prio-color': p.color }"
          >
            <input
              v-model="priority"
              type="radio"
              name="priority"
              :value="p.value"
              class="sr-only"
            />
            <span class="prio-indicator-dot"></span>
            <span>{{ p.label }}</span>
          </label>
        </div>
      </div>

      <!-- Tahrirlashda: holat (bajarilgan/bajarilmagan) -->
      <div v-if="isEditing" class="field status-check-field">
        <label class="checkbox-label">
          <input
            v-model="completed"
            type="checkbox"
            class="native-checkbox"
          />
          <span class="custom-check-box" :class="{ checked: completed }">
            <AppIcon v-if="completed" name="check" :size="13" :stroke="3" />
          </span>
          <span class="status-label-text">Bajarilgan deb belgilash</span>
        </label>
      </div>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn btn-secondary"
        @click="emit('close')"
      >
        Bekor qilish
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="busy || !title.trim()"
        @click="handleSubmit"
      >
        <AppIcon v-if="!isEditing" name="plus" :size="16" />
        <span>{{ isEditing ? 'Saqlash' : "Qo'shish" }}</span>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.task-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.label-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 13.5px;
  font-weight: 500;
}

.segmented-compact {
  padding: 3px;
  width: 100%;
}

.segmented-compact button {
  min-height: 36px;
  padding: 0 8px;
  font-size: 12.5px;
}

.reminder-field {
  margin-top: -6px;
}

.reminder-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 10px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.reminder-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-2);
  font-weight: 500;
}

/* Subtasks bo'limi */
.subtasks-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.subtasks-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.subtasks-count {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-solid);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.subtask-check-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.custom-check-box.sm {
  width: 18px;
  height: 18px;
  border-radius: 5px;
}

.subtask-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13.5px;
  color: var(--text);
  font-family: inherit;
}

.subtask-input.strike {
  text-decoration: line-through;
  color: var(--text-3);
}

.btn-remove-subtask {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--text-3);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.btn-remove-subtask:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.subtask-add-row {
  display: flex;
  gap: 8px;
}

.subtask-new-input {
  flex: 1;
  min-height: 38px;
  font-size: 13px;
}

.add-subtask-btn {
  padding: 0 12px;
}

/* Muhimlik */
.priority-options {
  display: flex;
  gap: 8px;
}

.priority-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.priority-label:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.priority-label.active {
  border-color: var(--prio-color);
  background: color-mix(in srgb, var(--prio-color) 12%, var(--surface-solid));
  color: var(--text);
  font-weight: 600;
}

.prio-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--prio-color);
}

.status-check-field {
  padding-top: 4px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.native-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.custom-check-box {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-xs);
  border: 1.5px solid var(--border-strong);
  background: var(--surface-solid);
  display: grid;
  place-items: center;
  color: #ffffff;
  transition: all var(--dur) var(--ease);
}

.custom-check-box.checked {
  background: var(--accent);
  border-color: var(--accent);
}

.status-label-text {
  font-size: 14px;
  color: var(--text);
}

@media (max-width: 520px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
