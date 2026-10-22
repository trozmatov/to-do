<script setup>
/**
 * Umumiy modal oyna: desktopda markazda, mobilda pastdan chiquvchi "sheet".
 * Esc va fonni bosish bilan yopiladi, ochilganda birinchi input'ga fokus beriladi.
 */
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '520px' },
  /** Fonni bosganda yopilsinmi */
  dismissible: { type: Boolean, default: true },
})
const emit = defineEmits(['close'])

const panel = ref(null)
let lastFocused = null

function onKey(e) {
  if (e.key === 'Escape' && props.dismissible) emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      await nextTick()
      const target = panel.value?.querySelector('[autofocus], input:not([type=hidden]), textarea, select, button.btn-primary')
      target?.focus({ preventScroll: true })
    } else {
      cleanup()
      lastFocused?.focus?.({ preventScroll: true })
    }
  },
  { immediate: true },
)

function cleanup() {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
}
onBeforeUnmount(cleanup)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-root" @mousedown.self="dismissible && emit('close')">
        <div ref="panel" class="modal-panel" role="dialog" aria-modal="true" :aria-label="title" :style="{ '--w': width }">
          <header v-if="title || $slots.header" class="modal-header">
            <slot name="header">
              <h2 class="modal-title">{{ title }}</h2>
            </slot>
            <button class="btn btn-ghost btn-icon" type="button" aria-label="Yopish" @click="emit('close')">
              <AppIcon name="x" />
            </button>
          </header>
          <div class="modal-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: max(16px, var(--safe-top)) max(16px, var(--safe-right)) max(16px, var(--safe-bottom)) max(16px, var(--safe-left));
  background: var(--overlay);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.modal-panel {
  width: min(var(--w), 100%);
  max-height: min(88dvh, 820px);
  display: flex;
  flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 14px 6px 24px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
}

.modal-body {
  padding: 12px 24px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

/* Animatsiya */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s var(--ease);
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.3s var(--ease-spring), opacity 0.22s var(--ease);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(16px) scale(0.97);
  opacity: 0;
}

/* Mobil: pastdan chiquvchi panel */
@media (max-width: 640px) {
  .modal-root {
    place-items: end center;
    padding: 0;
  }
  .modal-panel {
    width: 100%;
    max-height: 92dvh;
    border-radius: 24px 24px 0 0;
    border-bottom: 0;
  }
  .modal-footer {
    padding-bottom: calc(16px + var(--safe-bottom));
  }
  .modal-footer :deep(.btn) {
    flex: 1;
  }
  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    transform: translateY(100%);
    opacity: 1;
  }
}
</style>
