<template>
  <div class="port-editor">
    <div 
      v-for="(port, index) in localPorts" 
      :key="index" 
      class="port-row"
    >
      <div class="port-fields">
        <div class="port-field">
          <label class="port-label">名称</label>
          <input
            type="text"
            class="form-input"
            placeholder="http"
            v-model="port.name"
            @input="emitChange"
          />
        </div>
        <div class="port-field">
          <label class="port-label">端口</label>
          <input
            type="number"
            class="form-input"
            placeholder="80"
            min="1"
            max="65535"
            v-model.number="port.containerPort"
            @input="emitChange"
          />
        </div>
        <div class="port-field">
          <label class="port-label">协议</label>
          <select class="form-select" v-model="port.protocol" @change="emitChange">
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="SCTP">SCTP</option>
          </select>
        </div>
        <button class="btn-icon btn-remove" @click="removePort(index)" title="删除">
          ✕
        </button>
      </div>
    </div>
    <button class="btn btn-add" @click="addPort">
      <span>+ 添加端口</span>
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

const localPorts = ref([])

watch(() => props.modelValue, (newVal) => {
  localPorts.value = (newVal || []).map(p => ({
    name: p.name || '',
    containerPort: p.containerPort || 80,
    protocol: p.protocol || 'TCP'
  }))
}, { immediate: true, deep: true })

function addPort() {
  localPorts.value.push({
    name: '',
    containerPort: 80,
    protocol: 'TCP'
  })
  emitChange()
}

function removePort(index) {
  localPorts.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  const ports = localPorts.value
    .filter(p => p.containerPort)
    .map(p => ({
      ...(p.name && { name: p.name }),
      containerPort: p.containerPort,
      protocol: p.protocol || 'TCP'
    }))
  emit('update:modelValue', ports)
}
</script>

<style scoped>
.port-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.port-row {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

.port-fields {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.port-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 60px;
}

.port-label {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 500;
}

.port-field .form-input,
.port-field .form-select {
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
