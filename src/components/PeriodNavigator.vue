<script setup>
/**
 * Davr navigatsiyasi: ← va → tugmalari, "Bugun", davr nomi (sarlavha) va izoh.
 */
import { usePeriod } from '@/composables/usePeriod'
import AppIcon from './AppIcon.vue'

const { label, subtitle, isCurrent, prev, next, goToday, periodType } = usePeriod()

const todayButtonLabel = {
  day: 'Bugun',
  week: 'Shu hafta',
  month: 'Shu oy',
  year: 'Shu yil',
}
</script>

<template>
  <div class="period-navigator">
    <div class="header-info">
      <h1 class="period-title">{{ label }}</h1>
      <p class="period-subtitle">{{ subtitle }}</p>
    </div>

    <div class="nav-controls">
      <button
        v-if="!isCurrent"
        type="button"
        class="btn btn-secondary btn-sm today-btn"
        @click="goToday"
      >
        <AppIcon name="calendar" :size="15" />
        <span>{{ todayButtonLabel[periodType] || 'Bugun' }}</span>
      </button>

      <div class="arrows-group">
        <button
          type="button"
          class="btn btn-secondary btn-icon nav-btn"
          aria-label="Oldingi davr"
          title="Oldingi"
          @click="prev"
        >
          <AppIcon name="chevron-left" :size="18" />
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-icon nav-btn"
          aria-label="Keyingi davr"
          title="Keyingi"
          @click="next"
        >
          <AppIcon name="chevron-right" :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.period-navigator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.period-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.025em;
}

.period-subtitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  text-transform: capitalize;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.today-btn {
  font-weight: 600;
  border-radius: var(--radius-sm);
  padding: 0 12px;
}

.arrows-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-2);
  padding: 3px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.nav-btn {
  width: 34px;
  height: 34px;
  min-height: 34px;
  border-radius: 8px;
  background: transparent;
  border-color: transparent;
}

.nav-btn:hover:not(:disabled) {
  background: var(--surface-solid);
  border-color: var(--border);
}

@media (max-width: 640px) {
  .period-title {
    font-size: 20px;
  }
}
</style>
