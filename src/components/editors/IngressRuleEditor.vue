<template>
  <div class="ingress-rule-editor">
    <div 
      v-for="(rule, ruleIndex) in localRules" 
      :key="ruleIndex" 
      class="rule-row"
    >
      <div class="rule-header">
        <div class="rule-field host-field">
          <label class="rule-label">Host</label>
          <input
            type="text"
            class="form-input"
            placeholder="example.com"
            v-model="rule.host"
            @input="emitChange"
          />
        </div>
        <button class="btn-icon btn-remove" @click="removeRule(ruleIndex)" title="删除规则">
          ✕
        </button>
      </div>
      
      <div class="paths-section">
        <div class="paths-header">路径配置</div>
        <div 
          v-for="(path, pathIndex) in rule.paths" 
          :key="pathIndex" 
          class="path-row"
        >
          <div class="path-field">
            <label class="path-label">路径</label>
            <input
              type="text"
              class="form-input"
              placeholder="/"
              v-model="path.path"
              @input="emitChange"
            />
          </div>
          <div class="path-field">
            <label class="path-label">类型</label>
            <select class="form-select" v-model="path.pathType" @change="emitChange">
              <option value="Prefix">Prefix</option>
              <option value="Exact">Exact</option>
              <option value="ImplementationSpecific">ImplementationSpecific</option>
            </select>
          </div>
          <div class="path-field">
            <label class="path-label">Service</label>
            <input
              type="text"
              class="form-input"
              placeholder="my-service"
              v-model="path.serviceName"
              @input="emitChange"
            />
          </div>
          <div class="path-field port-field">
            <label class="path-label">Port</label>
            <input
              type="number"
              class="form-input"
              placeholder="80"
              v-model.number="path.servicePort"
              @input="emitChange"
            />
          </div>
          <button class="btn-icon btn-remove-small" @click="removePath(ruleIndex, pathIndex)" title="删除路径">
            ✕
          </button>
        </div>
        <button class="btn btn-add-small" @click="addPath(ruleIndex)">
          + 添加路径
        </button>
      </div>
    </div>
    <button class="btn btn-add" @click="addRule">
      <span>+ 添加规则</span>
    </button>
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

const localRules = ref([])

// 解析 K8s rules 格式
function parseRules(rules) {
  return (rules || []).map(rule => ({
    host: rule.host || '',
    paths: (rule.http?.paths || []).map(p => ({
      path: p.path || '/',
      pathType: p.pathType || 'Prefix',
      serviceName: p.backend?.service?.name || '',
      servicePort: p.backend?.service?.port?.number || 80
    }))
  }))
}

// 转换回 K8s 格式
function toK8sFormat(rules) {
  return rules
    .filter(r => r.paths.length > 0)
    .map(rule => ({
      ...(rule.host && { host: rule.host }),
      http: {
        paths: rule.paths
          .filter(p => p.serviceName)
          .map(p => ({
            path: p.path || '/',
            pathType: p.pathType || 'Prefix',
            backend: {
              service: {
                name: p.serviceName,
                port: {
                  number: p.servicePort
                }
              }
            }
          }))
      }
    }))
}

watch(() => props.modelValue, (newVal) => {
  localRules.value = parseRules(newVal)
}, { immediate: true, deep: true })

function addRule() {
  localRules.value.push({
    host: '',
    paths: [{
      path: '/',
      pathType: 'Prefix',
      serviceName: '',
      servicePort: 80
    }]
  })
  emitChange()
}

function removeRule(index) {
  localRules.value.splice(index, 1)
  emitChange()
}

function addPath(ruleIndex) {
  localRules.value[ruleIndex].paths.push({
    path: '/',
    pathType: 'Prefix',
    serviceName: '',
    servicePort: 80
  })
  emitChange()
}

function removePath(ruleIndex, pathIndex) {
  localRules.value[ruleIndex].paths.splice(pathIndex, 1)
  emitChange()
}

function emitChange() {
  emit('update:modelValue', toK8sFormat(localRules.value))
}
</script>

<style scoped>
.ingress-rule-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.rule-row {
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
}

.rule-header {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.rule-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.host-field {
  flex: 1;
}

.rule-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

.paths-section {
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-default);
}

.paths-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.path-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
}

.path-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 60px;
}

.port-field {
  max-width: 70px;
}

.path-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 500;
}

.path-field .form-input,
.path-field .form-select,
.rule-field .form-input {
  font-size: 12px;
  padding: 5px 6px;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-default);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.btn-remove:hover,
.btn-remove-small:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--danger);
  color: var(--danger);
}

.btn-remove-small {
  width: 24px;
  height: 24px;
  font-size: 10px;
  margin-bottom: 2px;
}

.btn-add, .btn-add-small {
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  background: transparent;
  border: 1px dashed var(--border-default);
  color: var(--text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-add-small {
  padding: var(--space-1) var(--space-2);
  font-size: 12px;
}

.btn-add:hover, .btn-add-small:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-primary);
  color: var(--accent-light);
}
</style>
