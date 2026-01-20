<template>
  <div class="match-expressions-editor">
    <div 
      v-for="(expr, index) in localExpressions" 
      :key="index" 
      class="expression-row"
    >
      <input
        type="text"
        class="form-input key-input"
        placeholder="key"
        v-model="expr.key"
        @input="emitChange"
      />
      <select class="form-select operator-select" v-model="expr.operator" @change="emitChange">
        <option value="In">In</option>
        <option value="NotIn">NotIn</option>
        <option value="Exists">Exists</option>
        <option value="DoesNotExist">DoesNotExist</option>
        <option value="Gt">Gt</option>
        <option value="Lt">Lt</option>
      </select>
      <input
        v-if="['In', 'NotIn', 'Gt', 'Lt'].includes(expr.operator)"
        type="text"
        class="form-input values-input"
        placeholder="values (逗号分隔)"
        v-model="expr.valuesText"
        @input="emitChange"
      />
      <button class="btn-icon btn-remove" @click="removeExpression(index)">✕</button>
    </div>
    
    <button class="btn btn-add-expr" @click="addExpression">+ 添加条件</button>
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

const localExpressions = ref([])

watch(() => props.modelValue, (newVal) => {
  localExpressions.value = (newVal || []).map(e => ({
    key: e.key || '',
    operator: e.operator || 'In',
    valuesText: (e.values || []).join(', ')
  }))
}, { immediate: true, deep: true })

function addExpression() {
  localExpressions.value.push({
    key: '',
    operator: 'In',
    valuesText: ''
  })
}

function removeExpression(index) {
  localExpressions.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  const expressions = localExpressions.value
    .filter(e => e.key)
    .map(e => {
      const result = {
        key: e.key,
        operator: e.operator
      }
      if (['In', 'NotIn', 'Gt', 'Lt'].includes(e.operator)) {
        result.values = e.valuesText
          .split(',')
          .map(v => v.trim())
          .filter(v => v)
      }
      return result
    })
  emit('update:modelValue', expressions)
}
</script>

<style scoped>
.match-expressions-editor {
  padding: 8px;
}

.expression-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  align-items: center;
}

.form-input,
.form-select {
  padding: 5px 6px;
  font-size: 11px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.key-input {
  width: 120px;
}

.operator-select {
  width: 90px;
}

.values-input {
  flex: 1;
  min-width: 100px;
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
  flex-shrink: 0;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: var(--danger);
  color: var(--danger);
}

.btn-add-expr {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 500;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-default);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-add-expr:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-primary);
  color: var(--accent-light);
}
</style>
