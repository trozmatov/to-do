<script setup>
/** Bo'sh holat: chiroyli illyustratsiya va xabar */
defineProps({
  title: { type: String, default: "Hozircha vazifa yo'q" },
  text: { type: String, default: "Yangi vazifa qo'shing — rejangiz shu yerda paydo bo'ladi." },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="empty" :class="{ compact }">
    <svg class="empty-art" viewBox="0 0 160 120" aria-hidden="true">
      <defs>
        <linearGradient id="emptyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6366f1" />
          <stop offset="1" stop-color="#a855f7" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="108" rx="52" ry="6" class="shadow" />
      <rect x="34" y="14" width="92" height="84" rx="16" class="paper" />
      <rect x="48" y="34" width="14" height="14" rx="4" fill="url(#emptyGrad)" />
      <path d="M51.5 41l3 3 5-5.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="70" y="37" width="40" height="8" rx="4" class="line" />
      <rect x="48" y="58" width="14" height="14" rx="4" class="box" />
      <rect x="70" y="61" width="30" height="8" rx="4" class="line" />
      <circle cx="124" cy="22" r="10" fill="url(#emptyGrad)" class="spark" />
      <path d="M124 17v10M119 22h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
    </svg>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-text">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 40px 20px 44px;
  animation: slide-up 0.4s var(--ease);
}

.empty.compact {
  padding: 20px 12px;
}

.empty-art {
  width: 150px;
  height: auto;
  margin-bottom: 8px;
}
.compact .empty-art {
  width: 96px;
}

.paper {
  fill: var(--surface-solid);
  stroke: var(--border-strong);
}
.line {
  fill: var(--surface-2);
}
.box {
  fill: none;
  stroke: var(--border-strong);
  stroke-width: 2;
}
.shadow {
  fill: var(--accent-soft);
}
.spark {
  animation: float 3s ease-in-out infinite;
  transform-origin: 124px 22px;
}

@keyframes float {
  50% {
    transform: translateY(-4px);
  }
}

.empty-title {
  font-size: 17px;
  font-weight: 700;
}
.compact .empty-title {
  font-size: 15px;
}

.empty-text {
  color: var(--text-2);
  max-width: 320px;
  font-size: 14px;
}
</style>
