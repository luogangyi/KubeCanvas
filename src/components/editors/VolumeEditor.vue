<template>
  <div class="volume-editor">
    <div 
      v-for="(volume, index) in localVolumes" 
      :key="index" 
      class="volume-row"
    >
      <div class="volume-header">
        <div class="volume-name-field">
          <label class="volume-label">名称</label>
          <input
            type="text"
            class="form-input"
            placeholder="my-volume"
            v-model="volume.name"
            @input="emitChange"
          />
        </div>
        <div class="volume-type-field">
          <label class="volume-label">类型</label>
          <select class="form-select" v-model="volume.type" @change="onTypeChange(index)">
            <option value="emptyDir">Empty Dir</option>
            <option value="configMap">ConfigMap</option>
            <option value="secret">Secret</option>
            <option value="persistentVolumeClaim">PVC</option>
            <option value="hostPath">Host Path</option>
          </select>
        </div>
        <button class="btn-icon btn-remove" @click="removeVolume(index)" title="删除">
          ✕
        </button>
      </div>
      
      <!-- 类型特定配置 -->
      <div class="volume-config">
        <!-- Empty Dir -->
        <div v-if="volume.type === 'emptyDir'" class="config-hint">
          临时存储，Pod 删除时数据丢失
        </div>
        
        <!-- ConfigMap -->
        <div v-else-if="volume.type === 'configMap'" class="config-fields">
          <div class="config-field">
            <label class="config-label">ConfigMap 名称</label>
            <input
              type="text"
              class="form-input"
              placeholder="my-configmap"
              v-model="volume.configMap.name"
              @input="emitChange"
            />
          </div>
        </div>
        
        <!-- Secret -->
        <div v-else-if="volume.type === 'secret'" class="config-fields">
          <div class="config-field">
            <label class="config-label">Secret 名称</label>
            <input
              type="text"
              class="form-input"
              placeholder="my-secret"
              v-model="volume.secret.secretName"
              @input="emitChange"
            />
          </div>
        </div>
        
        <!-- PVC -->
        <div v-else-if="volume.type === 'persistentVolumeClaim'" class="config-fields">
          <div class="config-field">
            <label class="config-label">PVC 名称</label>
            <input
              type="text"
              class="form-input"
              placeholder="my-pvc"
              v-model="volume.persistentVolumeClaim.claimName"
              @input="emitChange"
            />
          </div>
        </div>
        
        <!-- Host Path -->
        <div v-else-if="volume.type === 'hostPath'" class="config-fields">
          <div class="config-field">
            <label class="config-label">主机路径</label>
            <input
              type="text"
              class="form-input"
              placeholder="/data"
              v-model="volume.hostPath.path"
              @input="emitChange"
            />
          </div>
          <div class="config-field">
            <label class="config-label">类型</label>
            <select class="form-select" v-model="volume.hostPath.type" @change="emitChange">
              <option value="">Default</option>
              <option value="DirectoryOrCreate">DirectoryOrCreate</option>
              <option value="Directory">Directory</option>
              <option value="FileOrCreate">FileOrCreate</option>
              <option value="File">File</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <button class="btn btn-add" @click="addVolume">
      <span>+ 添加 Volume</span>
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

const defaultVolume = () => ({
  name: '',
  type: 'emptyDir',
  emptyDir: {},
  configMap: { name: '' },
  secret: { secretName: '' },
  persistentVolumeClaim: { claimName: '' },
  hostPath: { path: '', type: '' }
})

const localVolumes = ref([])

// 解析 K8s volume 格式
function parseVolume(v) {
  const result = defaultVolume()
  result.name = v.name || ''
  
  if (v.emptyDir !== undefined) {
    result.type = 'emptyDir'
  } else if (v.configMap) {
    result.type = 'configMap'
    result.configMap.name = v.configMap.name || ''
  } else if (v.secret) {
    result.type = 'secret'
    result.secret.secretName = v.secret.secretName || ''
  } else if (v.persistentVolumeClaim) {
    result.type = 'persistentVolumeClaim'
    result.persistentVolumeClaim.claimName = v.persistentVolumeClaim.claimName || ''
  } else if (v.hostPath) {
    result.type = 'hostPath'
    result.hostPath.path = v.hostPath.path || ''
    result.hostPath.type = v.hostPath.type || ''
  }
  
  return result
}

// 转换回 K8s 格式
function toK8sFormat(v) {
  const result = { name: v.name }
  
  switch (v.type) {
    case 'emptyDir':
      result.emptyDir = {}
      break
    case 'configMap':
      result.configMap = { name: v.configMap.name }
      break
    case 'secret':
      result.secret = { secretName: v.secret.secretName }
      break
    case 'persistentVolumeClaim':
      result.persistentVolumeClaim = { claimName: v.persistentVolumeClaim.claimName }
      break
    case 'hostPath':
      result.hostPath = { path: v.hostPath.path }
      if (v.hostPath.type) result.hostPath.type = v.hostPath.type
      break
  }
  
  return result
}

watch(() => props.modelValue, (newVal) => {
  localVolumes.value = (newVal || []).map(parseVolume)
}, { immediate: true, deep: true })

function addVolume() {
  localVolumes.value.push(defaultVolume())
}

function removeVolume(index) {
  localVolumes.value.splice(index, 1)
  emitChange()
}

function onTypeChange(index) {
  emitChange()
}

function emitChange() {
  const volumes = localVolumes.value
    .filter(v => v.name)
    .map(toK8sFormat)
  emit('update:modelValue', volumes)
}
</script>

<style scoped>
.volume-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.volume-row {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

.volume-header {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}

.volume-name-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.volume-type-field {
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.volume-label {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 500;
}

.volume-config {
  padding-top: 8px;
  border-top: 1px solid var(--gray-200);
}

.config-hint {
  font-size: 12px;
  color: var(--gray-500);
  font-style: italic;
}

.config-fields {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.config-field {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-label {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 500;
}

.volume-header .form-input,
.volume-header .form-select,
.config-field .form-input,
.config-field .form-select {
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
