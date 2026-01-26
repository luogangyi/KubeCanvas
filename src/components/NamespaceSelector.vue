<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">选择工作命名空间</h3>
      </div>
      
      <div class="modal-body">
        <p class="text-sm text-gray-500 mb-4">
          请选择或创建一个命名空间，所有新建资源将默认归属于此命名空间。
        </p>

        <!-- 选项卡切换 -->
        <div class="tabs mb-4">
          <button 
            :class="['tab-btn', activeTab === 'select' ? 'active' : '']"
            @click="activeTab = 'select'"
          >
            选择现有
          </button>
          <button 
            :class="['tab-btn', activeTab === 'create' ? 'active' : '']"
            @click="activeTab = 'create'"
          >
            创建新的
          </button>
        </div>

        <!-- 选择现有 -->
        <div v-if="activeTab === 'select'" class="tab-content">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="error" class="error-state">
            {{ error }}
            <button class="btn btn-sm btn-text" @click="fetchNamespaces">重试</button>
          </div>
          <div v-else class="namespace-list">
            <label 
              v-for="ns in namespaces" 
              :key="ns" 
              class="namespace-item"
              :class="{ selected: selectedNamespace === ns }"
            >
              <input 
                type="radio" 
                name="namespace" 
                :value="ns" 
                v-model="selectedNamespace"
              >
              <span class="ns-name">{{ ns }}</span>
              <span v-if="ns === 'default'" class="badge">默认</span>
            </label>
          </div>
        </div>

        <!-- 创建新的 -->
        <div v-if="activeTab === 'create'" class="tab-content">
          <div class="form-group">
            <label class="form-label">命名空间名称</label>
            <input 
              type="text" 
              v-model="newNamespaceName" 
              class="form-input"
              placeholder="例如: my-project"
              @keyup.enter="handleCreate"
            >
            <p class="form-hint">只能包含小写字母、数字和连字符(-)</p>
          </div>
          <div v-if="createError" class="error-message">
            {{ createError }}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="btn btn-primary btn-block" 
          @click="handleConfirm"
          :disabled="isConfirmDisabled"
        >
          {{ confirmButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useK8sApi } from '../composables/useK8sApi'
import { createNamespaceTemplate } from '../utils/resourceTemplates'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const { listNamespaces, createResource } = useK8sApi()

const activeTab = ref('select')
const namespaces = ref([])
const loading = ref(false)
const error = ref(null)
const selectedNamespace = ref('default')

const newNamespaceName = ref('')
const creating = ref(false)
const createError = ref(null)

const isConfirmDisabled = computed(() => {
  if (activeTab.value === 'select') {
    return !selectedNamespace.value || loading.value
  } else {
    return !newNamespaceName.value || creating.value
  }
})

const confirmButtonText = computed(() => {
  if (activeTab.value === 'create') {
    return creating.value ? '创建中...' : '创建并选择'
  }
  return '确认选择'
})

// 获取命名空间列表
async function fetchNamespaces() {
  loading.value = true
  error.value = null
  try {
    const list = await listNamespaces()
    namespaces.value = list.sort()
    // 如果列表里有 default，默认选中它；否则选中第一个
    if (list.includes('default')) {
      selectedNamespace.value = 'default'
    } else if (list.length > 0) {
      selectedNamespace.value = list[0]
    }
  } catch (err) {
    error.value = '无法获取命名空间列表，请检查集群连接。'
    console.error(err)
  } finally {
    loading.value = false
  }
}

// 创建新命名空间
async function handleCreate() {
  if (!newNamespaceName.value) return
  
  // 简单验证
  const nameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
  if (!nameRegex.test(newNamespaceName.value)) {
    createError.value = '名称格式无效：只能包含小写字母、数字和连字符，且首尾必须是字母或数字'
    return
  }

  creating.value = true
  createError.value = null
  
  try {
    const nsTemplate = createNamespaceTemplate(newNamespaceName.value)
    await createResource(nsTemplate)
    // 创建成功，直接触发选择
    emit('select', newNamespaceName.value)
  } catch (err) {
    createError.value = `创建失败: ${err.response?.data?.message || err.message}`
  } finally {
    creating.value = false
  }
}

async function handleConfirm() {
  if (activeTab.value === 'select') {
    emit('select', selectedNamespace.value)
  } else {
    await handleCreate()
  }
}

// 当弹窗显示时加载列表
watch(() => props.visible, (newVal) => {
  if (newVal) {
    fetchNamespaces()
    activeTab.value = 'select'
    newNamespaceName.value = ''
    createError.value = null
  }
}, { immediate: true }) // 立即执行，处理组件挂载时 visible 就是 true 的情况
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75); /* 更深的遮罩，强调必须选择 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 480px;
  max-width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  text-align: center;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.namespace-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
}

.namespace-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid transparent;
}

.namespace-item:hover {
  background-color: #f3f4f6;
}

.namespace-item.selected {
  background-color: #eff6ff;
  border-color: #bfdbfe;
}

.namespace-item input {
  margin-right: 10px;
}

.ns-name {
  font-weight: 500;
  color: #374151;
  flex: 1;
}

.badge {
  background-color: #dbeafe;
  color: #1e40af;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.loading-state, .error-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-weight: 500;
  margin-bottom: 6px;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-hint {
  margin-top: 6px;
  font-size: 0.875rem;
  color: #6b7280;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 8px;
  padding: 8px;
  background-color: #fef2f2;
  border-radius: 4px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.btn-block {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
}

.btn-text {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
}
</style>
