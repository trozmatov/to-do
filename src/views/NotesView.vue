<script setup>
/**
 * Qaydlar sahifasi (NotesView).
 * - Apple Notes uslubidagi Split-view (chapda ro'yxat, o'ngda muharrir)
 * - Mobilda ro'yxat → muharrir almashinuvi
 * - Cmd/Ctrl + N yangi qayd tezkor tugmasi
 * - Marshrut bilan sinxronizatsiya (/notes va /notes/:id)
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '@/stores/notes'
import { useUiStore } from '@/stores/ui'
import NoteList from '@/components/NoteList.vue'
import NoteEditor from '@/components/NoteEditor.vue'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const uiStore = useUiStore()

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

// Mobilda muharrir ochiqmi
const isMobileEditorActive = computed(() => {
  return isMobile.value && !!notesStore.activeNoteId
})

/* --- Marshrut va tanlangan qayd sinxronizatsiyasi --- */

watch(
  () => route.params.id,
  (id) => {
    if (id && notesStore.byId[id]) {
      notesStore.activeNoteId = id
    } else if (!id && !isMobile.value) {
      // Desktopda birinchi qaydni avtomatik tanlash
      if (notesStore.filteredNotes.length > 0 && !notesStore.activeNoteId) {
        notesStore.activeNoteId = notesStore.filteredNotes[0].id
      }
    }
  },
  { immediate: true }
)

// filteredNotes o'zgarganda (masalan qidiruv yoki birinchi yuklanish)
watch(
  () => notesStore.filteredNotes,
  (list) => {
    if (!isMobile.value && list.length > 0 && !notesStore.activeNoteId) {
      notesStore.activeNoteId = list[0].id
      router.replace(`/notes/${list[0].id}`)
    }
  }
)

function handleSelectNote(id) {
  notesStore.activeNoteId = id
  router.push(`/notes/${id}`)
}

async function handleCreateNote() {
  const newNote = await notesStore.create({
    title: '',
  })
  if (newNote) {
    notesStore.activeNoteId = newNote.id
    router.push(`/notes/${newNote.id}`)
  }
}

function handleMobileBack() {
  notesStore.activeNoteId = null
  router.push('/notes')
}

async function handleDeleteNote(id) {
  await notesStore.moveToTrash(id)
  if (!isMobile.value && notesStore.filteredNotes.length > 0) {
    const nextId = notesStore.filteredNotes[0].id
    notesStore.activeNoteId = nextId
    router.replace(`/notes/${nextId}`)
  } else {
    notesStore.activeNoteId = null
    router.replace('/notes')
  }
}

/* --- Klaviatura tezkor tugmalari: Cmd/Ctrl + N --- */

function handleKeyDown(event) {
  const isCmdOrCtrl = event.metaKey || event.ctrlKey
  if (isCmdOrCtrl && event.key.toLowerCase() === 'n') {
    // Agar input yoki textarea ichida bo'lmasa yoki muharrir ichida bo'lsa ham yangi qayd
    event.preventDefault()
    handleCreateNote()
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleKeyDown)

  // Dastlabki yuklanishda desktopda birinchi qaydni tanlash
  if (!isMobile.value && notesStore.filteredNotes.length > 0 && !notesStore.activeNoteId) {
    const initialId = route.params.id || notesStore.filteredNotes[0].id
    notesStore.activeNoteId = initialId
    if (!route.params.id) {
      router.replace(`/notes/${initialId}`)
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="notes-view-container">
    <!-- Mobilda qaydlar ro'yxati yuqori paneli (burger va yangi qayd) -->
    <header v-if="isMobile && !isMobileEditorActive" class="mobile-notes-header">
      <div class="header-left">
        <button
          type="button"
          class="btn btn-ghost btn-icon menu-btn"
          aria-label="Menyuni ochish"
          @click="uiStore.sidebarOpen = true"
        >
          <AppIcon name="menu" :size="22" />
        </button>
        <h1 class="mobile-page-title">Qaydlar</h1>
      </div>

      <button
        type="button"
        class="btn btn-primary btn-sm mobile-new-btn"
        @click="handleCreateNote"
      >
        <AppIcon name="plus" :size="16" />
        <span>Yangi</span>
      </button>
    </header>

    <!-- Asosiy Apple Notes Split-view qismi -->
    <div class="notes-split-layout">
      <!-- Chap: Qaydlar ro'yxati -->
      <NoteList
        :mobile-active="isMobileEditorActive"
        @select-note="handleSelectNote"
        @create-note="handleCreateNote"
      />

      <!-- O'ng: Tiptap muharriri -->
      <NoteEditor
        v-if="!isMobile || isMobileEditorActive"
        :note-id="notesStore.activeNoteId"
        @back="handleMobileBack"
        @delete="handleDeleteNote"
      />
    </div>
  </div>
</template>

<style scoped>
.notes-view-container {
  flex: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

.mobile-notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface-solid);
  border-bottom: 1px solid var(--border);
  min-height: 56px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.mobile-new-btn {
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  gap: 5px;
}

.notes-split-layout {
  flex: 1;
  display: flex;
  height: 100%;
  overflow: hidden;
}

@media (min-width: 769px) {
  .mobile-notes-header {
    display: none;
  }
}
</style>
