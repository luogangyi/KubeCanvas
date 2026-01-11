<template>
  <div class="key-value-editor">
    <div 
      v-for="(item, index) in localItems" 
      :key="index" 
      class="key-value-row"
    >
      <input
        type="text"
        class="form-input key-input"
        placeholder="Key"
        v-model="item.key"
        @input="emitChange"
      />
      <span class="separator">:</span>
      <input
        type="text"
        class="form-input value-input"
        placeholder="Value"
        v-model="item.value"
        @input="emitChange"
      />
      <button class="btn-icon btn-remove" @click="removeItem(index)" title="删除">
        ✕
      </button>
    </div>
    <button class="btn btn-add" @click="addItem">
      <span>+ 添加</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const localItems = ref([])

// 将 Object 转为 Array
function objectToArray(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }))
}

// 将 Array 转为 Object
function arrayToObject(arr) {
  const obj = {}
  arr.forEach(item => {
    if (item.key && item.key.trim()) {
      obj[item.key.trim()] = item.value
    }
  })
  return obj
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  localItems.value = objectToArray(newVal)
}, { immediate: true, deep: true })

function addItem() {
  localItems.value.push({ key: '', value: '' })
}

function removeItem(index) {
  localItems.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  emit('update:modelValue', arrayToObject(localItems.value))
}
</script>

<style scoped>
.key-value-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.key-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-input {
  flex: 1;
  min-width: 80px;
}

.value-input {
  flex: 2;
  min-width: 100px;
}

.separator {
  color: var(--gray-400);
  font-weight: 600;
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
