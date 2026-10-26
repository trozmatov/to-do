<script setup>
/**
 * Qaydlar ro'yxati (NoteList).
 * - Qidiruv (sarlavha va matn bo'yicha)
 * - Saralash (oxirgi o'zgargan / yaratilgan)
 * - Qadalganlar bloki tepada, oddiy qaydlar ostida
 * - Har bir qaydda sarlavha, sana, matn prefiksi va loyiha/vazifa nishonlari
 * - Yangi qayd yaratish tugmasi
 */
import { computed } from 'vue'
import { useNotesStore } from '@/stores/notes'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import AppIcon from './AppIcon.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  mobileActive: { type: Boolean, default: false },
})

const emit = defineEmits(['select-note', 'create-note'])

const notesStore = useNotesStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()

function formatDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()

    if (isToday) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    const monthNames = [
      'yan', 'fev', 'mar', 'apr', 'may', 'iyun',
      'iyul', 'avg', 'sen', 'okt', 'noy', 'dek',
    ]
    const m = monthNames[d.getMonth()]

    if (d.getFullYear() === now.getFullYear()) {
      return `${d.getDate()}-${m}`
    }
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
  } catch {
    return ''
  }
}

/** Matn qisqartmasi (snippet) */
function getSnippet(note) {
  if (!note.plainText) return 'Qo\'shimcha matn yo\'q'
  // Sarlavha birinchi qator bo'lsa, undan keyingi matnni snippet sifatida olamiz
  const lines = note.plainText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length > 1) {
    return lines.slice(1).join(' ')
  }
  return note.plainText
}

function handleSelect(id) {
  emit('select-note', id)
}

function handleCreate() {
  emit('create-note')
}
</script>

<template>
  <aside class="note-list-panel" :class="{ 'mobile-hidden': mobileActive }">
    <!-- Yuqori qidiruv va yangi qayd paneli -->
    <div class="note-list-header">
      <div class="search-input-wrap">
        <AppIcon name="search" :size="16" class="search-icon" />
        <input
          v-model="notesStore.filter.search"
          type="search"
          placeholder="Qaydlardan qidirish..."
          class="search-input"
          aria-label="Qaydlardan qidirish"
        />
        <button
          v-if="notesStore.filter.search"
          type="button"
          class="clear-search-btn"
          aria-label="Tozalash"
          @click="notesStore.filter.search = ''"
        >
          <AppIcon name="x" :size="14" />
        </button>
      </div>

      <div class="header-actions">
        <!-- Saralash -->
        <select
          v-model="notesStore.filter.sortBy"
          class="sort-select"
          title="Saralash tartibi"
        >
          <option value="updatedAt">O'zgartirilgan</option>
          <option value="createdAt">Yaratilgan</option>
        </select>

        <!-- Yangi qayd tugmasi -->
        <button
          type="button"
          class="btn btn-primary new-note-btn"
          title="Yangi qayd (Cmd/Ctrl + N)"
          @click="handleCreate"
        >
          <AppIcon name="plus" :size="16" />
          <span>Yangi</span>
        </button>
      </div>
    </div>

    <!-- Tanlangan loyiha filtri indikatori (agar mavjud bo'lsa) -->
    <div
      v-if="notesStore.filter.projectId !== 'all' && projectsStore.byId[notesStore.filter.projectId]"
      class="filter-indicator"
    >
      <span class="filter-indicator-text">
        Loyiha:
        <strong :style="{ color: projectsStore.byId[notesStore.filter.projectId].color }">
          {{ projectsStore.byId[notesStore.filter.projectId].name }}
        </strong>
      </span>
      <button
        type="button"
        class="filter-clear-btn"
        title="Barcha qaydlarni ko'rsatish"
        @click="notesStore.filter.projectId = 'all'"
      >
        <AppIcon name="x" :size="12" />
        <span>Barchasi</span>
      </button>
    </div>

    <!-- Qaydlar ro'yxati -->
    <div class="note-list-scroll">
      <!-- Qadalgan qaydlar -->
      <section v-if="notesStore.pinnedNotes.length > 0" class="note-group">
        <h3 class="note-group-title">
          <AppIcon name="pin" :size="12" />
          <span>Qadalganlar</span>
        </h3>
        <div class="note-items">
          <button
            v-for="note in notesStore.pinnedNotes"
            :key="note.id"
            type="button"
            class="note-card"
            :class="{ active: notesStore.activeNoteId === note.id }"
            @click="handleSelect(note.id)"
          >
            <div class="note-card-top">
              <h4 class="note-title">{{ note.title || 'Sarlavhasiz qayd' }}</h4>
              <AppIcon name="pin" :size="12" class="card-pin-icon" />
            </div>
            <div class="note-card-desc">
              <span class="note-date">{{ formatDate(note.updatedAt || note.createdAt) }}</span>
              <span class="note-snippet">{{ getSnippet(note) }}</span>
            </div>
            <!-- Bog'langan loyiha yoki vazifa teglari -->
            <div v-if="note.projectId || note.taskId" class="note-tags">
              <span
                v-if="note.projectId && projectsStore.byId[note.projectId]"
                class="note-tag project-tag"
                :style="{
                  backgroundColor: projectsStore.byId[note.projectId].color + '1a',
                  color: projectsStore.byId[note.projectId].color,
                }"
              >
                {{ projectsStore.byId[note.projectId].name }}
              </span>
              <span
                v-if="note.taskId && tasksStore.byId[note.taskId]"
                class="note-tag task-tag"
              >
                <AppIcon name="check-square" :size="10" />
                <span>{{ tasksStore.byId[note.taskId].title }}</span>
              </span>
            </div>
          </button>
        </div>
      </section>

      <!-- Oddiy qaydlar -->
      <section v-if="notesStore.unpinnedNotes.length > 0" class="note-group">
        <h3 v-if="notesStore.pinnedNotes.length > 0" class="note-group-title">
          <span>Qaydlar</span>
        </h3>
        <div class="note-items">
          <button
            v-for="note in notesStore.unpinnedNotes"
            :key="note.id"
            type="button"
            class="note-card"
            :class="{ active: notesStore.activeNoteId === note.id }"
            @click="handleSelect(note.id)"
          >
            <div class="note-card-top">
              <h4 class="note-title">{{ note.title || 'Sarlavhasiz qayd' }}</h4>
            </div>
            <div class="note-card-desc">
              <span class="note-date">{{ formatDate(note.updatedAt || note.createdAt) }}</span>
              <span class="note-snippet">{{ getSnippet(note) }}</span>
            </div>
            <!-- Bog'langan loyiha yoki vazifa teglari -->
            <div v-if="note.projectId || note.taskId" class="note-tags">
              <span
                v-if="note.projectId && projectsStore.byId[note.projectId]"
                class="note-tag project-tag"
                :style="{
                  backgroundColor: projectsStore.byId[note.projectId].color + '1a',
                  color: projectsStore.byId[note.projectId].color,
                }"
              >
                {{ projectsStore.byId[note.projectId].name }}
              </span>
              <span
                v-if="note.taskId && tasksStore.byId[note.taskId]"
                class="note-tag task-tag"
              >
                <AppIcon name="check-square" :size="10" />
                <span>{{ tasksStore.byId[note.taskId].title }}</span>
              </span>
            </div>
          </button>
        </div>
      </section>

      <!-- Bo'sh holat -->
      <div v-if="notesStore.filteredNotes.length === 0" class="notes-empty-wrap">
        <EmptyState
          title="Qaydlar topilmadi"
          :text="
            notesStore.filter.search
              ? 'Qidiruv bo\'yicha mos qayd chiqmadi.'
              : 'Hozircha birorta qayd yo\'q. Yangi qayd yaratib boshlang.'
          "
        />
        <button
          type="button"
          class="btn btn-primary empty-create-btn"
          @click="handleCreate"
        >
          <AppIcon name="plus" :size="16" />
          <span>Yangi qayd yaratish</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.note-list-panel {
  width: 320px;
  min-width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--border);
  transition: transform var(--dur) var(--ease);
}

.note-list-header {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-solid);
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-3);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 32px;
  font-size: 13.5px;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text);
  outline: none;
  transition: all var(--dur) var(--ease);
}

.search-input:focus {
  border-color: var(--accent);
  background: var(--bg-elev);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--text-3);
  padding: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.clear-search-btn:hover {
  color: var(--text);
  background: var(--border);
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sort-select {
  height: 32px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-2);
  outline: none;
  cursor: pointer;
}

.sort-select:focus {
  border-color: var(--accent);
}

.new-note-btn {
  height: 32px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 600;
  gap: 5px;
}

.filter-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--hover);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-2);
}

.filter-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-2);
  cursor: pointer;
}

.filter-clear-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.note-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.note-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-group-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  padding: 4px 8px;
}

.note-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-align: left;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.note-card:hover {
  background: var(--hover);
  border-color: var(--border-strong);
}

.note-card.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.note-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.note-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-pin-icon {
  color: var(--warning);
  flex-shrink: 0;
}

.note-card-desc {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.4;
}

.note-date {
  font-weight: 500;
  color: var(--text-3);
  white-space: nowrap;
  flex-shrink: 0;
}

.note-snippet {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.note-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-tag {
  background: var(--surface-2);
  color: var(--text-2);
  border: 1px solid var(--border);
}

.notes-empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 10px;
  gap: 16px;
}

.empty-create-btn {
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  gap: 6px;
}

@media (max-width: 768px) {
  .note-list-panel {
    width: 100%;
    border-right: none;
  }

  .note-list-panel.mobile-hidden {
    display: none;
  }
}
</style>
