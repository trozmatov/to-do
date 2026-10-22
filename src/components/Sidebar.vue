<script setup>
/**
 * Asosiy yon panel (Sidebar).
 * - "Barcha loyihalar" va "Kiruvchi"
 * - Loyihalar ro'yxati + bajarilmagan vazifalar soni
 * - Yangi loyiha qo'shish, tahrirlash va o'chirish
 * - Loyihani o'chirishda tasdiqlash oynasi (vazifalarni Kiruvchiga ko'chirish yoki o'chirish tanlovi bilan)
 * - Pastki qism: Sozlamalar, Widget, Mavzu almashtirish, O'rnatish
 * - Mobilda slide-over drawer va overlay
 */
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useTasksStore } from '@/stores/tasks'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useInstallPrompt } from '@/composables/useInstallPrompt'
import AppIcon from './AppIcon.vue'
import ProjectForm from './ProjectForm.vue'
import ConfirmModal from './ConfirmModal.vue'

const router = useRouter()
const route = useRoute()

const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const { showInstallButton } = useInstallPrompt()

const emit = defineEmits(['open-install'])

// Modal holatlari
const projectFormOpen = ref(false)
const editingProject = ref(null)

const confirmDeleteOpen = ref(false)
const projectToDelete = ref(null)
const deleteWithTasks = ref(false) // false: Kiruvchiga ko'chirish (default), true: birga o'chirish
const isDeleting = ref(false)

const deleteModalTitle = computed(() => `"${projectToDelete.value?.name || ''}" loyihasini o'chirish`)

function selectProject(id) {
  tasksStore.filter.projectId = id
  if (route.name !== 'home') {
    router.push('/')
  }
  uiStore.sidebarOpen = false
}

function openCreateProject() {
  editingProject.value = null
  projectFormOpen.value = true
}

function openEditProject(proj, event) {
  event?.stopPropagation()
  editingProject.value = proj
  projectFormOpen.value = true
}

function promptDeleteProject(proj, event) {
  event?.stopPropagation()
  projectToDelete.value = proj
  deleteWithTasks.value = false
  confirmDeleteOpen.value = true
}

async function handleConfirmDelete() {
  if (!projectToDelete.value) return
  isDeleting.value = true
  await projectsStore.remove(projectToDelete.value.id, {
    withTasks: deleteWithTasks.value,
  })
  isDeleting.value = false
  confirmDeleteOpen.value = false
  projectToDelete.value = null
}

function navigateTo(path) {
  router.push(path)
  uiStore.sidebarOpen = false
}

const themeIcons = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
}
const themeLabels = {
  system: 'Tizim',
  light: "Yorug'",
  dark: "Qorong'i",
}
</script>

<template>
  <div>
    <!-- Mobil fon qoplami (Overlay) -->
    <Transition name="fade">
      <div
        v-if="uiStore.sidebarOpen"
        class="sidebar-backdrop"
        @click="uiStore.sidebarOpen = false"
      ></div>
    </Transition>

    <!-- Asosiy yon panel -->
    <aside
      class="sidebar"
      :class="{ open: uiStore.sidebarOpen }"
      aria-label="Loyihalar va navigatsiya"
    >
      <!-- Sarlavha qismi (Brend) -->
      <div class="sidebar-header">
        <div class="brand-link" @click="navigateTo('/')">
          <div class="brand-icon">
            <AppIcon name="check" :size="18" :stroke="3" />
          </div>
          <div class="brand-text">
            <h2 class="brand-title">Vazifalar</h2>
            <span class="brand-badge">Oflayn</span>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-icon mobile-close-btn"
          aria-label="Yopish"
          @click="uiStore.sidebarOpen = false"
        >
          <AppIcon name="x" :size="20" />
        </button>
      </div>

      <!-- Loyihalar ro'yxati (Scroll qilinadigan qism) -->
      <div class="sidebar-content">
        <!-- Barcha loyihalar -->
        <button
          type="button"
          class="nav-item"
          :class="{ active: tasksStore.filter.projectId === 'all' && route.name === 'home' }"
          @click="selectProject('all')"
        >
          <span class="item-icon-wrap all-icon">
            <AppIcon name="layers" :size="18" />
          </span>
          <span class="item-name">Barcha loyihalar</span>
          <span v-if="tasksStore.openCountTotal > 0" class="badge">
            {{ tasksStore.openCountTotal }}
          </span>
        </button>

        <!-- Kiruvchi (Standart loyiha) -->
        <button
          type="button"
          class="nav-item"
          :class="{ active: tasksStore.filter.projectId === 'inbox' && route.name === 'home' }"
          @click="selectProject('inbox')"
        >
          <span class="item-icon-wrap" :style="{ backgroundColor: projectsStore.inbox?.color || '#6366f1' }">
            <span class="custom-emoji">{{ projectsStore.inbox?.icon || '📥' }}</span>
          </span>
          <span class="item-name">Kiruvchi</span>
          <span
            v-if="tasksStore.openCountByProject['inbox'] > 0"
            class="badge"
          >
            {{ tasksStore.openCountByProject['inbox'] }}
          </span>
        </button>

        <!-- Foydalanuvchi loyihalari bo'limi -->
        <div class="projects-section-header">
          <span class="section-title">Loyihalar</span>
          <button
            type="button"
            class="add-proj-btn"
            title="Yangi loyiha yaratish"
            aria-label="Yangi loyiha yaratish"
            @click="openCreateProject"
          >
            <AppIcon name="plus" :size="16" />
          </button>
        </div>

        <div class="projects-list">
          <div
            v-for="p in projectsStore.others"
            :key="p.id"
            class="project-item-row nav-item"
            :class="{ active: tasksStore.filter.projectId === p.id && route.name === 'home' }"
            @click="selectProject(p.id)"
          >
            <span class="item-icon-wrap" :style="{ backgroundColor: p.color }">
              <span class="custom-emoji">{{ p.icon || '📁' }}</span>
            </span>
            <span class="item-name">{{ p.name }}</span>

            <span
              v-if="tasksStore.openCountByProject[p.id] > 0"
              class="badge project-badge"
            >
              {{ tasksStore.openCountByProject[p.id] }}
            </span>

            <!-- Loyiha amallari: tahrirlash va o'chirish -->
            <div class="item-actions">
              <button
                type="button"
                class="mini-action-btn"
                title="Tahrirlash"
                aria-label="Loyihani tahrirlash"
                @click="openEditProject(p, $event)"
              >
                <AppIcon name="edit" :size="13" />
              </button>
              <button
                type="button"
                class="mini-action-btn delete-proj"
                title="O'chirish"
                aria-label="Loyihani o'chirish"
                @click="promptDeleteProject(p, $event)"
              >
                <AppIcon name="trash" :size="13" />
              </button>
            </div>
          </div>

          <div v-if="projectsStore.others.length === 0" class="empty-projects-hint">
            <span>Bo'limlarga ajratish uchun loyiha qo'shing</span>
          </div>
        </div>
      </div>

      <!-- Pastki boshqaruv paneli -->
      <div class="sidebar-footer">
        <!-- O'rnatish tugmasi (PWA o'rnatilmagan bo'lsa) -->
        <button
          v-if="showInstallButton"
          type="button"
          class="footer-nav-btn install-btn"
          @click="emit('open-install')"
        >
          <AppIcon name="download" :size="17" />
          <span>Ilovani o'rnatish</span>
        </button>

        <button
          type="button"
          class="footer-nav-btn"
          :class="{ active: route.name === 'widget' }"
          @click="navigateTo('/widget')"
        >
          <AppIcon name="widget" :size="17" />
          <span>Widget ko'rinishi</span>
        </button>

        <button
          type="button"
          class="footer-nav-btn"
          :class="{ active: route.name === 'settings' }"
          @click="navigateTo('/settings')"
        >
          <AppIcon name="settings" :size="17" />
          <span>Sozlamalar va Zaxira</span>
          <span v-if="settingsStore.backupReminderDue" class="footer-alert-dot" title="Zaxira eslatmasi"></span>
        </button>

        <!-- Mavzu o'zgartirish tugmasi -->
        <button
          type="button"
          class="footer-nav-btn theme-toggle-btn"
          @click="settingsStore.cycleTheme"
        >
          <AppIcon :name="themeIcons[settingsStore.theme]" :size="17" />
          <span>Mavzu: {{ themeLabels[settingsStore.theme] }}</span>
        </button>
      </div>
    </aside>

    <!-- Loyiha formasi modali -->
    <ProjectForm
      :open="projectFormOpen"
      :project="editingProject"
      @close="projectFormOpen = false"
    />

    <!-- Loyihani o'chirish tasdiqlash modali -->
    <ConfirmModal
      :open="confirmDeleteOpen"
      :title="deleteModalTitle"
      confirm-text="O'chirish"
      :danger="true"
      :busy="isDeleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="handleConfirmDelete"
    >
      <div class="delete-project-options">
        <p class="delete-warning-text">
          Ushbu loyihadagi vazifalar bilan nima qilinsin?
        </p>
        <div class="radio-options-group">
          <label class="radio-card" :class="{ selected: !deleteWithTasks }">
            <input
              v-model="deleteWithTasks"
              type="radio"
              :value="false"
              class="sr-only"
            />
            <span class="custom-radio-circle" :class="{ active: !deleteWithTasks }"></span>
            <div class="radio-card-content">
              <strong>Kiruvchiga ko'chirish</strong>
              <span class="radio-desc">Vazifalar saqlanadi va "Kiruvchi" bo'limiga o'tkaziladi (tavsiya etiladi).</span>
            </div>
          </label>

          <label class="radio-card" :class="{ selected: deleteWithTasks }">
            <input
              v-model="deleteWithTasks"
              type="radio"
              :value="true"
              class="sr-only"
            />
            <span class="custom-radio-circle" :class="{ active: deleteWithTasks }"></span>
            <div class="radio-card-content">
              <strong class="danger-text">Vazifalar bilan birga o'chirish</strong>
              <span class="radio-desc">Loyihaga tegishli barcha vazifalar butunlay o'chiriladi.</span>
            </div>
          </label>
        </div>
      </div>
    </ConfirmModal>
  </div>
</template>

<style scoped>
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: var(--overlay);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--sidebar-w);
  z-index: 50;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  backdrop-filter: blur(24px) saturate(1.4);
  transition: transform 0.3s var(--ease);
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 12px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--grad-brand);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: var(--brand-shadow);
}

.brand-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}

.brand-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.mobile-close-btn {
  display: none;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-weight: 600;
  font-size: 14px;
  text-align: left;
  transition: all var(--dur) var(--ease);
  cursor: pointer;
  border: 1px solid transparent;
}

.nav-item:hover {
  background: var(--hover);
  color: var(--text);
}

.nav-item.active {
  background: var(--surface-solid);
  color: var(--accent);
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}

.item-icon-wrap {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 13px;
  flex-shrink: 0;
}

.all-icon {
  background: var(--accent-soft);
  color: var(--accent);
}

.custom-emoji {
  line-height: 1;
}

.item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.projects-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 10px 6px;
}

.section-title {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
}

.add-proj-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--text-2);
  transition: all var(--dur) var(--ease);
}

.add-proj-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-item-row {
  position: relative;
}

.item-actions {
  display: none;
  align-items: center;
  gap: 2px;
}

.project-item-row:hover .item-actions {
  display: flex;
}

.project-item-row:hover .project-badge {
  display: none;
}

.mini-action-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--text-3);
  transition: all var(--dur) var(--ease);
}

.mini-action-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.mini-action-btn.delete-proj:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.empty-projects-hint {
  padding: 10px;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.4;
}

/* Footer paneli */
.sidebar-footer {
  padding: 10px 12px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.footer-nav-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-weight: 500;
  font-size: 13.5px;
  text-align: left;
  transition: all var(--dur) var(--ease);
  position: relative;
}

.footer-nav-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.footer-nav-btn.active {
  background: var(--surface-solid);
  color: var(--accent);
}

.install-btn {
  color: var(--accent);
  font-weight: 600;
}

.footer-alert-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
  margin-left: auto;
}

/* O'chirish modali tanlovlari */
.delete-project-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.delete-warning-text {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.radio-options-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface-solid);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.radio-card:hover {
  border-color: var(--accent);
}

.radio-card.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.custom-radio-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
  display: grid;
  place-items: center;
  margin-top: 2px;
  flex-shrink: 0;
}

.custom-radio-circle.active {
  border-color: var(--accent);
}

.custom-radio-circle.active::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.radio-card-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}

.radio-desc {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.35;
}

.danger-text {
  color: var(--danger);
}

/* Mobil moslashuv */
@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: var(--shadow-lg);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .mobile-close-btn {
    display: grid;
  }
}
</style>
