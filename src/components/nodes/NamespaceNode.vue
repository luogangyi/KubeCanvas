<template>
  <div
    class="namespace-node"
    :class="{ selected: props.selected }"
    :style="containerStyle"
  >
    <!-- 4个连接点 -->
    <Handle id="top" type="target" :position="Position.Top" />
    <Handle id="bottom" type="source" :position="Position.Bottom" />
    <Handle id="left" type="target" :position="Position.Left" />
    <Handle id="right" type="source" :position="Position.Right" />
    
    <!-- 标题栏 -->
    <div class="namespace-node__header">
      <div class="namespace-node__icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/>
        </svg>
      </div>
      <div class="namespace-node__title">
        <div class="namespace-node__type">Namespace</div>
        <div class="namespace-node__name">{{ props.data.name }}</div>
      </div>
      <span class="namespace-node__tooltip">双击选中</span>
    </div>
    
    <!-- 容器区域 - 可以放置其他资源 -->
    <div class="namespace-node__body">
      <div class="namespace-node__hint">
        拖拽资源到此区域
      </div>
    </div>
    
    <!-- 调整大小手柄 -->
    <div class="resize-handle resize-handle--se" @mousedown="startResize($event, 'se')"></div>
    <div class="resize-handle resize-handle--sw" @mousedown="startResize($event, 'sw')"></div>
    <div class="resize-handle resize-handle--ne" @mousedown="startResize($event, 'ne')"></div>
    <div class="resize-handle resize-handle--nw" @mousedown="startResize($event, 'nw')"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  type: {
    type: String,
    default: 'namespace'
  },
  data: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

// 默认大小（较大以便放置多个资源）
const width = ref(props.data.width || 600)
const height = ref(props.data.height || 450)

const containerStyle = computed(() => ({
  width: `${width.value}px`,
  height: `${height.value}px`
}))

// 调整大小逻辑
let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0
let resizeDirection = ''

function startResize(event, direction) {
  event.stopPropagation()
  event.preventDefault()
  
  resizeDirection = direction
  startX = event.clientX
  startY = event.clientY
  startWidth = width.value
  startHeight = height.value
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(event) {
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  
  const minWidth = 200
  const minHeight = 150
  
  if (resizeDirection.includes('e')) {
    width.value = Math.max(minWidth, startWidth + dx)
  }
  if (resizeDirection.includes('w')) {
    width.value = Math.max(minWidth, startWidth - dx)
  }
  if (resizeDirection.includes('s')) {
    height.value = Math.max(minHeight, startHeight + dy)
  }
  if (resizeDirection.includes('n')) {
    height.value = Math.max(minHeight, startHeight - dy)
  }
  
  // 更新节点数据
  if (props.data) {
    props.data.width = width.value
    props.data.height = height.value
  }
}

function stopResize() {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.namespace-node {
  background: linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, rgba(55, 65, 81, 0.2) 100%);
  border: 2px dashed rgba(107, 114, 128, 0.6);
  border-radius: 12px;
  position: relative;
  min-width: 200px;
  min-height: 150px;
  transition: border-color 0.2s, box-shadow 0.2s;
  /* 允许整个节点响应鼠标事件（选中、右键等） */
  pointer-events: auto;
}

.namespace-node:hover {
  border-color: rgba(107, 114, 128, 0.9);
}

.namespace-node.selected {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-glow), var(--glow-md);
}

/* 标题栏 */
.namespace-node__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(107, 114, 128, 0.3);
  border-radius: 10px 10px 0 0;
  border-bottom: 1px solid rgba(107, 114, 128, 0.3);
  position: relative;
  cursor: pointer;
  pointer-events: auto; /* 允许标题栏可点击 */
}

/* 自定义 Tooltip */
.namespace-node__tooltip {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 11px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s, visibility 0.15s;
  pointer-events: none;
}

.namespace-node__header:hover .namespace-node__tooltip {
  opacity: 1;
  visibility: visible;
}

.namespace-node__icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.namespace-node__icon svg {
  width: 24px;
  height: 24px;
}

.namespace-node__title {
  flex: 1;
}

.namespace-node__type {
  font-size: 10px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.namespace-node__name {
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
}

/* 容器区域 - 允许点击穿透到内部的其他组件 */
.namespace-node__body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 100px;
  pointer-events: none; /* 允许点击穿透到内部组件 */
}

.namespace-node__hint {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  pointer-events: none;
}

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: rgba(107, 114, 128, 0.5);
  border: 2px solid #6b7280;
  border-radius: 3px;
  cursor: nwse-resize;
  z-index: 10;
  pointer-events: auto; /* 允许拖拽手柄可点击 */
}

.resize-handle:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.resize-handle--se {
  bottom: -6px;
  right: -6px;
  cursor: nwse-resize;
}

.resize-handle--sw {
  bottom: -6px;
  left: -6px;
  cursor: nesw-resize;
}

.resize-handle--ne {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

.resize-handle--nw {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

/* 连接点样式 */
:deep(.vue-flow__handle) {
  width: 14px;
  height: 14px;
  background: #6b7280;
  border: 2px solid var(--bg-secondary);
  pointer-events: auto; /* 允许连接点可点击 */
}

:deep(.vue-flow__handle:hover) {
  background: var(--accent-light);
  transform: scale(1.3);
}
</style>
