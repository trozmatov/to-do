<script setup>
/**
 * Muddat turlari tablari: Kunlik | Haftalik | Oylik | Yillik.
 * Har bir tabda nomi va agar shu turda muddati o'tgan vazifalar bo'lsa qizil belgi ko'rsatiladi.
 */
import { computed } from 'vue'
import { PERIOD_TYPES, PERIOD_LABELS, usePeriod } from '@/composables/usePeriod'
import { useTasksStore } from '@/stores/tasks'

const { periodType, setType, todayISO } = usePeriod()
const tasksStore = useTasksStore()

const overdueCounts = computed(() => tasksStore.overdueCountsByType(todayISO.value))
</script>

<template>
  <nav class="period-tabs" aria-label="Muddat turlari">
    <div class="tabs-list" role="tablist">
      <button
        v-for="type in PERIOD_TYPES"
        :key="type"
        role="tab"
        :aria-selected="periodType === type"
        class="tab-btn"
        :class="{ active: periodType === type }"
        @click="setType(type)"
      >
        <span class="tab-label">{{ PERIOD_LABELS[type] }}</span>
        <span
          v-if="overdueCounts[type] > 0"
          class="overdue-badge"
          :title="overdueCounts[type] + ' ta muddati o\'tgan vazifa'"
        >
          {{ overdueCounts[type] }}
        </span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.period-tabs {
  width: 100%;
}

.tabs-list {
  display: flex;
  background: var(--surface-2);
  padding: 4px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  gap: 4px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 14px;
  color: var(--text-2);
  transition: all var(--dur) var(--ease);
  position: relative;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  background: var(--surface-solid);
  color: var(--text);
  box-shadow: var(--shadow-sm), 0 0 0 1px var(--border);
}

.overdue-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: var(--danger);
  color: #fff;
  line-height: 1;
  animation: pop 0.3s var(--ease-spring);
}
</style>
