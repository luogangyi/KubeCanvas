<template>
  <div class="list-editor">
    <div 
      v-for="(item, index) in localItems" 
      :key="index" 
      class="list-item"
    >
      <input
        type="text"
        class="form-input"
        :placeholder="placeholder"
        v-model="localItems[index]"
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
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '输入值'
  }
})

const emit = defineEmits(['update:modelValue'])

const localItems = ref([])

watch(() => props.modelValue, (newVal) => {
  localItems.value = [...(newVal || [])]
}, { immediate: true, deep: true })

function addItem() {
  localItems.value.push('')
}

function removeItem(index) {
  localItems.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  emit('update:modelValue', localItems.value.filter(item => item.trim()))
}
</script>

<style scoped>
.list-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-item .form-input {
  flex: 1;
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
