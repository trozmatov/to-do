<script setup>
/**
 * Vazifalar ro'yxati filtri va qidiruv asboblari paneli.
 * - Holat bo'yicha filtr (Barchasi, Bajarilmagan, Bajarilgan)
 * - Saralash tartibi (Qo'lda / Muhimlik bo'yicha)
 * - Qidiruv
 */
import { useTasksStore } from '@/stores/tasks'
import { useSettingsStore } from '@/stores/settings'
import AppIcon from './AppIcon.vue'

const tasksStore = useTasksStore()
const settingsStore = useSettingsStore()

const statusOptions = [
  { value: 'all', label: 'Barchasi' },
  { value: 'open', label: 'Bajarilmagan' },
  { value: 'done', label: 'Bajarilgan' },
]

const sortOptions = [
  { value: 'manual', label: "Qo'lda tartib" },
  { value: 'priority', label: 'Muhimlik' },
]
</script>

<template>
  <div class="task-toolbar">
    <div class="search-wrap">
      <AppIcon name="search" :size="16" class="search-icon" />
      <input
        v-model="tasksStore.filter.search"
        type="search"
        class="search-input"
        placeholder="Vazifalardan qidirish..."
        aria-label="Vazifalardan qidirish"
      />
      <button
        v-if="tasksStore.filter.search"
        type="button"
        class="clear-btn"
        aria-label="Tozalash"
        @click="tasksStore.filter.search = ''"
      >
        <AppIcon name="x" :size="14" />
      </button>
    </div>

    <div class="filters-row">
      <div class="segmented status-segmented" role="radiogroup" aria-label="Holat bo'yicha filtr">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          type="button"
          role="radio"
          :aria-checked="tasksStore.filter.status === opt.value"
          :class="{ active: tasksStore.filter.status === opt.value }"
          @click="tasksStore.filter.status = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="sort-selector">
        <label for="sort-select" class="sr-only">Saralash tartibi</label>
        <select
          id="sort-select"
          :value="settingsStore.sortMode"
          class="select select-sm"
          @change="settingsStore.setSortMode($event.target.value)"
        >
          <option v-for="s in sortOptions" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: var(--text-3);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 38px 0 38px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface-solid);
  color: var(--text);
  font-size: 14px;
  transition: all var(--dur) var(--ease);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.clear-btn {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--text-3);
}

.clear-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.filters-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.status-segmented {
  padding: 3px;
  border-radius: var(--radius-sm);
}

.status-segmented button {
  min-height: 32px;
  padding: 0 12px;
  font-size: 13px;
}

.select-sm {
  min-height: 38px;
  height: 38px;
  padding: 6px 30px 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  background-color: var(--surface-solid);
  width: auto;
}

@media (max-width: 640px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .status-segmented {
    width: 100%;
  }
  .sort-selector {
    width: 100%;
  }
  .select-sm {
    width: 100%;
  }
}
</style>
