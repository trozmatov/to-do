<script setup>
/** Tasdiqlash oynasi. Qo'shimcha tanlovlar uchun default slot bor. */
import BaseModal from './BaseModal.vue'
import AppIcon from './AppIcon.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Ishonchingiz komilmi?' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Tasdiqlash' },
  cancelText: { type: String, default: 'Bekor qilish' },
  danger: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <BaseModal :open="open" width="440px" @close="emit('cancel')">
    <div class="confirm">
      <div class="confirm-icon" :class="{ danger }">
        <AppIcon :name="danger ? 'trash' : 'info'" :size="22" />
      </div>
      <h2 class="confirm-title">{{ title }}</h2>
      <p v-if="message" class="confirm-message">{{ message }}</p>
      <slot />
    </div>
    <template #footer>
      <button class="btn btn-secondary" type="button" @click="emit('cancel')">{{ cancelText }}</button>
      <button
        class="btn"
        :class="danger ? 'btn-danger' : 'btn-primary'"
        type="button"
        :disabled="busy"
        @click="emit('confirm')"
      >
        {{ confirmText }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirm-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: 4px;
}

.confirm-icon.danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.confirm-title {
  font-size: 19px;
  font-weight: 700;
}

.confirm-message {
  color: var(--text-2);
}
</style>
