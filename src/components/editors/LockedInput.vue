<template>
  <div class="locked-input" :class="{ 'locked-input--locked': isLocked, 'locked-input--warning': hasWarning }">
    <div class="locked-input__wrapper">
      <!-- Text Input -->
      <input
        v-if="type === 'text' || type === 'number'"
        :type="type"
        :class="['form-input', inputClass]"
        :value="modelValue"
        :disabled="isLocked"
        :placeholder="placeholder"
        :min="min"
        @input="handleInput"
      />
      
      <!-- Select -->
      <select
        v-else-if="type === 'select'"
        :class="['form-select', inputClass]"
        :value="modelValue"
        :disabled="isLocked"
        @change="handleChange"
      >
        <slot />
      </select>
      
      <!-- Textarea -->
      <textarea
        v-else-if="type === 'textarea'"
        :class="['form-textarea', inputClass]"
        :value="modelValue"
        :disabled="isLocked"
        :placeholder="placeholder"
        :rows="rows"
        @input="handleInput"
      />
      
      <!-- Lock Icon -->
      <div 
        v-if="isLocked" 
        class="locked-input__lock"
        @mouseenter="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
        🔒
      </div>
      
      <!-- Warning Icon -->
      <div 
        v-else-if="hasWarning" 
        class="locked-input__warning"
        @mouseenter="showTooltip = true"
        @mouseleave="showTooltip = false"
      >
        ⚠️
      </div>
    </div>
    
    <!-- Tooltip -->
    <Transition name="fade">
      <div v-if="showTooltip && tooltipText" class="locked-input__tooltip">
        {{ tooltipText }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FieldEditability } from '../config/immutablePaths'

const props = defineProps<{
  modelValue: string | number | null | undefined
  editability: FieldEditability
  type?: 'text' | 'number' | 'select' | 'textarea'
  placeholder?: string
  inputClass?: string
  min?: number
  rows?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const showTooltip = ref(false)

const isLocked = computed(() => !props.editability.editable)
const hasWarning = computed(() => props.editability.editable && !!props.editability.note)

const tooltipText = computed(() => {
  if (!props.editability.editable) {
    return props.editability.reason || '此字段不可变。如需修改，请删除并重建资源。'
  }
  return props.editability.note || null
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.locked-input {
  position: relative;
  width: 100%;
}

.locked-input__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.locked-input__wrapper input,
.locked-input__wrapper select,
.locked-input__wrapper textarea {
  width: 100%;
  padding-right: 32px;
}

/* Locked state */
.locked-input--locked .form-input,
.locked-input--locked .form-select,
.locked-input--locked .form-textarea {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.7;
  border-color: var(--border-default);
}

.locked-input--locked .form-input:focus,
.locked-input--locked .form-select:focus,
.locked-input--locked .form-textarea:focus {
  outline: none;
  border-color: var(--border-default);
  box-shadow: none;
}

/* Warning state */
.locked-input--warning .form-input,
.locked-input--warning .form-select,
.locked-input--warning .form-textarea {
  border-color: var(--warning-color, #f59e0b);
}

/* Lock icon */
.locked-input__lock {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  cursor: help;
  opacity: 0.6;
  user-select: none;
}

/* Warning icon */
.locked-input__warning {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  cursor: help;
  user-select: none;
}

/* Tooltip */
.locked-input__tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background: var(--bg-elevated, #1e1e2e);
  border: 1px solid var(--border-subtle, #3a3a4a);
  border-radius: var(--radius-sm, 6px);
  color: var(--text-primary, #fff);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 280px;
  white-space: normal;
  text-align: center;
}

.locked-input__tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--bg-elevated, #1e1e2e);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
