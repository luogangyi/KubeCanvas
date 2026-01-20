<template>
  <div class="pod-affinity-term-editor">
    <div class="affinity-section">
      <h4 class="section-title">必须满足</h4>
      <div 
        v-for="(term, index) in localValue.required" 
        :key="'req-' + index" 
        class="term-card"
      >
        <div class="term-header">
          <span>条件 #{{ index + 1 }}</span>
          <button class="btn-icon btn-remove" @click="removeRequired(index)">✕</button>
        </div>
        <div class="term-body">
          <div class="form-group">
            <label class="form-label">Topology Key</label>
            <input
              type="text"
              class="form-input"
              placeholder="kubernetes.io/hostname"
              v-model="term.topologyKey"
              @input="emitChange"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Namespaces (逗号分隔，留空表示同命名空间)</label>
            <input
              type="text"
              class="form-input"
              placeholder="default, kube-system"
              v-model="term.namespacesText"
              @input="emitChange"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Label Selector</label>
            <MatchExpressionsEditor 
              v-model="term.labelSelector.matchExpressions"
              @update:modelValue="emitChange"
            />
          </div>
        </div>
      </div>
      <button class="btn btn-add-small" @click="addRequired">+ 添加必须条件</button>
    </div>
    
    <div class="affinity-section">
      <h4 class="section-title">优先满足</h4>
      <div 
        v-for="(pref, index) in localValue.preferred" 
        :key="'pref-' + index" 
        class="term-card"
      >
        <div class="term-header">
          <span>偏好 #{{ index + 1 }}</span>
          <div class="weight-input">
            <label>权重:</label>
            <input 
              type="number" 
              min="1" 
              max="100" 
              v-model.number="pref.weight"
              @input="emitChange"
            />
          </div>
          <button class="btn-icon btn-remove" @click="removePreferred(index)">✕</button>
        </div>
        <div class="term-body">
          <div class="form-group">
            <label class="form-label">Topology Key</label>
            <input
              type="text"
              class="form-input"
              placeholder="kubernetes.io/hostname"
              v-model="pref.podAffinityTerm.topologyKey"
              @input="emitChange"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Label Selector</label>
            <MatchExpressionsEditor 
              v-model="pref.podAffinityTerm.labelSelector.matchExpressions"
              @update:modelValue="emitChange"
            />
          </div>
        </div>
      </div>
      <button class="btn btn-add-small" @click="addPreferred">+ 添加偏好条件</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import MatchExpressionsEditor from './MatchExpressionsEditor.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ required: [], preferred: [] })
  },
  label: {
    type: String,
    default: 'Pod Affinity'
  }
})

const emit = defineEmits(['update:modelValue'])

const localValue = ref({ required: [], preferred: [] })

watch(() => props.modelValue, (newVal) => {
  localValue.value = {
    required: (newVal?.required || []).map(t => ({
      topologyKey: t.topologyKey || '',
      namespacesText: (t.namespaces || []).join(', '),
      labelSelector: {
        matchExpressions: t.labelSelector?.matchExpressions || [],
        matchLabels: t.labelSelector?.matchLabels || {}
      }
    })),
    preferred: (newVal?.preferred || []).map(p => ({
      weight: p.weight || 1,
      podAffinityTerm: {
        topologyKey: p.podAffinityTerm?.topologyKey || '',
        labelSelector: {
          matchExpressions: p.podAffinityTerm?.labelSelector?.matchExpressions || [],
          matchLabels: p.podAffinityTerm?.labelSelector?.matchLabels || {}
        }
      }
    }))
  }
}, { immediate: true, deep: true })

function addRequired() {
  localValue.value.required.push({
    topologyKey: 'kubernetes.io/hostname',
    namespacesText: '',
    labelSelector: { matchExpressions: [], matchLabels: {} }
  })
}

function removeRequired(index) {
  localValue.value.required.splice(index, 1)
  emitChange()
}

function addPreferred() {
  localValue.value.preferred.push({
    weight: 1,
    podAffinityTerm: {
      topologyKey: 'kubernetes.io/hostname',
      labelSelector: { matchExpressions: [], matchLabels: {} }
    }
  })
}

function removePreferred(index) {
  localValue.value.preferred.splice(index, 1)
  emitChange()
}

function emitChange() {
  const result = {
    required: localValue.value.required
      .filter(t => t.topologyKey)
      .map(t => {
        const term = {
          topologyKey: t.topologyKey,
          labelSelector: {}
        }
        if (t.namespacesText) {
          term.namespaces = t.namespacesText.split(',').map(n => n.trim()).filter(n => n)
        }
        if (t.labelSelector.matchExpressions?.length > 0) {
          term.labelSelector.matchExpressions = t.labelSelector.matchExpressions
        }
        return term
      }),
    preferred: localValue.value.preferred
      .filter(p => p.podAffinityTerm?.topologyKey)
      .map(p => ({
        weight: p.weight,
        podAffinityTerm: {
          topologyKey: p.podAffinityTerm.topologyKey,
          labelSelector: {
            ...(p.podAffinityTerm.labelSelector.matchExpressions?.length > 0 && {
              matchExpressions: p.podAffinityTerm.labelSelector.matchExpressions
            })
          }
        }
      }))
  }
  emit('update:modelValue', result)
}
</script>

<style scoped>
.pod-affinity-term-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.affinity-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.term-card {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.term-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-default);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.term-body {
  padding: 10px;
}

.form-group {
  margin-bottom: 10px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.form-input {
  width: 100%;
  padding: 5px 8px;
  font-size: 11px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.weight-input {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.weight-input input {
  width: 50px;
  padding: 2px 4px;
  font-size: 11px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn-icon {
  width: 20px;
  height: 20px;
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

.btn-add-small {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 500;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-default);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-add-small:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-primary);
  color: var(--accent-light);
}
</style>
