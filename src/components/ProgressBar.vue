<script setup>
/** Bajarilish foizi */
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 }, // 0..100
  size: { type: String, default: 'md' }, // 'sm' | 'md'
  label: { type: String, default: 'Bajarilish' },
})

const clamped = computed(() => Math.max(0, Math.min(100, Math.round(props.value))))
</script>

<template>
  <div
    class="progress"
    :class="[size, { complete: clamped === 100 }]"
    role="progressbar"
    :aria-valuenow="clamped"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <div class="progress-fill" :style="{ width: clamped + '%' }"></div>
  </div>
</template>

<style scoped>
.progress {
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.progress.sm {
  height: 6px;
}

.progress-fill {
  position: relative;
  height: 100%;
  border-radius: inherit;
  background: var(--grad-brand);
  transition:
    width 0.6s var(--ease),
    background 0.4s var(--ease);
}

/* Yaltirash effekti */
.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: translateX(-100%);
  animation: shimmer 2.4s ease-in-out infinite;
}

.complete .progress-fill {
  background: linear-gradient(90deg, #10b981, #14b8a6);
}

@keyframes shimmer {
  60%,
  100% {
    transform: translateX(100%);
  }
}
</style>
