<script setup>
/** Ekranning pastidagi xabarlar (toast). */
import { useUiStore } from '@/stores/ui'
import AppIcon from './AppIcon.vue'

const ui = useUiStore()
const ICONS = { info: 'info', success: 'check', error: 'alert', warning: 'alert' }

function runAction(toast) {
  toast.action?.run()
  ui.dismiss(toast.id)
}
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.type" role="status">
        <span class="toast-icon"><AppIcon :name="ICONS[t.type]" :size="18" :stroke="2.4" /></span>
        <span class="toast-msg">{{ t.message }}</span>
        <button v-if="t.action" class="toast-action" type="button" @click="runAction(t)">{{ t.action.label }}</button>
        <button class="toast-close" type="button" aria-label="Yopish" @click="ui.dismiss(t.id)">
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: calc(20px + var(--safe-bottom));
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 8px;
  width: min(460px, calc(100vw - 24px));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 8px 8px 8px 14px;
  border-radius: 16px;
  background: #1b1d33;
  color: #f1f2fa;
  box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.45);
  font-size: 14px;
  font-weight: 500;
}

:root[data-theme='dark'] .toast {
  background: #2a2d4a;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.toast-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);
}

.toast.success .toast-icon {
  background: rgba(46, 196, 176, 0.22);
  color: #5eead4;
}
.toast.error .toast-icon {
  background: rgba(255, 99, 105, 0.22);
  color: #ff9a9e;
}
.toast.warning .toast-icon {
  background: rgba(245, 181, 68, 0.22);
  color: #fcd34d;
}

.toast-msg {
  flex: 1;
  line-height: 1.35;
}

.toast-action {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  font-weight: 700;
  color: #b4abff;
}
.toast-action:hover {
  background: rgba(255, 255, 255, 0.08);
}

.toast-close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.55);
}
.toast-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s var(--ease-spring);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
</style>
