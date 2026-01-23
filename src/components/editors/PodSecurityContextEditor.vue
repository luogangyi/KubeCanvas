<template>
  <div class="pod-security-context-editor">
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
      
      <div class="form-group">
        <label class="form-label">FS Group</label>
        <input
          type="number"
          class="form-input"
          v-model.number="local.fsGroup"
          @input="emitChange"
          placeholder="例如: 2000"
        />
      </div>
    </div>
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
  runAsUser: null,
  runAsGroup: null,
  fsGroup: null
})

watch(() => props.modelValue, (newVal) => {
  local.value = {
    runAsUser: newVal?.runAsUser,
    runAsGroup: newVal?.runAsGroup,
    fsGroup: newVal?.fsGroup
  }
}, { immediate: true, deep: true })

function emitChange() {
  const result = {}
  
  if (local.value.runAsUser !== null && local.value.runAsUser !== '') {
    result.runAsUser = Number(local.value.runAsUser)
  }
  if (local.value.runAsGroup !== null && local.value.runAsGroup !== '') {
    result.runAsGroup = Number(local.value.runAsGroup)
  }
  if (local.value.fsGroup !== null && local.value.fsGroup !== '') {
    result.fsGroup = Number(local.value.fsGroup)
  }
  
  emit('update:modelValue', Object.keys(result).length > 0 ? result : undefined)
}
</script>

<style scoped>
.pod-security-context-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.form-group {
  flex: 1;
  min-width: 120px;
}

.form-input {
  font-size: 13px;
  padding: 6px 8px;
}
</style>
