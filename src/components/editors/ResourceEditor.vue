<template>
  <div class="resource-editor">
    <div class="resource-grid">
      <div class="resource-section">
        <div class="resource-header">Requests (请求)</div>
        <div class="resource-row">
          <div class="resource-field">
            <label class="resource-label">CPU</label>
            <input
              type="text"
              class="form-input"
              placeholder="100m"
              v-model="local.requests.cpu"
              @input="emitChange"
            />
          </div>
          <div class="resource-field">
            <label class="resource-label">Memory</label>
            <input
              type="text"
              class="form-input"
              placeholder="128Mi"
              v-model="local.requests.memory"
              @input="emitChange"
            />
          </div>
        </div>
      </div>
      
      <div class="resource-section">
        <div class="resource-header">Limits (限制)</div>
        <div class="resource-row">
          <div class="resource-field">
            <label class="resource-label">CPU</label>
            <input
              type="text"
              class="form-input"
              placeholder="500m"
              v-model="local.limits.cpu"
              @input="emitChange"
            />
          </div>
          <div class="resource-field">
            <label class="resource-label">Memory</label>
            <input
              type="text"
              class="form-input"
              placeholder="512Mi"
              v-model="local.limits.memory"
              @input="emitChange"
            />
          </div>
          <div class="resource-field">
            <label class="resource-label">GPU (NVIDIA)</label>
            <input
              type="text"
              class="form-input"
              placeholder="1"
              v-model="local.limits.gpu"
              @input="emitChange"
            />
          </div>
        </div>
      </div>
    </div>
    <small class="hint">CPU: 如 100m, 0.5, 1 | Memory: 如 64Mi, 1Gi</small>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const local = ref({
  requests: { cpu: '', memory: '' },
  limits: { cpu: '', memory: '', gpu: '' }
})

watch(() => props.modelValue, (newVal) => {
  local.value = {
    requests: {
      cpu: newVal?.requests?.cpu || '',
      memory: newVal?.requests?.memory || ''
    },
    limits: {
      cpu: newVal?.limits?.cpu || '',
      memory: newVal?.limits?.memory || '',
      gpu: newVal?.limits?.['nvidia.com/gpu'] || ''
    }
  }
}, { immediate: true, deep: true })

function emitChange() {
  const result = {}
  
  const requests = {}
  if (local.value.requests.cpu) requests.cpu = local.value.requests.cpu
  if (local.value.requests.memory) requests.memory = local.value.requests.memory
  if (Object.keys(requests).length > 0) result.requests = requests
  
  const limits = {}
  if (local.value.limits.cpu) limits.cpu = local.value.limits.cpu
  if (local.value.limits.memory) limits.memory = local.value.limits.memory
  if (local.value.limits.gpu) limits['nvidia.com/gpu'] = local.value.limits.gpu
  if (Object.keys(limits).length > 0) result.limits = limits
  
  emit('update:modelValue', Object.keys(result).length > 0 ? result : undefined)
}
</script>

<style scoped>
.resource-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.resource-section {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

.resource-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-600);
  margin-bottom: 8px;
}

.resource-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-label {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 500;
}

.resource-field .form-input {
  font-size: 13px;
  padding: 6px 8px;
}

.hint {
  color: var(--gray-500);
  font-size: 11px;
}
</style>
