<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
      <div class="dialog-container">
        <div class="dialog-header">
          <h3 class="dialog-title">📋 资源组合库</h3>
          <button class="dialog-close" @click="handleClose">✕</button>
        </div>
        
        <div class="dialog-body">
          <!-- 搜索和排序 -->
          <div class="filters-bar">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="搜索组合名称..." 
                class="form-input search-input"
              />
            </div>
            
            <div class="sort-box">
              <span class="label">排序:</span>
              <select v-model="sortBy" class="form-select sort-select">
                <option value="updatedDesc">最近更新</option>
                <option value="updatedAsc">最早更新</option>
                <option value="nameAsc">名称 A-Z</option>
                <option value="countDesc">资源数量</option>
              </select>
            </div>
          </div>
          
          <!-- 组合列表 -->
          <div class="compositions-grid" v-if="filteredCompositions.length > 0">
            <div 
              v-for="comp in filteredCompositions" 
              :key="comp.id" 
              class="composition-card"
              @click="handleLoad(comp)"
            >
              <div class="card-header">
                <div class="card-icon">📋</div>
                <div class="card-info">
                  <div class="card-name">{{ comp.name }}</div>
                  <div class="card-meta">
                    {{ formatDate(comp.updatedAt) }}
                  </div>
                </div>
              </div>
              
              <div class="card-stats">
                <span class="stat-badge">
                  📦 {{ comp.resourceCount }} 个资源
                </span>
                <span v-if="comp.namespace" class="stat-badge outline">
                  🏷️ {{ comp.namespace }}
                </span>
              </div>
              
              <div class="card-actions">
                <button class="btn btn-sm btn-delete" @click.stop="handleDelete(comp)">
                  删除
                </button>
                <button class="btn btn-sm btn-load">
                  加载
                </button>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-text">
              {{ searchQuery ? '未找到匹配的组合' : '暂无保存的组合' }}
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <div class="footer-info">
            共 {{ filteredCompositions.length }} 个组合
          </div>
          <button class="btn btn-secondary" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  compositions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'load', 'delete'])

const searchQuery = ref('')
const sortBy = ref('updatedDesc')

// 格式化日期
function formatDate(isoString) {
  if (!isoString) return '未记录时间'
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 过滤和排序组合
const filteredCompositions = computed(() => {
  let result = [...props.compositions]
  
  // 过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.namespace && c.namespace.toLowerCase().includes(query))
    )
  }
  
  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'updatedDesc':
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      case 'updatedAsc':
        return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)
      case 'nameAsc':
        return a.name.localeCompare(b.name)
      case 'countDesc':
        return (b.resourceCount || 0) - (a.resourceCount || 0)
      default:
        return 0
    }
  })
  
  return result
})

function handleClose() {
  emit('close')
  searchQuery.value = '' // Reset search on close
}

function handleLoad(composition) {
  emit('load', composition.id)
  handleClose()
}

function handleDelete(composition) {
  if (confirm(`确定要删除组合 "${composition.name}" 吗？此操作将删除集群中的相关 ConfigMap。`)) {
    emit('delete', composition.id, composition.namespace)
  }
}
</script>

<style scoped>
/* Modal 基础样式 (复用 SaveDialog) */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(2px);
}

.dialog-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  width: 800px; /* 更宽 */
  max-width: 90vw;
  height: 80vh; /* 固定高度 */
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  animation: slideIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-default);
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 16px;
  transition: all var(--transition-fast);
}

.dialog-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.dialog-body {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-default);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-tertiary);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

/* 过滤器样式 */
.filters-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  position: relative;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 14px;
}

.search-input {
  padding-left: 32px;
  width: 100%;
}

.sort-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  width: 140px;
}

.label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 网格布局 */
.compositions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.composition-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.composition-card:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--glow-sm);
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.card-icon {
  font-size: 24px;
  background: var(--bg-secondary);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
}

.card-info {
  flex: 1;
  overflow: hidden;
}

.card-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.card-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: 10px;
  color: var(--text-secondary);
}

.stat-badge.outline {
  border: 1px solid var(--border-default);
  background: transparent;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.composition-card:hover .card-actions {
  opacity: 1;
}

.btn-sm {
  flex: 1;
  padding: 6px;
  font-size: 12px;
}

.btn-load {
  background: var(--accent-primary);
  color: white;
  border: none;
}

.btn-load:hover {
  background: var(--accent-light);
}

.btn-delete {
  background: var(--bg-secondary);
  color: var(--text-muted);
  border: 1px solid var(--border-default);
}

.btn-delete:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted);
  gap: 16px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
}

/* 通用样式 */
.form-input, .form-select {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn-secondary {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.footer-info {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
