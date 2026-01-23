<template>
  <div class="security-context-editor">
    <div class="form-row">
      <div class="form-group checkbox-group">
        <label class="form-label inline">
          <input 
            type="checkbox" 
            v-model="local.privileged"
            @change="emitChange"
          />
          特权模式 (Privileged)
        </label>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="form-label inline">
          <input 
            type="checkbox" 
            v-model="local.allowPrivilegeEscalation"
            @change="emitChange"
          />
          允许权限提升
        </label>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="form-label inline">
          <input 
            type="checkbox" 
            v-model="local.readOnlyRootFilesystem"
            @change="emitChange"
          />
          只读根文件系统
        </label>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">运行用户 (UID)</label>
        <input
          type="number"
          class="form-input"
          v-model.number="local.runAsUser"
          @input="emitChange"
          placeholder="例如: 1000"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">运行组 (GID)</label>
        <input
          type="number"
          class="form-input"
          v-model.number="local.runAsGroup"
          @input="emitChange"
          placeholder="例如: 3000"
        />
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Capabilities Add</label>
      <ListEditor 
        v-model="local.capabilities.add" 
        placeholder="NET_ADMIN"
        @update:modelValue="emitChange"
      />
    </div>
    
    <div class="form-group">
      <label class="form-label">Capabilities Drop</label>
      <ListEditor 
        v-model="local.capabilities.drop" 
        placeholder="ALL"
        @update:modelValue="emitChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ListEditor from './ListEditor.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const local = ref({
  privileged: false,
  allowPrivilegeEscalation: false, // Default is usually true in K8s, but we leave unchecked as undefined/default
  readOnlyRootFilesystem: false,
  runAsUser: null,
  runAsGroup: null,
  capabilities: {
    add: [],
    drop: []
  }
})

watch(() => props.modelValue, (newVal) => {
  local.value = {
    privileged: newVal?.privileged || false,
    allowPrivilegeEscalation: newVal?.allowPrivilegeEscalation || false,
    readOnlyRootFilesystem: newVal?.readOnlyRootFilesystem || false,
    runAsUser: newVal?.runAsUser,
    runAsGroup: newVal?.runAsGroup,
    capabilities: {
      add: newVal?.capabilities?.add || [],
      drop: newVal?.capabilities?.drop || []
    }
  }
}, { immediate: true, deep: true })

function emitChange() {
  const result = {}
  
  if (local.value.privileged) result.privileged = true
  if (local.value.allowPrivilegeEscalation) result.allowPrivilegeEscalation = true
  if (local.value.readOnlyRootFilesystem) result.readOnlyRootFilesystem = true
  
  if (local.value.runAsUser !== null && local.value.runAsUser !== '') {
    result.runAsUser = Number(local.value.runAsUser)
  }
  if (local.value.runAsGroup !== null && local.value.runAsGroup !== '') {
    result.runAsGroup = Number(local.value.runAsGroup)
  }
  
  const caps = {}
  if (local.value.capabilities.add.length > 0) caps.add = local.value.capabilities.add
  if (local.value.capabilities.drop.length > 0) caps.drop = local.value.capabilities.drop
  
  if (Object.keys(caps).length > 0) result.capabilities = caps
  
  emit('update:modelValue', Object.keys(result).length > 0 ? result : undefined)
}
</script>

<style scoped>
.security-context-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.checkbox-group {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.form-label.inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
  cursor: pointer;
}

.form-input {
  font-size: 13px;
  padding: 6px 8px;
}
</style>
