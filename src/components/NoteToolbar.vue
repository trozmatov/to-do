<script setup>
/**
 * Apple Notes uslubidagi asboblar paneli (NoteToolbar).
 * - Aa formati (Sarlavha, Bo'lim, Matn, Qalin, Kursiv, Tagiga chizilgan, Ro'yxatlar)
 * - Checklist (Task items)
 * - Jadval (Table)
 * - Biriktirma (Rasm yuklash)
 * - » Amallar menyusi (Qadash, Vazifaga/Loyihaga bog'lash, Eksport, O'chirish)
 */
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  editor: { type: Object, default: null },
  isPinned: { type: Boolean, default: false },
  hasTask: { type: Boolean, default: false },
  hasProject: { type: Boolean, default: false },
})

const emit = defineEmits([
  'upload-image',
  'toggle-pin',
  'open-link-modal',
  'export-markdown',
  'export-text',
  'delete-note',
])

const aaMenuOpen = ref(false)
const tableMenuOpen = ref(false)
const moreMenuOpen = ref(false)

const toolbarRef = ref(null)

function closeAllMenus() {
  aaMenuOpen.value = false
  tableMenuOpen.value = false
  moreMenuOpen.value = false
}

function handleClickOutside(event) {
  if (toolbarRef.value && !toolbarRef.value.contains(event.target)) {
    closeAllMenus()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

/* --- Formatlash amallari --- */

function toggleBold() {
  props.editor?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  props.editor?.chain().focus().toggleItalic().run()
}

function toggleUnderline() {
  props.editor?.chain().focus().toggleUnderline().run()
}

function setHeading(level) {
  props.editor?.chain().focus().toggleHeading({ level }).run()
  aaMenuOpen.value = false
}

function setParagraph() {
  props.editor?.chain().focus().setParagraph().run()
  aaMenuOpen.value = false
}

function toggleBulletList() {
  props.editor?.chain().focus().toggleBulletList().run()
  aaMenuOpen.value = false
}

function toggleOrderedList() {
  props.editor?.chain().focus().toggleOrderedList().run()
  aaMenuOpen.value = false
}

function toggleTaskList() {
  props.editor?.chain().focus().toggleTaskList().run()
}

/* --- Jadval amallari --- */

function insertTable() {
  props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  tableMenuOpen.value = false
}

function addColumnBefore() {
  props.editor?.chain().focus().addColumnBefore().run()
}

function addColumnAfter() {
  props.editor?.chain().focus().addColumnAfter().run()
}

function deleteColumn() {
  props.editor?.chain().focus().deleteColumn().run()
}

function addRowBefore() {
  props.editor?.chain().focus().addRowBefore().run()
}

function addRowAfter() {
  props.editor?.chain().focus().addRowAfter().run()
}

function deleteRow() {
  props.editor?.chain().focus().deleteRow().run()
}

function deleteTable() {
  props.editor?.chain().focus().deleteTable().run()
  tableMenuOpen.value = false
}
</script>

<template>
  <div ref="toolbarRef" class="note-toolbar">
    <!-- Chap tomon: formatlash guruhlari -->
    <div class="toolbar-group">
      <!-- Aa menyusi -->
      <div class="dropdown-wrapper">
        <button
          type="button"
          class="tb-btn aa-btn"
          :class="{ active: aaMenuOpen }"
          title="Matn formati (Aa)"
          @click="aaMenuOpen = !aaMenuOpen; tableMenuOpen = false; moreMenuOpen = false"
        >
          <span class="aa-text">Aa</span>
          <AppIcon name="chevron-down" :size="12" />
        </button>

        <Transition name="scale-fade">
          <div v-if="aaMenuOpen" class="popover-menu aa-popover">
            <div class="popover-section">
              <button
                type="button"
                class="popover-item"
                :class="{ active: editor?.isActive('heading', { level: 1 }) }"
                @click="setHeading(1)"
              >
                <span class="preview-h1">Sarlavha</span>
              </button>
              <button
                type="button"
                class="popover-item"
                :class="{ active: editor?.isActive('heading', { level: 2 }) }"
                @click="setHeading(2)"
              >
                <span class="preview-h2">Bo'lim sarlavhasi</span>
              </button>
              <button
                type="button"
                class="popover-item"
                :class="{ active: editor?.isActive('paragraph') }"
                @click="setParagraph"
              >
                <span class="preview-p">Oddiy matn</span>
              </button>
            </div>

            <div class="popover-divider"></div>

            <div class="popover-inline-tools">
              <button
                type="button"
                class="inline-tool-btn"
                :class="{ active: editor?.isActive('bold') }"
                title="Qalin (Ctrl+B)"
                @click="toggleBold"
              >
                <AppIcon name="bold" :size="15" />
              </button>
              <button
                type="button"
                class="inline-tool-btn"
                :class="{ active: editor?.isActive('italic') }"
                title="Kursiv (Ctrl+I)"
                @click="toggleItalic"
              >
                <AppIcon name="italic" :size="15" />
              </button>
              <button
                type="button"
                class="inline-tool-btn"
                :class="{ active: editor?.isActive('underline') }"
                title="Tagiga chizilgan (Ctrl+U)"
                @click="toggleUnderline"
              >
                <AppIcon name="underline" :size="15" />
              </button>
            </div>

            <div class="popover-divider"></div>

            <div class="popover-section">
              <button
                type="button"
                class="popover-item"
                :class="{ active: editor?.isActive('bulletList') }"
                @click="toggleBulletList"
              >
                <AppIcon name="list" :size="16" />
                <span>Nuqtali ro'yxat</span>
              </button>
              <button
                type="button"
                class="popover-item"
                :class="{ active: editor?.isActive('orderedList') }"
                @click="toggleOrderedList"
              >
                <AppIcon name="list-ordered" :size="16" />
                <span>Raqamli ro'yxat</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Checklist -->
      <button
        type="button"
        class="tb-btn"
        :class="{ active: editor?.isActive('taskList') }"
        title="Checklist qo'shish"
        @click="toggleTaskList"
      >
        <AppIcon name="check-square" :size="17" />
      </button>

      <!-- Jadval (Table) -->
      <div class="dropdown-wrapper">
        <button
          type="button"
          class="tb-btn"
          :class="{ active: editor?.isActive('table') || tableMenuOpen }"
          title="Jadval"
          @click="tableMenuOpen = !tableMenuOpen; aaMenuOpen = false; moreMenuOpen = false"
        >
          <AppIcon name="table" :size="17" />
        </button>

        <Transition name="scale-fade">
          <div v-if="tableMenuOpen" class="popover-menu table-popover">
            <template v-if="!editor?.isActive('table')">
              <button
                type="button"
                class="popover-item"
                @click="insertTable"
              >
                <AppIcon name="table" :size="16" />
                <span>Jadval kiritish (3x3)</span>
              </button>
            </template>
            <template v-else>
              <button type="button" class="popover-item" @click="addColumnBefore">
                Ustun chapga qo'shish
              </button>
              <button type="button" class="popover-item" @click="addColumnAfter">
                Ustun o'ngga qo'shish
              </button>
              <button type="button" class="popover-item danger-item" @click="deleteColumn">
                Ustunni o'chirish
              </button>
              <div class="popover-divider"></div>
              <button type="button" class="popover-item" @click="addRowBefore">
                Qator tepaga qo'shish
              </button>
              <button type="button" class="popover-item" @click="addRowAfter">
                Qator pastga qo'shish
              </button>
              <button type="button" class="popover-item danger-item" @click="deleteRow">
                Qatorni o'chirish
              </button>
              <div class="popover-divider"></div>
              <button type="button" class="popover-item danger-item" @click="deleteTable">
                Jadvalni butunlay o'chirish
              </button>
            </template>
          </div>
        </Transition>
      </div>

      <!-- Rasm biriktirish -->
      <button
        type="button"
        class="tb-btn"
        title="Rasm yuklash"
        @click="emit('upload-image')"
      >
        <AppIcon name="image" :size="17" />
      </button>

      <!-- Vazifa / Loyihaga bog'lash -->
      <button
        type="button"
        class="tb-btn link-btn"
        :class="{ active: hasTask || hasProject }"
        title="Loyiha yoki Vazifaga bog'lash"
        @click="emit('open-link-modal')"
      >
        <AppIcon name="link" :size="16" />
      </button>
    </div>

    <!-- O'ng tomon: » Qo'shimcha amallar -->
    <div class="toolbar-group right-group">
      <div class="dropdown-wrapper">
        <button
          type="button"
          class="tb-btn more-btn"
          :class="{ active: moreMenuOpen }"
          title="Qo'shimcha amallar"
          @click="moreMenuOpen = !moreMenuOpen; aaMenuOpen = false; tableMenuOpen = false"
        >
          <AppIcon name="chevrons-right" :size="17" />
        </button>

        <Transition name="scale-fade">
          <div v-if="moreMenuOpen" class="popover-menu more-popover">
            <!-- Qadash -->
            <button
              type="button"
              class="popover-item"
              @click="emit('toggle-pin'); moreMenuOpen = false"
            >
              <AppIcon :name="isPinned ? 'pin-off' : 'pin'" :size="16" />
              <span>{{ isPinned ? 'Qadashni bekor qilish' : 'Tepaga qadash' }}</span>
            </button>

            <!-- Bog'lash -->
            <button
              type="button"
              class="popover-item"
              @click="emit('open-link-modal'); moreMenuOpen = false"
            >
              <AppIcon name="link" :size="16" />
              <span>Loyiha / Vazifaga bog'lash</span>
            </button>

            <div class="popover-divider"></div>

            <!-- Markdown eksport -->
            <button
              type="button"
              class="popover-item"
              @click="emit('export-markdown'); moreMenuOpen = false"
            >
              <AppIcon name="download" :size="16" />
              <span>Markdown (.md) sifatida yuklash</span>
            </button>

            <!-- Matn eksport -->
            <button
              type="button"
              class="popover-item"
              @click="emit('export-text'); moreMenuOpen = false"
            >
              <AppIcon name="download" :size="16" />
              <span>Matn (.txt) sifatida yuklash</span>
            </button>

            <div class="popover-divider"></div>

            <!-- Savatchaga tashlash -->
            <button
              type="button"
              class="popover-item danger-item"
              @click="emit('delete-note'); moreMenuOpen = false"
            >
              <AppIcon name="trash" :size="16" />
              <span>Savatchaga tashlash</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: var(--surface-solid);
  border-bottom: 1px solid var(--border);
  gap: 12px;
  position: relative;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.right-group {
  margin-left: auto;
}

.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  min-width: 32px;
  padding: 0 6px;
  border-radius: var(--radius-xs);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.tb-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.tb-btn.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}

.aa-btn {
  font-weight: 700;
  padding: 0 8px;
}

.aa-text {
  font-size: 13.5px;
  letter-spacing: -0.5px;
}

.dropdown-wrapper {
  position: relative;
}

/* Popover menus */
.popover-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--bg-elev);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  padding: 6px;
  min-width: 200px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.right-group .popover-menu {
  left: auto;
  right: 0;
}

.popover-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  cursor: pointer;
  text-align: left;
  transition: background var(--dur) var(--ease);
}

.popover-item:hover {
  background: var(--hover);
}

.popover-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.danger-item {
  color: var(--danger);
}

.danger-item:hover {
  background: var(--danger-soft);
}

.preview-h1 {
  font-size: 17px;
  font-weight: 700;
}

.preview-h2 {
  font-size: 15px;
  font-weight: 600;
}

.preview-p {
  font-size: 13px;
  font-weight: 400;
}

.popover-inline-tools {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 4px;
}

.inline-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.inline-tool-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.inline-tool-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* Animations */
.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
