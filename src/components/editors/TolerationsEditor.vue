<template>
  <div class="tolerations-editor">
    <div 
      v-for="(toleration, index) in localTolerations" 
      :key="index" 
      class="toleration-card"
    >
      <div class="toleration-header">
        <span class="toleration-index">#{{ index + 1 }}</span>
        <button 
          class="btn-icon btn-remove" 
          @click="removeToleration(index)" 
          title="删除 Toleration"
        >
          ✕
        </button>
      </div>
      
      <div class="toleration-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Key</label>
            <input
              type="text"
              class="form-input"
              placeholder="node.kubernetes.io/not-ready"
              v-model="toleration.key"
              @input="emitChange"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Operator</label>
            <select class="form-select" v-model="toleration.operator" @change="emitChange">
              <option value="Equal">Equal</option>
              <option value="Exists">Exists</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group" v-if="toleration.operator === 'Equal'">
            <label class="form-label">Value</label>
            <input
              type="text"
              class="form-input"
              placeholder="value"
              v-model="toleration.value"
              @input="emitChange"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Effect</label>
            <select class="form-select" v-model="toleration.effect" @change="emitChange">
              <option value="">任意</option>
              <option value="NoSchedule">NoSchedule</option>
              <option value="PreferNoSchedule">PreferNoSchedule</option>
              <option value="NoExecute">NoExecute</option>
            </select>
          </div>
        </div>
        
        <div class="form-group" v-if="toleration.effect === 'NoExecute'">
          <label class="form-label">Toleration Seconds (秒)</label>
          <input
            type="number"
            class="form-input"
            min="0"
            placeholder="留空表示永久容忍"
            v-model.number="toleration.tolerationSeconds"
            @input="emitChange"
          />
        </div>
      </div>
    </div>
    
    <button class="btn btn-add" @click="addToleration">
      + 添加 Toleration
    </button>
    
    <div class="hint-text" v-if="localTolerations.length === 0">
      Tolerations 允许 Pod 调度到带有匹配 Taints 的节点上
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const localTolerations = ref([])

const defaultToleration = () => ({
  key: '',
  operator: 'Equal',
  value: '',
  effect: '',
  tolerationSeconds: null
})

watch(() => props.modelValue, (newVal) => {
  localTolerations.value = (newVal || []).map(t => ({
    key: t.key || '',
    operator: t.operator || 'Equal',
    value: t.value || '',
    effect: t.effect || '',
    tolerationSeconds: t.tolerationSeconds ?? null
  }))
}, { immediate: true, deep: true })

function addToleration() {
  localTolerations.value.push(defaultToleration())
}

function removeToleration(index) {
  localTolerations.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  const tolerations = localTolerations.value
    .filter(t => t.key || t.operator === 'Exists')
    .map(t => {
      const result = {}
      if (t.key) result.key = t.key
      result.operator = t.operator
      if (t.operator === 'Equal' && t.value) result.value = t.value
      if (t.effect) result.effect = t.effect
      if (t.effect === 'NoExecute' && t.tolerationSeconds != null) {
        result.tolerationSeconds = t.tolerationSeconds
      }
      return result
    })
  emit('update:modelValue', tolerations)
}
</script>

<style scoped>
.tolerations-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toleration-card {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-secondary);
}

.toleration-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: linear-gradient(135deg, var(--accent-dim), var(--bg-tertiary));
  border-bottom: 1px solid var(--border-default);
}

.toleration-index {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-light);
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
}

.toleration-body {
  padding: 10px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}

.form-input,
.form-select {
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.btn-icon {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: var(--danger);
  color: var(--danger);
}

.btn-add {
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-default);
  color: var(--text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-add:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-primary);
  color: var(--accent-light);
}

.hint-text {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
</style>
