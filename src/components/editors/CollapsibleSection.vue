<template>
  <div class="collapsible-section" :class="{ expanded: isExpanded }">
    <div class="section-header" @click="toggle">
      <span class="section-icon">{{ isExpanded ? '▼' : '▶' }}</span>
      <span class="section-title">{{ title }}</span>
      <span v-if="badge" class="section-badge">{{ badge }}</span>
    </div>
    <transition name="collapse">
      <div v-show="isExpanded" class="section-content">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  defaultExpanded: {
    type: Boolean,
    default: false
  },
  badge: {
    type: [String, Number],
    default: null
  }
})

const isExpanded = ref(props.defaultExpanded)

function toggle() {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.collapsible-section {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 8px;
  background: var(--bg-secondary);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-fast);
}

.section-header:hover {
  background: var(--bg-elevated);
}

.section-icon {
  font-size: 9px;
  color: var(--text-muted);
  width: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.section-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--accent-dim);
  color: var(--accent-light);
  border-radius: 10px;
  font-weight: 500;
}

.section-content {
  padding: 12px;
  border-top: 1px solid var(--border-default);
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  max-height: 2000px;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
