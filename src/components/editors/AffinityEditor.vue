<template>
  <div class="affinity-editor">
    <!-- Node Affinity Tab -->
    <div class="affinity-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'node' }"
        @click="activeTab = 'node'"
      >
        节点亲和性
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'pod' }"
        @click="activeTab = 'pod'"
      >
        Pod 亲和性
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'podAnti' }"
        @click="activeTab = 'podAnti'"
      >
        Pod 反亲和
      </button>
    </div>
    
    <!-- Node Affinity -->
    <div v-if="activeTab === 'node'" class="affinity-content">
      <div class="affinity-section">
        <h4 class="section-title">必须满足 (requiredDuringSchedulingIgnoredDuringExecution)</h4>
        <div 
          v-for="(term, termIndex) in localAffinity.nodeRequired" 
          :key="'req-' + termIndex" 
          class="term-card"
        >
          <div class="term-header">
            <span>条件组 #{{ termIndex + 1 }}</span>
            <button class="btn-icon btn-remove" @click="removeNodeRequired(termIndex)">✕</button>
          </div>
          <MatchExpressionsEditor 
            v-model="term.matchExpressions"
            @update:modelValue="emitChange"
          />
        </div>
        <button class="btn btn-add-small" @click="addNodeRequired">+ 添加必须条件</button>
      </div>
      
      <div class="affinity-section">
        <h4 class="section-title">优先满足 (preferredDuringSchedulingIgnoredDuringExecution)</h4>
        <div 
          v-for="(pref, prefIndex) in localAffinity.nodePreferred" 
          :key="'pref-' + prefIndex" 
          class="term-card"
        >
          <div class="term-header">
            <span>偏好 #{{ prefIndex + 1 }}</span>
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
            <button class="btn-icon btn-remove" @click="removeNodePreferred(prefIndex)">✕</button>
          </div>
          <MatchExpressionsEditor 
            v-model="pref.preference.matchExpressions"
            @update:modelValue="emitChange"
          />
        </div>
        <button class="btn btn-add-small" @click="addNodePreferred">+ 添加偏好条件</button>
      </div>
    </div>
    
    <!-- Pod Affinity -->
    <div v-if="activeTab === 'pod'" class="affinity-content">
      <PodAffinityTermEditor 
        v-model="localAffinity.podAffinity"
        label="Pod 亲和性"
        @update:modelValue="emitChange"
      />
    </div>
    
    <!-- Pod Anti-Affinity -->
    <div v-if="activeTab === 'podAnti'" class="affinity-content">
      <PodAffinityTermEditor 
        v-model="localAffinity.podAntiAffinity"
        label="Pod 反亲和"
        @update:modelValue="emitChange"
      />
    </div>
    
    <div class="hint-text" v-if="isEmpty">
      亲和性规则控制 Pod 调度到哪些节点上
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import MatchExpressionsEditor from './MatchExpressionsEditor.vue'
import PodAffinityTermEditor from './PodAffinityTermEditor.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const activeTab = ref('node')

const localAffinity = ref({
  nodeRequired: [],
  nodePreferred: [],
  podAffinity: { required: [], preferred: [] },
  podAntiAffinity: { required: [], preferred: [] }
})

const isEmpty = computed(() => {
  return localAffinity.value.nodeRequired.length === 0 &&
         localAffinity.value.nodePreferred.length === 0 &&
         localAffinity.value.podAffinity.required.length === 0 &&
         localAffinity.value.podAffinity.preferred.length === 0 &&
         localAffinity.value.podAntiAffinity.required.length === 0 &&
         localAffinity.value.podAntiAffinity.preferred.length === 0
})

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    localAffinity.value = {
      nodeRequired: [],
      nodePreferred: [],
      podAffinity: { required: [], preferred: [] },
      podAntiAffinity: { required: [], preferred: [] }
    }
    return
  }
  
  // Parse nodeAffinity
  const nodeAff = newVal.nodeAffinity || {}
  localAffinity.value.nodeRequired = (nodeAff.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms || [])
    .map(t => ({ matchExpressions: t.matchExpressions || [] }))
  localAffinity.value.nodePreferred = (nodeAff.preferredDuringSchedulingIgnoredDuringExecution || [])
    .map(p => ({
      weight: p.weight || 1,
      preference: { matchExpressions: p.preference?.matchExpressions || [] }
    }))
  
  // Parse podAffinity
  const podAff = newVal.podAffinity || {}
  localAffinity.value.podAffinity = {
    required: podAff.requiredDuringSchedulingIgnoredDuringExecution || [],
    preferred: podAff.preferredDuringSchedulingIgnoredDuringExecution || []
  }
  
  // Parse podAntiAffinity
  const podAntiAff = newVal.podAntiAffinity || {}
  localAffinity.value.podAntiAffinity = {
    required: podAntiAff.requiredDuringSchedulingIgnoredDuringExecution || [],
    preferred: podAntiAff.preferredDuringSchedulingIgnoredDuringExecution || []
  }
}, { immediate: true, deep: true })

function addNodeRequired() {
  localAffinity.value.nodeRequired.push({ matchExpressions: [] })
}

function removeNodeRequired(index) {
  localAffinity.value.nodeRequired.splice(index, 1)
  emitChange()
}

function addNodePreferred() {
  localAffinity.value.nodePreferred.push({
    weight: 1,
    preference: { matchExpressions: [] }
  })
}

function removeNodePreferred(index) {
  localAffinity.value.nodePreferred.splice(index, 1)
  emitChange()
}

function emitChange() {
  const result = {}
  
  // Build nodeAffinity
  if (localAffinity.value.nodeRequired.length > 0 || localAffinity.value.nodePreferred.length > 0) {
    result.nodeAffinity = {}
    
    if (localAffinity.value.nodeRequired.length > 0) {
      result.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution = {
        nodeSelectorTerms: localAffinity.value.nodeRequired
          .filter(t => t.matchExpressions?.length > 0)
          .map(t => ({ matchExpressions: t.matchExpressions }))
      }
    }
    
    if (localAffinity.value.nodePreferred.length > 0) {
      result.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution = 
        localAffinity.value.nodePreferred
          .filter(p => p.preference?.matchExpressions?.length > 0)
          .map(p => ({
            weight: p.weight,
            preference: { matchExpressions: p.preference.matchExpressions }
          }))
    }
  }
  
  // Build podAffinity
  if (localAffinity.value.podAffinity.required.length > 0 || 
      localAffinity.value.podAffinity.preferred.length > 0) {
    result.podAffinity = {}
    if (localAffinity.value.podAffinity.required.length > 0) {
      result.podAffinity.requiredDuringSchedulingIgnoredDuringExecution = 
        localAffinity.value.podAffinity.required
    }
    if (localAffinity.value.podAffinity.preferred.length > 0) {
      result.podAffinity.preferredDuringSchedulingIgnoredDuringExecution = 
        localAffinity.value.podAffinity.preferred
    }
  }
  
  // Build podAntiAffinity
  if (localAffinity.value.podAntiAffinity.required.length > 0 || 
      localAffinity.value.podAntiAffinity.preferred.length > 0) {
    result.podAntiAffinity = {}
    if (localAffinity.value.podAntiAffinity.required.length > 0) {
      result.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution = 
        localAffinity.value.podAntiAffinity.required
    }
    if (localAffinity.value.podAntiAffinity.preferred.length > 0) {
      result.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution = 
        localAffinity.value.podAntiAffinity.preferred
    }
  }
  
  emit('update:modelValue', Object.keys(result).length > 0 ? result : null)
}
</script>

<style scoped>
.affinity-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.affinity-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.tab-btn {
  flex: 1;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border-default);
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--bg-elevated);
}

.tab-btn.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.affinity-content {
  min-height: 100px;
}

.affinity-section {
  margin-bottom: 16px;
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

.weight-input {
  display: flex;
  align-items: center;
  gap: 4px;
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

.hint-text {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
</style>
