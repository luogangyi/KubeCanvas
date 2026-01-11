<template>
  <div class="env-editor">
    <div 
      v-for="(env, index) in localEnvs" 
      :key="index" 
      class="env-row"
    >
      <div class="env-fields">
        <div class="env-field name-field">
          <label class="env-label">名称</label>
          <input
            type="text"
            class="form-input"
            placeholder="ENV_NAME"
            v-model="env.name"
            @input="emitChange"
          />
        </div>
        
        <div class="env-field type-field">
          <label class="env-label">类型</label>
          <select class="form-select" v-model="env.type" @change="onTypeChange(index)">
            <option value="value">直接值</option>
            <option value="configMapKeyRef">ConfigMap</option>
            <option value="secretKeyRef">Secret</option>
            <option value="fieldRef">字段引用</option>
          </select>
        </div>
        
        <!-- 直接值 -->
        <div v-if="env.type === 'value'" class="env-field value-field">
          <label class="env-label">值</label>
          <input
            type="text"
            class="form-input"
            placeholder="value"
            v-model="env.value"
            @input="emitChange"
          />
        </div>
        
        <!-- ConfigMap 引用 -->
        <template v-else-if="env.type === 'configMapKeyRef'">
          <div class="env-field">
            <label class="env-label">ConfigMap</label>
            <input
              type="text"
              class="form-input"
              placeholder="configmap-name"
              v-model="env.configMapName"
              @input="emitChange"
            />
          </div>
          <div class="env-field">
            <label class="env-label">Key</label>
            <input
              type="text"
              class="form-input"
              placeholder="key"
              v-model="env.configMapKey"
              @input="emitChange"
            />
          </div>
        </template>
        
        <!-- Secret 引用 -->
        <template v-else-if="env.type === 'secretKeyRef'">
          <div class="env-field">
            <label class="env-label">Secret</label>
            <input
              type="text"
              class="form-input"
              placeholder="secret-name"
              v-model="env.secretName"
              @input="emitChange"
            />
          </div>
          <div class="env-field">
            <label class="env-label">Key</label>
            <input
              type="text"
              class="form-input"
              placeholder="key"
              v-model="env.secretKey"
              @input="emitChange"
            />
          </div>
        </template>
        
        <!-- 字段引用 -->
        <div v-else-if="env.type === 'fieldRef'" class="env-field value-field">
          <label class="env-label">字段路径</label>
          <select class="form-select" v-model="env.fieldPath" @change="emitChange">
            <option value="metadata.name">metadata.name</option>
            <option value="metadata.namespace">metadata.namespace</option>
            <option value="metadata.uid">metadata.uid</option>
            <option value="spec.nodeName">spec.nodeName</option>
            <option value="spec.serviceAccountName">spec.serviceAccountName</option>
            <option value="status.hostIP">status.hostIP</option>
            <option value="status.podIP">status.podIP</option>
          </select>
        </div>
        
        <button class="btn-icon btn-remove" @click="removeEnv(index)" title="删除">
          ✕
        </button>
      </div>
    </div>
    <button class="btn btn-add" @click="addEnv">
      <span>+ 添加环境变量</span>
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

const localEnvs = ref([])

// 解析 K8s env 格式到本地格式
function parseEnv(env) {
  const result = {
    name: env.name || '',
    type: 'value',
    value: '',
    configMapName: '',
    configMapKey: '',
    secretName: '',
    secretKey: '',
    fieldPath: 'metadata.name'
  }
  
  if (env.value !== undefined) {
    result.type = 'value'
    result.value = env.value
  } else if (env.valueFrom?.configMapKeyRef) {
    result.type = 'configMapKeyRef'
    result.configMapName = env.valueFrom.configMapKeyRef.name || ''
    result.configMapKey = env.valueFrom.configMapKeyRef.key || ''
  } else if (env.valueFrom?.secretKeyRef) {
    result.type = 'secretKeyRef'
    result.secretName = env.valueFrom.secretKeyRef.name || ''
    result.secretKey = env.valueFrom.secretKeyRef.key || ''
  } else if (env.valueFrom?.fieldRef) {
    result.type = 'fieldRef'
    result.fieldPath = env.valueFrom.fieldRef.fieldPath || 'metadata.name'
  }
  
  return result
}

// 转换回 K8s 格式
function toK8sFormat(env) {
  const result = { name: env.name }
  
  switch (env.type) {
    case 'value':
      result.value = env.value || ''
      break
    case 'configMapKeyRef':
      result.valueFrom = {
        configMapKeyRef: {
          name: env.configMapName,
          key: env.configMapKey
        }
      }
      break
    case 'secretKeyRef':
      result.valueFrom = {
        secretKeyRef: {
          name: env.secretName,
          key: env.secretKey
        }
      }
      break
    case 'fieldRef':
      result.valueFrom = {
        fieldRef: {
          fieldPath: env.fieldPath
        }
      }
      break
  }
  
  return result
}

watch(() => props.modelValue, (newVal) => {
  localEnvs.value = (newVal || []).map(parseEnv)
}, { immediate: true, deep: true })

function addEnv() {
  localEnvs.value.push({
    name: '',
    type: 'value',
    value: '',
    configMapName: '',
    configMapKey: '',
    secretName: '',
    secretKey: '',
    fieldPath: 'metadata.name'
  })
}

function removeEnv(index) {
  localEnvs.value.splice(index, 1)
  emitChange()
}

function onTypeChange(index) {
  // 清空相关字段
  const env = localEnvs.value[index]
  env.value = ''
  env.configMapName = ''
  env.configMapKey = ''
  env.secretName = ''
  env.secretKey = ''
  emitChange()
}

function emitChange() {
  const envs = localEnvs.value
    .filter(e => e.name)
    .map(toK8sFormat)
  emit('update:modelValue', envs)
}
</script>

<style scoped>
.env-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.env-row {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

.env-fields {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.env-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 80px;
}

.name-field {
  flex: 1;
}

.type-field {
  min-width: 100px;
}

.value-field {
  flex: 2;
}

.env-label {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 500;
}

.env-field .form-input,
.env-field .form-select {
  font-size: 13px;
  padding: 6px 8px;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.btn-remove {
  background: var(--gray-100);
  color: var(--gray-500);
}

.btn-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.btn-add {
  padding: 8px 12px;
  font-size: 13px;
  background: var(--gray-50);
  border: 1px dashed var(--gray-300);
  color: var(--gray-600);
  border-radius: 6px;
}

.btn-add:hover {
  background: var(--primary-50);
  border-color: var(--primary-300);
  color: var(--primary-600);
}
</style>
