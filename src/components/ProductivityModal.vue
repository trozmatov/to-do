<script setup>
/**
 * Unumdorlik va Odatlar (Streak & Productivity) paneli.
 * - Ketma-ket kunlik streak (🔥)
 * - 7 kunlik bar-chart unumdorlik statistikasi
 * - Bugun va jami bajarilgan vazifalar soni
 */
import { computed } from 'vue'
import { useTasksStore } from '@/stores/tasks'
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const tasksStore = useTasksStore()
const stats = computed(() => tasksStore.productivityStats)

const streakTitle = computed(() => {
  const s = stats.value.streak
  if (s === 0) return "Streakni bugun boshlang!"
  if (s === 1) return "1 kunlik streak boshlandi! 🔥"
  return `${s} kunlik uzluksiz streak! 🔥`
})

const motivationalMessage = computed(() => {
  const s = stats.value.streak
  if (s === 0) return "Bugungi kunlik rejalardan birontasini bajaring va olovli ketma-ketlikni faollashtiring."
  if (s < 3) return "Ajoyib boshlanish! Har kuni rejalaringizni belgilab borish odatga aylanadi."
  if (s < 7) return "Qoyilmaqom unumdorlik! Bir haftalik marraga oz qoldi."
  return "Haqiqiy professionallik! Siz o'z vaqtingizni ajoyib boshqaryapsiz."
})
</script>

<template>
  <BaseModal
    :open="open"
    title="Unumdorlik va Statistika"
    width="520px"
    @close="emit('close')"
  >
    <div class="productivity-content">
      <!-- Katta Streak banneri -->
      <div class="streak-hero-card">
        <div class="streak-flame-icon">
          <AppIcon name="flame" :size="36" />
        </div>
        <div class="streak-info">
          <h3 class="streak-heading">{{ streakTitle }}</h3>
          <p class="streak-desc">{{ motivationalMessage }}</p>
        </div>
      </div>

      <!-- Tezkor ko'rsatkichlar -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-num">{{ stats.todayDone }}</span>
          <span class="stat-label">Bugun bajarilgan</span>
        </div>
        <div class="stat-card">
          <span class="stat-num highlight">{{ stats.streak }} kun</span>
          <span class="stat-label">Joriy streak</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ stats.totalCompleted }}</span>
          <span class="stat-label">Jami bajarilgan</span>
        </div>
      </div>

      <!-- 7 kunlik faollik grafigi -->
      <div class="chart-section">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <AppIcon name="bar-chart" :size="16" />
            <span class="chart-title">Oxirgi 7 kundagi faollik</span>
          </div>
          <span class="chart-subtitle">Bajarilgan vazifalar soni</span>
        </div>

        <div class="bar-chart">
          <div
            v-for="item in stats.last7Days"
            :key="item.date"
            class="bar-column"
            :class="{ 'is-today': item.isToday }"
          >
            <span class="bar-count-tooltip">{{ item.count }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{
                  height: `${item.count ? Math.max(12, Math.round((item.count / stats.maxCountInWeek) * 100)) : 0}%`,
                }"
              ></div>
            </div>
            <span class="bar-day-name">{{ item.dayName }}</span>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.productivity-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0 10px;
}

/* Streak Hero */
.streak-hero-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(245, 165, 36, 0.15) 0%, rgba(229, 72, 77, 0.15) 100%);
  border: 1px solid rgba(245, 165, 36, 0.3);
  border-radius: var(--radius);
}

.streak-flame-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px -4px rgba(239, 68, 68, 0.5);
  flex-shrink: 0;
  animation: pulse 2.5s infinite var(--ease);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.streak-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.streak-heading {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.streak-desc {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.4;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-align: center;
}

.stat-num {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.2;
}

.stat-num.highlight {
  color: var(--warning);
}

.stat-label {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
  font-weight: 500;
}

/* 7-kunlik chart */
.chart-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

.chart-subtitle {
  font-size: 11.5px;
  color: var(--text-3);
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 130px;
  padding-top: 20px;
  gap: 8px;
}

.bar-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 6px;
}

.bar-count-tooltip {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
  height: 16px;
  display: grid;
  place-items: center;
}

.bar-track {
  flex: 1;
  width: 100%;
  max-width: 28px;
  background: var(--surface-solid);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  border: 1px solid var(--border);
}

.bar-fill {
  width: 100%;
  background: var(--accent);
  border-radius: 5px;
  transition: height 0.4s var(--ease);
}

.bar-column.is-today .bar-fill {
  background: var(--grad-brand);
  box-shadow: 0 0 10px rgba(99, 70, 240, 0.4);
}

.bar-column.is-today .bar-day-name {
  color: var(--accent);
  font-weight: 700;
}

.bar-day-name {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-3);
}
</style>
