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

const confirmEmptyOpen = ref(false)
const confirmDeleteId = ref(null)

const trashedList = computed(() => tasksStore.trashTasks)

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

async function handleRestore(id) {
  await tasksStore.restore(id)
}

function promptPermanentDelete(id) {
  confirmDeleteId.value = id
}

async function confirmPermanentDelete() {
  if (confirmDeleteId.value) {
    await tasksStore.permanentDelete(confirmDeleteId.value)
    confirmDeleteId.value = null
  }
}

async function handleEmptyTrash() {
  await tasksStore.emptyTrash()
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
      <!-- Yuqori qator: vazifalar soni va tozalash tugmasi -->
      <div v-if="trashedList.length > 0" class="trash-top-bar">
        <span class="trash-count-text">
          O'chirilgan vazifalar: <strong>{{ trashedList.length }} ta</strong>
        </span>
        <button
          type="button"
          class="btn btn-sm btn-ghost empty-trash-btn"
          @click="confirmEmptyOpen = true"
        >
          <AppIcon name="trash" :size="15" />
          <span>Savatchani tozalash</span>
        </button>
      </div>

      <!-- Ro'yxat -->
      <div v-if="trashedList.length > 0" class="trash-list">
        <div
          v-for="task in trashedList"
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
              @click="handleRestore(task.id)"
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
              @click="promptPermanentDelete(task.id)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Bo'sh holat -->
      <EmptyState
        v-else
        title="Savatcha bo'sh"
        text="O'chirilgan vazifalar shu yerda saqlanadi va ularni istalgan payt tiklashingiz mumkin."
      />
    </div>

    <!-- Butunlay tozalashni tasdiqlash modali -->
    <ConfirmModal
      :open="confirmEmptyOpen"
      title="Savatchani tozalash"
      message="Savatchadagi barcha vazifalar butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi. Rozimisiz?"
      confirm-text="Tozalash"
      confirm-variant="danger"
      @confirm="handleEmptyTrash"
      @cancel="confirmEmptyOpen = false"
    />

    <!-- Bitta vazifani butunlay o'chirishni tasdiqlash modali -->
    <ConfirmModal
      :open="!!confirmDeleteId"
      title="Vazifani butunlay o'chirish"
      message="Ushbu vazifa xotiradan butunlay o'chiriladi. Davom etasizmi?"
      confirm-text="O'chirish"
      confirm-variant="danger"
      @confirm="confirmPermanentDelete"
      @cancel="confirmDeleteId = null"
    />
  </BaseModal>
</template>

<style scoped>
.trash-modal-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
