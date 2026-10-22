<script setup>
/**
 * Vazifa yaratish va tahrirlash formasi (BaseModal ichida).
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

// Modal ochilganda qiymatlarni tiklash
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    errorMessage.value = ''
    if (props.task) {
      title.value = props.task.title
      description.value = props.task.description || ''
      projectId.value = props.task.projectId || 'inbox'
      periodType.value = props.task.periodType || 'day'
      date.value = props.task.date
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

async function handleSubmit() {
  if (!title.value.trim()) {
    errorMessage.value = 'Iltimos, vazifa sarlavhasini kiriting.'
    return
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
    width="540px"
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
          rows="3"
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
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface-solid);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.priority-label:hover {
  border-color: var(--prio-color);
}

.priority-label.active {
  border-color: var(--prio-color);
  background: var(--surface-2);
  color: var(--text);
  box-shadow: 0 0 0 2px var(--prio-color);
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
  display: flex;
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
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid var(--border-strong);
  display: grid;
  place-items: center;
  color: #fff;
  transition: all var(--dur) var(--ease);
}

.custom-check-box.checked {
  background: var(--grad-brand);
  border-color: transparent;
}

.status-label-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
