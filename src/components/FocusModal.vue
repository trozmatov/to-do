<script setup>
/**
 * Fokus rejimi va Pomodoro Taymeri (FocusModal.vue).
 * - 25 daqiqa (Pomodoro / Fokus)
 * - 5 daqiqa (Qisqa tanaffus)
 * - 15 daqiqa (Katta tanaffus)
 * - SVG aylanuvchi progress indikatori
 * - Boshlash / To'xtatish / Qayta boshlash
 * - Taymer tugaganda chalinuvchi mayin gong/signal
 * - Fokus ichidan turib vazifani "Bajarildi" deb belgilash
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { useTasksStore } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'
import { playTimerFinishSound } from '@/services/sound'
import { notifications } from '@/services/notifications'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: null }, // qaysi vazifa ustida ishlayotgani (ixtiyoriy)
})

const emit = defineEmits(['close'])

const tasksStore = useTasksStore()
const uiStore = useUiStore()

const MODES = {
  pomodoro: { label: 'Fokus (25m)', seconds: 25 * 60 },
  shortBreak: { label: 'Tanaffus (5m)', seconds: 5 * 60 },
  longBreak: { label: 'Dam olish (15m)', seconds: 15 * 60 },
}

const currentMode = ref('pomodoro')
const timeLeft = ref(MODES.pomodoro.seconds)
const isRunning = ref(false)
let timerId = null

const totalSeconds = computed(() => MODES[currentMode.value].seconds)

const minutesStr = computed(() => String(Math.floor(timeLeft.value / 60)).padStart(2, '0'))
const secondsStr = computed(() => String(timeLeft.value % 60).padStart(2, '0'))

// SVG progress aylana hisobi (radius = 90, circumference = 2 * PI * 90 ≈ 565.48)
const CIRCUMFERENCE = 2 * Math.PI * 90
const strokeDashoffset = computed(() => {
  const progress = timeLeft.value / totalSeconds.value
  return CIRCUMFERENCE * (1 - progress)
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      pauseTimer()
    } else {
      resetTimer()
    }
  },
)

function setMode(modeKey) {
  pauseTimer()
  currentMode.value = modeKey
  timeLeft.value = MODES[modeKey].seconds
}

function startTimer() {
  if (isRunning.value) return
  isRunning.value = true
  timerId = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      finishTimer()
    }
  }, 1000)
}

function pauseTimer() {
  isRunning.value = false
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function toggleTimer() {
  if (isRunning.value) pauseTimer()
  else startTimer()
}

function resetTimer() {
  pauseTimer()
  timeLeft.value = totalSeconds.value
}

function finishTimer() {
  pauseTimer()
  playTimerFinishSound()

  const msg =
    currentMode.value === 'pomodoro'
      ? "Ajoyib! Fokus vaqti yakunlandi. Endi biroz dam oling!"
      : "Tanaffus yakunlandi! Ishga qaytishga tayyormisiz?"

  if (notifications.isSupported() && Notification.permission === 'granted') {
    try {
      new Notification('Fokus taymeri', {
        body: msg,
        icon: '/pwa-192.png',
      })
    } catch {}
  }

  uiStore.notify(msg, { type: 'success', timeout: 7000 })
}

async function markTaskComplete() {
  if (!props.task) return
  await tasksStore.toggle(props.task.id)
  uiStore.notify(`"${props.task.title}" bajarildi!`, { type: 'success' })
  emit('close')
}

onUnmounted(() => {
  pauseTimer()
})
</script>

<template>
  <BaseModal
    :open="open"
    title="Fokus rejimi (Pomodoro)"
    width="480px"
    @close="emit('close')"
  >
    <div class="focus-modal-content">
      <!-- Tanlangan vazifa kartasi -->
      <div v-if="task" class="active-task-card">
        <span class="active-task-subtitle">Joriy vazifa:</span>
        <h3 class="active-task-title">{{ task.title }}</h3>
        <p v-if="task.description" class="active-task-desc">{{ task.description }}</p>
      </div>

      <!-- Rejim tanlash tablari -->
      <div class="mode-tabs">
        <button
          v-for="(mode, key) in MODES"
          :key="key"
          type="button"
          class="mode-tab-btn"
          :class="{ active: currentMode === key }"
          @click="setMode(key)"
        >
          {{ mode.label }}
        </button>
      </div>

      <!-- Katta aylanuvchi taymer -->
      <div class="timer-display-container">
        <svg class="timer-svg" viewBox="0 0 200 200">
          <!-- Orqa fon aylanasi -->
          <circle
            class="timer-circle-bg"
            cx="100"
            cy="100"
            r="90"
          />
          <!-- Progress aylanasi -->
          <circle
            class="timer-circle-fg"
            cx="100"
            cy="100"
            r="90"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="strokeDashoffset"
          />
        </svg>

        <div class="timer-text-wrap">
          <div class="timer-digits">
            <span>{{ minutesStr }}</span>
            <span class="colon">:</span>
            <span>{{ secondsStr }}</span>
          </div>
          <span class="timer-mode-name">
            {{ isRunning ? 'Diqqatni jamlang...' : 'To‘xtatilgan' }}
          </span>
        </div>
      </div>

      <!-- Boshqaruv tugmalari -->
      <div class="timer-actions">
        <button
          type="button"
          class="btn btn-secondary btn-icon reset-btn"
          title="Qayta boshlash"
          aria-label="Qayta boshlash"
          @click="resetTimer"
        >
          <AppIcon name="rotate-ccw" :size="18" />
        </button>

        <button
          type="button"
          class="btn btn-primary play-btn"
          @click="toggleTimer"
        >
          <AppIcon :name="isRunning ? 'pause' : 'play'" :size="20" />
          <span>{{ isRunning ? "Pauza" : "Boshlash" }}</span>
        </button>

        <button
          v-if="task && !task.completed"
          type="button"
          class="btn btn-secondary complete-btn"
          title="Vazifani bajarildi deb belgilash"
          @click="markTaskComplete"
        >
          <AppIcon name="check" :size="18" />
          <span>Bajarildi</span>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.focus-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 8px 0 12px;
}

.active-task-card {
  width: 100%;
  padding: 12px 16px;
  background: var(--surface-2);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  text-align: center;
}

.active-task-subtitle {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  font-weight: 700;
}

.active-task-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-top: 2px;
}

.active-task-desc {
  font-size: 12.5px;
  color: var(--text-2);
  margin-top: 4px;
  line-height: 1.4;
}

.mode-tabs {
  display: flex;
  gap: 6px;
  background: var(--surface-2);
  padding: 4px;
  border-radius: 999px;
  border: 1px solid var(--border);
}

.mode-tab-btn {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.mode-tab-btn:hover {
  color: var(--text);
}

.mode-tab-btn.active {
  background: var(--surface-solid);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.timer-display-container {
  position: relative;
  width: 220px;
  height: 220px;
  display: grid;
  place-items: center;
  margin: 6px 0;
}

.timer-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-circle-bg {
  fill: none;
  stroke: var(--surface-2);
  stroke-width: 9;
}

.timer-circle-fg {
  fill: none;
  stroke: var(--accent);
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.timer-text-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 1;
}

.timer-digits {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1;
}

.colon {
  margin: 0 2px;
  opacity: 0.6;
}

.timer-mode-name {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 500;
}

.timer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.play-btn {
  padding: 0 24px;
  height: 44px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 999px;
  box-shadow: var(--brand-shadow);
}

.reset-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.complete-btn {
  height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  color: var(--success);
}

.complete-btn:hover {
  background: var(--success-soft);
  color: var(--success);
}
</style>
