<script setup>
/**
 * Savatcha (Trash / Recycle bin) modali.
 * - O'chirilgan vazifalar ro'yxati
 * - Qayta tiklash (Restore)
 * - Butunlay o'chirish (Permanent delete)
 * - Savatchani to'liq tozalash (Empty trash)
 */
import { ref, computed } from 'vue'
import { useTasksStore } from '@/stores/tasks'
import { useProjectsStore } from '@/stores/projects'
import { useNotesStore } from '@/stores/notes'
import BaseModal from './BaseModal.vue'
import ConfirmModal from './ConfirmModal.vue'
import AppIcon from './AppIcon.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const notesStore = useNotesStore()

const activeTab = ref('tasks') // 'tasks' | 'notes'
const confirmEmptyOpen = ref(false)
const confirmDeleteItem = ref(null) // { type: 'task' | 'note', id: string }

const trashedTasks = computed(() => tasksStore.trashTasks)
const trashedNotes = computed(() => notesStore.trashNotes)
const currentListCount = computed(() =>
  activeTab.value === 'tasks' ? trashedTasks.value.length : trashedNotes.value.length
)

function formatDeletedDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const day = d.getDate()
    const monthNames = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
    const m = monthNames[d.getMonth()]
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return `${day}-${m}, ${time}`
  } catch {
    return ''
  }
}

async function handleRestoreTask(id) {
  await tasksStore.restore(id)
}

async function handleRestoreNote(id) {
  await notesStore.restore(id)
}

function promptPermanentDelete(type, id) {
  confirmDeleteItem.value = { type, id }
}

const deleteItemTitle = computed(() =>
  confirmDeleteItem.value?.type === 'task'
    ? "Vazifani butunlay o'chirish"
    : "Qaydni butunlay o'chirish"
)

const deleteItemMessage = computed(() =>
  `Ushbu ${confirmDeleteItem.value?.type === 'task' ? 'vazifa' : 'qayd'} xotiradan butunlay o'chiriladi. Davom etasizmi?`
)

async function confirmPermanentDelete() {
  if (confirmDeleteItem.value) {
    if (confirmDeleteItem.value.type === 'task') {
      await tasksStore.permanentDelete(confirmDeleteItem.value.id)
    } else {
      await notesStore.permanentDelete(confirmDeleteItem.value.id)
    }
    confirmDeleteItem.value = null
  }
}

async function handleEmptyTrash() {
  if (activeTab.value === 'tasks') {
    await tasksStore.emptyTrash()
  } else {
    await notesStore.emptyTrash()
  }
  confirmEmptyOpen.value = false
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Savatcha"
    width="540px"
    @close="emit('close')"
  >
    <div class="trash-modal-content">
      <!-- Savatcha toifasi tablari: Vazifalar / Qaydlar -->
      <div class="trash-tabs">
        <button
          type="button"
          class="trash-tab"
          :class="{ active: activeTab === 'tasks' }"
          @click="activeTab = 'tasks'"
        >
          <AppIcon name="check" :size="15" />
          <span>Vazifalar</span>
          <span v-if="trashedTasks.length > 0" class="tab-badge">{{ trashedTasks.length }}</span>
        </button>

        <button
          type="button"
          class="trash-tab"
          :class="{ active: activeTab === 'notes' }"
          @click="activeTab = 'notes'"
        >
          <AppIcon name="note" :size="15" />
          <span>Qaydlar</span>
          <span v-if="trashedNotes.length > 0" class="tab-badge">{{ trashedNotes.length }}</span>
        </button>
      </div>

      <!-- Yuqori qator: soni va tozalash tugmasi -->
      <div v-if="currentListCount > 0" class="trash-top-bar">
        <span class="trash-count-text">
          O'chirilgan {{ activeTab === 'tasks' ? 'vazifalar' : 'qaydlar' }}:
          <strong>{{ currentListCount }} ta</strong>
        </span>
        <button
          type="button"
          class="btn btn-sm btn-ghost empty-trash-btn"
          @click="confirmEmptyOpen = true"
        >
          <AppIcon name="trash" :size="15" />
          <span>{{ activeTab === 'tasks' ? 'Vazifalarni' : 'Qaydlarni' }} tozalash</span>
        </button>
      </div>

      <!-- Vazifalar ro'yxati -->
      <div v-if="activeTab === 'tasks' && trashedTasks.length > 0" class="trash-list">
        <div
          v-for="task in trashedTasks"
          :key="task.id"
          class="trash-item-card"
        >
          <div class="trash-item-main">
            <h4 class="trash-item-title">{{ task.title }}</h4>
            <div class="trash-item-meta">
              <span
                v-if="projectsStore.byId[task.projectId]"
                class="trash-proj-tag"
                :style="{ color: projectsStore.byId[task.projectId].color }"
              >
                {{ projectsStore.byId[task.projectId].name }}
              </span>
              <span v-if="task.deletedAt" class="trash-date">
                O'chirilgan: {{ formatDeletedDate(task.deletedAt) }}
              </span>
            </div>
          </div>

          <div class="trash-item-actions">
            <!-- Qayta tiklash -->
            <button
              type="button"
              class="btn btn-sm btn-secondary restore-btn"
              title="Qayta tiklash"
              @click="handleRestoreTask(task.id)"
            >
              <AppIcon name="rotate-ccw" :size="14" />
              <span>Tiklash</span>
            </button>

            <!-- Butunlay o'chirish -->
            <button
              type="button"
              class="btn btn-sm btn-ghost perm-delete-btn"
              title="Butunlay o'chirish"
              aria-label="Butunlay o'chirish"
              @click="promptPermanentDelete('task', task.id)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Qaydlar ro'yxati -->
      <div v-else-if="activeTab === 'notes' && trashedNotes.length > 0" class="trash-list">
        <div
          v-for="note in trashedNotes"
          :key="note.id"
          class="trash-item-card"
        >
          <div class="trash-item-main">
            <h4 class="trash-item-title">{{ note.title || 'Sarlavhasiz qayd' }}</h4>
            <div class="trash-item-meta">
              <span
                v-if="note.projectId && projectsStore.byId[note.projectId]"
                class="trash-proj-tag"
                :style="{ color: projectsStore.byId[note.projectId].color }"
              >
                {{ projectsStore.byId[note.projectId].name }}
              </span>
              <span v-if="note.deletedAt" class="trash-date">
                O'chirilgan: {{ formatDeletedDate(note.deletedAt) }}
              </span>
            </div>
          </div>

          <div class="trash-item-actions">
            <!-- Qayta tiklash -->
            <button
              type="button"
              class="btn btn-sm btn-secondary restore-btn"
              title="Qayta tiklash"
              @click="handleRestoreNote(note.id)"
            >
              <AppIcon name="rotate-ccw" :size="14" />
              <span>Tiklash</span>
            </button>

            <!-- Butunlay o'chirish -->
            <button
              type="button"
              class="btn btn-sm btn-ghost perm-delete-btn"
              title="Butunlay o'chirish"
              aria-label="Butunlay o'chirish"
              @click="promptPermanentDelete('note', note.id)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Bo'sh holat -->
      <EmptyState
        v-else
        :title="activeTab === 'tasks' ? 'Vazifalar savatchasi bo\'sh' : 'Qaydlar savatchasi bo\'sh'"
        :text="activeTab === 'tasks' ? 'O\'chirilgan vazifalar shu yerda saqlanadi va ularni istalgan payt tiklashingiz mumkin.' : 'O\'chirilgan qaydlar shu yerda saqlanadi va ularni istalgan payt tiklashingiz mumkin.'"
      />
    </div>

    <!-- Butunlay tozalashni tasdiqlash modali -->
    <ConfirmModal
      :open="confirmEmptyOpen"
      :title="activeTab === 'tasks' ? 'Vazifalar savatchasini tozalash' : 'Qaydlar savatchasini tozalash'"
      :message="`Savatchadagi barcha ${activeTab === 'tasks' ? 'vazifalar' : 'qaydlar'} butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi. Rozimisiz?`"
      confirm-text="Tozalash"
      confirm-variant="danger"
      @confirm="handleEmptyTrash"
      @cancel="confirmEmptyOpen = false"
    />

    <!-- Bitta elementni butunlay o'chirishni tasdiqlash modali -->
    <ConfirmModal
      :open="!!confirmDeleteItem"
      :title="deleteItemTitle"
      :message="deleteItemMessage"
      confirm-text="O'chirish"
      confirm-variant="danger"
      @confirm="confirmPermanentDelete"
      @cancel="confirmDeleteItem = null"
    />
  </BaseModal>
</template>

<style scoped>
.trash-modal-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.trash-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.trash-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.trash-tab:hover {
  color: var(--text);
}

.trash-tab.active {
  background: var(--surface-solid);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: var(--border);
  color: var(--text-2);
}

.trash-tab.active .tab-badge {
  background: var(--accent-soft);
  color: var(--accent);
}

.trash-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.trash-count-text {
  font-size: 13px;
  color: var(--text-2);
}

.empty-trash-btn {
  color: var(--danger);
  font-weight: 600;
  gap: 6px;
}

.empty-trash-btn:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.trash-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.trash-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all var(--dur) var(--ease);
}

.trash-item-card:hover {
  border-color: var(--border-strong);
}

.trash-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trash-item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
  text-decoration: line-through;
  opacity: 0.85;
}

.trash-item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11.5px;
  color: var(--text-3);
}

.trash-proj-tag {
  font-weight: 600;
}

.trash-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.restore-btn {
  gap: 5px;
  font-size: 12px;
  padding: 0 10px;
  font-weight: 600;
  color: var(--accent);
}

.restore-btn:hover {
  background: var(--accent-soft);
}

.perm-delete-btn {
  color: var(--text-3);
  padding: 0 8px;
}

.perm-delete-btn:hover {
  color: var(--danger);
  background: var(--danger-soft);
}
</style>
