<template>
  <div class="volume-mount-editor">
    <div 
      v-for="(mount, index) in localMounts" 
      :key="index" 
      class="mount-row"
    >
      <div class="mount-fields">
        <div class="mount-field">
          <label class="mount-label">Volume 名称</label>
          <select 
            class="form-select" 
            v-model="mount.name" 
            @change="emitChange"
          >
            <option value="">选择 Volume</option>
            <option v-for="v in volumes" :key="v.name" :value="v.name">
              {{ v.name }}
            </option>
          </select>
        </div>
        <div class="mount-field mount-path">
          <label class="mount-label">挂载路径</label>
          <input
            type="text"
            class="form-input"
            placeholder="/data"
            v-model="mount.mountPath"
            @input="emitChange"
          />
        </div>
        <div class="mount-field">
          <label class="mount-label">SubPath</label>
          <input
            type="text"
            class="form-input"
            placeholder="可选"
            v-model="mount.subPath"
            @input="emitChange"
          />
        </div>
        <div class="mount-field mount-readonly">
          <label class="mount-label">只读</label>
          <input
            type="checkbox"
            v-model="mount.readOnly"
            @change="emitChange"
          />
        </div>
        <button class="btn-icon btn-remove" @click="removeMount(index)" title="删除">
          ✕
        </button>
      </div>
    </div>
    <button class="btn btn-add" @click="addMount">
      <span>+ 添加挂载</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  volumes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const localMounts = ref([])

watch(() => props.modelValue, (newVal) => {
  localMounts.value = (newVal || []).map(m => ({
    name: m.name || '',
    mountPath: m.mountPath || '',
    subPath: m.subPath || '',
    readOnly: m.readOnly || false
  }))
}, { immediate: true, deep: true })

function addMount() {
  localMounts.value.push({
    name: '',
    mountPath: '',
    subPath: '',
    readOnly: false
  })
}

function removeMount(index) {
  localMounts.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  // 编辑时不过滤，保留所有挂载让用户填写
  // 验证应在最终保存到 K8s 时进行
  const mounts = localMounts.value.map(m => {
    const result = {
      name: m.name || '',
      mountPath: m.mountPath || ''
    }
    if (m.subPath) result.subPath = m.subPath
    if (m.readOnly) result.readOnly = true
    return result
  })
  emit('update:modelValue', mounts)
}
</script>

<style scoped>
.volume-mount-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mount-row {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

.mount-fields {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.mount-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 80px;
}

.mount-path {
  flex: 1;
}

.mount-readonly {
  min-width: 40px;
  align-items: center;
}

.mount-readonly input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-top: 4px;
}

.mount-label {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 500;
}

.mount-field .form-input,
.mount-field .form-select {
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
