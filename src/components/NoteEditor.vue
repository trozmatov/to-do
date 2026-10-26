<script setup>
/**
 * Apple Notes uslubidagi Tiptap muharriri (NoteEditor).
 * - Sarlavha va vaqt ("26-oktyabr, 2026, 08:46")
 * - 500 ms debounce avtosaqlash ("Saqlandi" belgisi)
 * - Tiptap StarterKit, TaskList, Table, Image, Underline
 * - Biriktirma rasmlarni siqish va IndexedDB'da Blob sifatida saqlash
 * - Loyihaga / Vazifaga bog'lash modali
 * - Markdown va Text eksport
 * - Mobilda orqaga qaytish tugmasi
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { StarterKit } from '@tiptap/starter-kit'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { Image } from '@tiptap/extension-image'
import { Underline } from '@tiptap/extension-underline'

import { useNotesStore } from '@/stores/notes'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'
import * as db from '@/services/db'
import NoteToolbar from './NoteToolbar.vue'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  noteId: { type: String, default: null },
})

const emit = defineEmits(['back', 'delete'])

const notesStore = useNotesStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const uiStore = useUiStore()

const fileInputRef = ref(null)
const linkModalOpen = ref(false)
const saveStatus = ref('saved') // 'saved' | 'saving'
let saveTimer = null

const currentNote = computed(() => {
  if (!props.noteId) return null
  return notesStore.byId[props.noteId] || null
})

/** Sana formatlash: "26-oktyabr, 2026, 08:46" */
const formattedDateTime = computed(() => {
  const ts = currentNote.value?.updatedAt || currentNote.value?.createdAt
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const monthNames = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktyabr', 'noyabr', 'dekabr',
    ]
    const day = d.getDate()
    const month = monthNames[d.getMonth()]
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}-${month}, ${year}, ${hours}:${mins}`
  } catch {
    return ''
  }
})

// Tanlangan loyiha va vazifa
const selectedProjectId = ref(null)
const selectedTaskId = ref(null)

watch(
  () => currentNote.value,
  (note) => {
    if (note) {
      selectedProjectId.value = note.projectId || null
      selectedTaskId.value = note.taskId || null
    }
  },
  { immediate: true }
)

/* --- Tiptap muharriri --- */

const editor = useEditor({
  content: currentNote.value?.content || '<p></p>',
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Underline,
  ],
  onUpdate: () => {
    scheduleAutoSave()
  },
})

// Agar noteId o'zgarsa, muharrir matnini yangilaymiz
watch(
  () => props.noteId,
  (newId) => {
    if (editor.value && currentNote.value) {
      const noteContent = currentNote.value.content
      if (noteContent) {
        editor.value.commands.setContent(noteContent, false)
      } else {
        editor.value.commands.setContent('<p></p>', false)
      }
      saveStatus.value = 'saved'
    }
  }
)

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
  editor.value?.destroy()
})

/* --- Avtosaqlash (500 ms debounce) --- */

function scheduleAutoSave() {
  saveStatus.value = 'saving'
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(performAutoSave, 500)
}

async function performAutoSave() {
  if (!editor.value || !props.noteId) return

  const json = editor.value.getJSON()
  const plainText = editor.value.getText()

  // Sarlavha: birinchi qatordan yoki birinchi blok matnidan olinadi
  const lines = plainText.split('\n').map((l) => l.trim()).filter(Boolean)
  const title = lines.length > 0 ? lines[0].slice(0, 150) : 'Sarlavhasiz qayd'

  await notesStore.update(props.noteId, {
    title,
    content: json,
    plainText,
    projectId: selectedProjectId.value,
    taskId: selectedTaskId.value,
  })

  saveStatus.value = 'saved'
}

/* --- Biriktirma (Rasm yuklash va siqish) --- */

function triggerUpload() {
  fileInputRef.value?.click()
}

/** Rasmni Canvas orqali siqish */
async function compressImage(file, maxWidth = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error("Rasmni siqishda xatolik yuz berdi."))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    uiStore.notify("Faqat rasm fayllarini yuklash mumkin.", { type: 'warning' })
    return
  }

  // 5 MB chegara
  if (file.size > 5 * 1024 * 1024) {
    uiStore.notify("Rasm hajmi 5 MB dan oshmasligi kerak.", { type: 'warning' })
    return
  }

  try {
    saveStatus.value = 'saving'
    const compressedBlob = await compressImage(file)
    const base64Data = await db.blobToBase64(compressedBlob)

    const attachment = {
      id: db.uid(),
      noteId: props.noteId,
      name: file.name,
      type: 'image/jpeg',
      size: compressedBlob.size,
      blob: compressedBlob,
      dataBase64: base64Data,
      createdAt: new Date().toISOString(),
    }

    await db.saveAttachment(attachment)

    // Muharrirga rasmni joylash
    editor.value?.chain().focus().setImage({ src: base64Data }).run()
    scheduleAutoSave()
    uiStore.notify("Rasm biriktirildi", { type: 'success' })
  } catch (err) {
    console.error(err)
    uiStore.notify("Rasm yuklashda xatolik yuz berdi.", { type: 'error' })
  } finally {
    event.target.value = ''
  }
}

/* --- Bog'lashni saqlash --- */

async function saveLinkages() {
  await notesStore.update(props.noteId, {
    projectId: selectedProjectId.value,
    taskId: selectedTaskId.value,
  })
  linkModalOpen.value = false
  uiStore.notify("Bog'lanish saqlandi", { type: 'success' })
}

function unlinkProject() {
  selectedProjectId.value = null
  saveLinkages()
}

function unlinkTask() {
  selectedTaskId.value = null
  saveLinkages()
}

/* --- Eksport amallari --- */

function exportMarkdown() {
  if (!currentNote.value) return
  const title = currentNote.value.title || 'qayd'
  const text = currentNote.value.plainText || ''
  const mdContent = `# ${title}\n\n${text}`
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, `${slugify(title)}.md`)
}

function exportText() {
  if (!currentNote.value) return
  const title = currentNote.value.title || 'qayd'
  const text = currentNote.value.plainText || ''
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, `${slugify(title)}.txt`)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .slice(0, 50) || 'qayd'
}
</script>

<template>
  <main class="note-editor-wrapper">
    <!-- Yashirin rasm input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="sr-only"
      @change="handleFileSelect"
    />

    <template v-if="currentNote">
      <!-- Apple Notes uslubidagi ixcham toolbar -->
      <div class="editor-header-bar">
        <button
          type="button"
          class="btn btn-ghost btn-sm mobile-back-btn"
          @click="emit('back')"
        >
          <AppIcon name="chevron-left" :size="18" />
          <span>Qaydlar</span>
        </button>

        <NoteToolbar
          :editor="editor"
          :is-pinned="currentNote.pinned"
          :has-task="!!currentNote.taskId"
          :has-project="!!currentNote.projectId"
          @upload-image="triggerUpload"
          @toggle-pin="notesStore.togglePin(currentNote.id)"
          @open-link-modal="linkModalOpen = true"
          @export-markdown="exportMarkdown"
          @export-text="exportText"
          @delete-note="emit('delete', currentNote.id)"
        />
      </div>

      <!-- Bog'langan loyiha yoki vazifa banneri -->
      <div
        v-if="currentNote.projectId || currentNote.taskId"
        class="note-link-bar"
      >
        <!-- Loyiha chipi -->
        <span
          v-if="currentNote.projectId && projectsStore.byId[currentNote.projectId]"
          class="link-chip project-chip"
          :style="{
            borderColor: projectsStore.byId[currentNote.projectId].color,
            color: projectsStore.byId[currentNote.projectId].color,
          }"
        >
          <span>Loyiha: {{ projectsStore.byId[currentNote.projectId].name }}</span>
          <button
            type="button"
            class="chip-remove-btn"
            title="Loyihani uzish"
            @click="unlinkProject"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </span>

        <!-- Vazifa chipi -->
        <span
          v-if="currentNote.taskId && tasksStore.byId[currentNote.taskId]"
          class="link-chip task-chip"
        >
          <AppIcon name="check-square" :size="12" />
          <span>Vazifa: {{ tasksStore.byId[currentNote.taskId].title }}</span>
          <button
            type="button"
            class="chip-remove-btn"
            title="Vazifani uzish"
            @click="unlinkTask"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </span>
      </div>

      <!-- Qayd sanasi va avtosaqlash holati indikatori -->
      <div class="note-meta-bar">
        <span class="note-datetime">{{ formattedDateTime }}</span>
        <span class="save-status-indicator" :class="saveStatus">
          <template v-if="saveStatus === 'saving'">
            <span class="status-dot saving-dot"></span>
            <span>Saqlanmoqda...</span>
          </template>
          <template v-else>
            <AppIcon name="check" :size="12" class="status-check" />
            <span>Saqlandi</span>
          </template>
        </span>
      </div>

      <!-- Tiptap matn muharriri qismi -->
      <div class="note-editor-container">
        <EditorContent :editor="editor" class="tiptap-content" />
      </div>
    </template>

    <!-- Qayd tanlanmagan holat -->
    <div v-else class="no-note-selected">
      <div class="no-note-card">
        <div class="no-note-icon">
          <AppIcon name="note" :size="36" />
        </div>
        <h3>Qayd tanlanmagan</h3>
        <p>Tahrirlash uchun chapdagi ro'yxatdan qaydni tanlang yoki yangisini yarating.</p>
      </div>
    </div>

    <!-- Loyiha / Vazifaga bog'lash modali -->
    <BaseModal
      :open="linkModalOpen"
      title="Qaydni bog'lash"
      width="440px"
      @close="linkModalOpen = false"
    >
      <div class="link-modal-form">
        <!-- Loyihani tanlash -->
        <div class="form-group">
          <label class="form-label">Tegishli loyiha:</label>
          <select v-model="selectedProjectId" class="form-select">
            <option :value="null">Loyihaga biriktirilmagan</option>
            <option
              v-for="proj in projectsStore.userProjects"
              :key="proj.id"
              :value="proj.id"
            >
              {{ proj.icon }} {{ proj.name }}
            </option>
          </select>
        </div>

        <!-- Vazifani tanlash -->
        <div class="form-group">
          <label class="form-label">Tegishli vazifa:</label>
          <select v-model="selectedTaskId" class="form-select">
            <option :value="null">Vazifaga biriktirilmagan</option>
            <option
              v-for="task in tasksStore.activeTasks"
              :key="task.id"
              :value="task.id"
            >
              {{ task.completed ? '✓ ' : '○ ' }}{{ task.title }}
            </option>
          </select>
        </div>

        <div class="modal-footer-actions">
          <button
            type="button"
            class="btn btn-secondary"
            @click="linkModalOpen = false"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="saveLinkages"
          >
            Saqlash
          </button>
        </div>
      </div>
    </BaseModal>
  </main>
</template>

<style scoped>
.note-editor-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
  position: relative;
}

.editor-header-bar {
  display: flex;
  align-items: center;
  background: var(--surface-solid);
  border-bottom: 1px solid var(--border);
}

.mobile-back-btn {
  display: none;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: var(--accent);
  margin-left: 8px;
}

.note-link-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}

.link-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--surface-solid);
}

.task-chip {
  color: var(--text-2);
}

.chip-remove-btn {
  display: inline-grid;
  place-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 1px;
}

.chip-remove-btn:hover {
  opacity: 1;
}

.note-meta-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 14px 24px 6px;
}

.note-datetime {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
  text-align: center;
}

.save-status-indicator {
  position: absolute;
  right: 24px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 500;
}

.save-status-indicator.saving {
  color: var(--warning);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.saving-dot {
  background: var(--warning);
  animation: pulse 1s infinite;
}

.status-check {
  color: var(--success);
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.note-editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 36px 60px;
  cursor: text;
}

/* Tiptap ichki formatlash uslublari */
:deep(.tiptap-content) {
  max-width: 820px;
  margin: 0 auto;
  min-height: 100%;
  outline: none;
  color: var(--text);
  font-size: 15px;
  line-height: 1.65;
}

:deep(.tiptap-content .ProseMirror) {
  min-height: 400px;
  outline: none;
}

:deep(.tiptap-content h1) {
  font-size: 26px;
  font-weight: 700;
  margin-top: 0.4em;
  margin-bottom: 0.3em;
  color: var(--text);
  line-height: 1.25;
}

:deep(.tiptap-content h2) {
  font-size: 20px;
  font-weight: 600;
  margin-top: 0.8em;
  margin-bottom: 0.3em;
  color: var(--text);
  line-height: 1.3;
}

:deep(.tiptap-content h3) {
  font-size: 17px;
  font-weight: 600;
  margin-top: 0.6em;
  margin-bottom: 0.2em;
  color: var(--text);
}

:deep(.tiptap-content p) {
  margin: 0.4em 0;
}

:deep(.tiptap-content ul),
:deep(.tiptap-content ol) {
  padding-left: 24px;
  margin: 0.5em 0;
}

:deep(.tiptap-content li) {
  margin: 0.25em 0;
}

/* Checklist (TaskList & TaskItem) */
:deep(ul[data-type="taskList"]) {
  list-style: none;
  padding: 0;
  margin: 0.5em 0;
}

:deep(ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 0;
}

:deep(ul[data-type="taskList"] li > label) {
  user-select: none;
  margin-top: 3px;
  cursor: pointer;
}

:deep(ul[data-type="taskList"] li > label input[type="checkbox"]) {
  appearance: none;
  -webkit-appearance: none;
  width: 17px;
  height: 17px;
  border: 1.8px solid var(--text-3);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all var(--dur) var(--ease);
  background: var(--surface-solid);
}

:deep(ul[data-type="taskList"] li > label input[type="checkbox"]:checked) {
  background: var(--warning);
  border-color: var(--warning);
}

:deep(ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after) {
  content: '';
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) translate(-0.5px, -0.5px);
}

:deep(ul[data-type="taskList"] li[data-checked="true"] > div) {
  text-decoration: line-through;
  opacity: 0.6;
}

:deep(ul[data-type="taskList"] li > div) {
  flex: 1;
}

/* Jadval (Table) */
:deep(.tiptap-content table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 16px 0;
  overflow: hidden;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
}

:deep(.tiptap-content th),
:deep(.tiptap-content td) {
  min-width: 1em;
  border: 1px solid var(--border);
  padding: 8px 12px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

:deep(.tiptap-content th) {
  font-weight: 600;
  text-align: left;
  background: var(--surface-2);
}

:deep(.tiptap-content .selectedCell:after) {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0; right: 0; top: 0; bottom: 0;
  background: var(--accent-soft);
  pointer-events: none;
}

/* Rasm (Image) */
:deep(.tiptap-content img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  margin: 12px 0;
  display: block;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}

/* Bo'sh holat */
.no-note-selected {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 30px;
}

.no-note-card {
  max-width: 360px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.no-note-icon {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  color: var(--text-3);
  display: grid;
  place-items: center;
}

.no-note-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.no-note-card p {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.5;
}

/* Modal formasi */
.link-modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.form-select {
  height: 38px;
  padding: 0 10px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text);
  font-size: 13.5px;
  outline: none;
}

.form-select:focus {
  border-color: var(--accent);
}

.modal-footer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .mobile-back-btn {
    display: inline-flex;
  }

  .note-editor-container {
    padding: 14px 18px 40px;
  }

  .note-meta-bar {
    padding: 10px 16px 4px;
  }

  .save-status-indicator {
    right: 16px;
  }
}
</style>
