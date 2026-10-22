<script setup>
/**
 * Loyiha yaratish va tahrirlash formasi (BaseModal ichida).
 * - Nomi
 * - Rangi (PROJECT_COLORS palitrasi)
 * - Emojisi/ikonkasi (PROJECT_ICONS ro'yxati)
 */
import { ref, computed, watch } from 'vue'
import {
  useProjectsStore,
  PROJECT_COLORS,
  PROJECT_ICONS,
} from '@/stores/projects'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  project: { type: Object, default: null }, // null bo'lsa yangi loyiha
})

const emit = defineEmits(['close', 'saved'])

const projectsStore = useProjectsStore()

const name = ref('')
const color = ref(PROJECT_COLORS[0])
const icon = ref(PROJECT_ICONS[1])
const busy = ref(false)
const errorMessage = ref('')

const isEditing = computed(() => !!props.project)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    errorMessage.value = ''
    if (props.project) {
      name.value = props.project.name
      color.value = props.project.color || PROJECT_COLORS[0]
      icon.value = props.project.icon || PROJECT_ICONS[1]
    } else {
      name.value = ''
      color.value = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
      icon.value = PROJECT_ICONS[Math.floor(Math.random() * (PROJECT_ICONS.length - 1)) + 1]
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!name.value.trim()) {
    errorMessage.value = 'Iltimos, loyiha nomini kiriting.'
    return
  }

  busy.value = true
  errorMessage.value = ''

  let result
  if (isEditing.value) {
    result = await projectsStore.update(props.project.id, {
      name: name.value.trim(),
      color: color.value,
      icon: icon.value,
    })
  } else {
    result = await projectsStore.create({
      name: name.value.trim(),
      color: color.value,
      icon: icon.value,
    })
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
    :title="isEditing ? 'Loyihani tahrirlash' : 'Yangi loyiha'"
    width="480px"
    @close="emit('close')"
  >
    <form class="project-form" @submit.prevent="handleSubmit">
      <div v-if="errorMessage" class="form-error" role="alert">
        <AppIcon name="alert" :size="16" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Loyiha nomi -->
      <div class="field">
        <label for="project-name" class="label">Loyiha nomi *</label>
        <div class="name-input-group">
          <span class="preview-badge" :style="{ backgroundColor: color }">
            {{ icon || '📁' }}
          </span>
          <input
            id="project-name"
            v-model="name"
            type="text"
            class="input flex-1"
            placeholder="Masalan: Ish, O'qish, Uy..."
            required
            autofocus
            maxlength="50"
          />
        </div>
      </div>

      <!-- Rang tanlash -->
      <div class="field">
        <label class="label">Rang</label>
        <div class="color-palette">
          <button
            v-for="c in PROJECT_COLORS"
            :key="c"
            type="button"
            class="color-btn"
            :class="{ active: color === c }"
            :style="{ backgroundColor: c }"
            :aria-label="`Rang ${c}`"
            @click="color = c"
          >
            <AppIcon v-if="color === c" name="check" :size="14" :stroke="3" />
          </button>
        </div>
      </div>

      <!-- Emoji / Ikonka tanlash -->
      <div class="field">
        <label class="label">Belgi / Emoji</label>
        <div class="icon-palette">
          <button
            v-for="ic in PROJECT_ICONS"
            :key="ic"
            type="button"
            class="icon-btn"
            :class="{ active: icon === ic }"
            @click="icon = ic"
          >
            {{ ic }}
          </button>
        </div>
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
        :disabled="busy || !name.trim()"
        @click="handleSubmit"
      >
        <span>{{ isEditing ? 'Saqlash' : 'Yaratish' }}</span>
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.project-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.name-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-badge {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 20px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  transition: all var(--dur) var(--ease);
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

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  display: grid;
  place-items: center;
  color: #fff;
  cursor: pointer;
  transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}

.color-btn:hover {
  transform: scale(1.15);
}

.color-btn.active {
  box-shadow: 0 0 0 3px var(--bg-elev), 0 0 0 5px currentColor;
  transform: scale(1.1);
}

.icon-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 18px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.icon-btn:hover {
  background: var(--hover);
  border-color: var(--accent);
}

.icon-btn.active {
  background: var(--surface-solid);
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
  transform: scale(1.08);
}
</style>
