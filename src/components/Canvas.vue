<template>
  <div
    class="canvas-container"
    :class="{ 'connecting': isConnecting }"
    @drop="onDrop"
    @dragover.prevent
    @dragenter.prevent
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @click="hideContextMenu"
    @contextmenu.prevent="onRightClick"
    @keydown="onKeyDown"
    tabindex="0"
  >
    <!-- 连线画笔工具 -->
    <div 
      class="connector-brush"
      draggable="false"
      @click="activateBrush"
      :class="{ 'active': isConnecting }"
      @mouseenter="showBrushTooltip = true"
      @mouseleave="showBrushTooltip = false"
    >
      <!-- 铅笔图标 -->
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    </div>
    
    <!-- 画笔 Tooltip -->
    <div v-if="showBrushTooltip && !isConnecting" class="brush-tooltip">
      点击激活，然后点击节点连线
    </div>
    
    <!-- 连线提示 -->
    <div v-if="isConnecting" class="connection-status">
      <template v-if="connectionSource">
        🔗 已选中 <strong>{{ connectionSource.data.name }}</strong>，点击目标节点完成连线
        <span class="cancel-hint">(ESC 或右键取消)</span>
      </template>
      <template v-else>
        ✏️ 点击一个节点作为起点
        <span class="cancel-hint">(ESC 或右键取消)</span>
      </template>
    </div>
    
    <!-- 临时连线 SVG - 只在画笔工具模式下显示，handle 拖拽模式由 Vue Flow 原生绘制 -->
    <svg v-if="isConnecting && connectionSource && mousePosition && !isHandleDrag" class="temp-connection-line">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
        </marker>
      </defs>
      <line
        :x1="sourcePosition.x"
        :y1="sourcePosition.y"
        :x2="mousePosition.x"
        :y2="mousePosition.y"
        stroke="#3b82f6"
        stroke-width="3"
        stroke-dasharray="8,4"
        marker-end="url(#arrowhead)"
      />
    </svg>
    
    <VueFlow
      ref="vueFlowRef"
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :default-edge-options="defaultEdgeOptions"
      :connect-on-click="false"
      :zoom-on-double-click="false"
      class="canvas"
      fit-view-on-init
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @connect="onConnect"
      @connect-start="onConnectStart"
      @connect-end="onConnectEnd"
      @node-click="onNodeClick"
      @node-double-click="onNodeDoubleClick"
      @node-drag-start="onNodeDragStart"
      @node-drag-stop="onNodeDragStop"
      @pane-click="onPaneClick"
    >
      <Background :gap="20" :size="1" />
      <Controls />
    </VueFlow>
    
    <!-- 右键上下文菜单 -->
    <div 
      v-if="contextMenu.visible" 
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div v-if="contextMenu.type === 'node'" class="context-menu-item" @click="deleteContextNode">
        🗑️ 删除 {{ contextMenu.node?.data?.name || '节点' }}
      </div>
      <div v-if="contextMenu.type === 'edge'" class="context-menu-item" @click="deleteContextEdge">
        🗑️ 删除连线
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, markRaw, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { v4 as uuidv4 } from 'uuid'
import BaseNode from './nodes/BaseNode.vue'
import NamespaceNode from './nodes/NamespaceNode.vue'
import { createResourceTemplate, getResourceTypeConfig } from '../utils/resourceTemplates.js'
import { getDefaultNamespace } from '../composables/useK8sApi.js'
import { validateConnection } from '../utils/connectionRules.js'

const props = defineProps({
  compositionId: {
    type: String,
    default: ''
  },
  initialNodes: {
    type: Array,
    default: () => []
  },
  initialEdges: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['nodeSelect', 'nodesChange', 'edgesChange', 'connect', 'connectionError', 'deleteNode'])

const vueFlowRef = ref(null)
const { project, findNode, getNodes, getEdges, removeSelectedNodes, fitView } = useVueFlow()

// 连线状态
const isConnecting = ref(false)
const connectionSource = ref(null)
const mousePosition = ref(null)
const isHandleDrag = ref(false) // 是否从 handle 拖拽开始
const connectionCreated = ref(false) // 防止重复创建连线
const sourceHandleId = ref(null) // 源连接点 ID
const hoveredHandleId = ref(null) // 悬停的目标连接点 ID
const showBrushTooltip = ref(false) // 画笔 tooltip 显示状态

// 右键上下文菜单状态
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: null, // 'node' | 'edge'
  node: null,
  edge: null
})

// 源节点位置（用于绘制临时连线）
const sourcePosition = computed(() => {
  if (!connectionSource.value) return { x: 0, y: 0 }
  const node = connectionSource.value
  const nodeEl = document.querySelector(`[data-id="${node.id}"]`)
  if (nodeEl) {
    const rect = nodeEl.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }
  return { x: 0, y: 0 }
})

// 节点类型映射
const nodeTypes = {
  deployment: markRaw(BaseNode),
  daemonset: markRaw(BaseNode),
  statefulset: markRaw(BaseNode),
  service: markRaw(BaseNode),
  pod: markRaw(BaseNode),
  ingress: markRaw(BaseNode),
  configmap: markRaw(BaseNode),
  secret: markRaw(BaseNode),
  pvc: markRaw(BaseNode),
  job: markRaw(BaseNode),
  cronjob: markRaw(BaseNode),
  namespace: markRaw(NamespaceNode)
}

// 默认边选项 - 实线
const defaultEdgeOptions = {
  animated: false,
  style: {
    strokeWidth: 2,
    stroke: '#3b82f6'
  }
}

// 节点和边
const nodes = ref([])
const edges = ref([])

// 监听初始数据 - 加载已保存的组合时使用
watch([() => props.initialNodes, () => props.initialEdges], ([newNodes, newEdges]) => {
  // 只有当新数据不为空时才更新（避免初始化时清空）
  if (newNodes && newNodes.length > 0) {
    // 先清空旧数据，再加载新数据
    edges.value = [] // 必须先清空边，避免引用旧节点 ID
    // 使用深拷贝避免响应式问题
    nodes.value = JSON.parse(JSON.stringify(newNodes))
    console.log('Loaded nodes:', nodes.value.length)
    
    // 边在节点之后加载
    if (newEdges && newEdges.length >= 0) {
      edges.value = JSON.parse(JSON.stringify(newEdges))
      console.log('Loaded edges:', edges.value.length)
    }
    
    // 延迟一帧后重置视口到画布起点
    nextTick(() => {
      if (vueFlowRef.value) {
        // 等待 Vue Flow 内部渲染完成后，再调整视口位置
        setTimeout(() => {
          if (vueFlowRef.value) {
            // 直接使用 fitView 然后立即偏移
            vueFlowRef.value.fitView({ padding: 0.15 })
            
            // 获取当前视口并向左偏移
            const viewport = vueFlowRef.value.getViewport()
            vueFlowRef.value.setViewport({
              x: viewport.x + 200,
              y: viewport.y,
              zoom: viewport.zoom
            })
          }
        }, 500) // 延迟更长时间确保渲染完成
      }
    })
  }
}, { deep: true })

// 取消连线操作
function cancelConnection() {
  isConnecting.value = false
  connectionSource.value = null
  mousePosition.value = null
  isHandleDrag.value = false
  connectionCreated.value = false
  sourceHandleId.value = null
  hoveredHandleId.value = null
}

// ESC 键取消
function onKeyDown(event) {
  if (event.key === 'Escape' && isConnecting.value) {
    cancelConnection()
  }
}

// 右键菜单
function onRightClick(event) {
  // 如果正在连线，取消连线
  if (isConnecting.value) {
    cancelConnection()
    return
  }
  
  // 隐藏之前的菜单
  hideContextMenu()
  
  // 检查是否点击在节点上
  const target = event.target
  const nodeEl = target.closest('.vue-flow__node')
  if (nodeEl) {
    const nodeId = nodeEl.getAttribute('data-id')
    const node = findNode(nodeId)
    if (node) {
      contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        type: 'node',
        node: node,
        edge: null
      }
      return
    }
  }
  
  // 检查是否点击在边上
  const edgeEl = target.closest('.vue-flow__edge')
  if (edgeEl) {
    const edgeId = edgeEl.getAttribute('data-id')
    const edge = edges.value.find(e => e.id === edgeId)
    if (edge) {
      contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        type: 'edge',
        node: null,
        edge: edge
      }
      return
    }
  }
}

// 隐藏上下文菜单
function hideContextMenu() {
  contextMenu.value = {
    visible: false,
    x: 0,
    y: 0,
    type: null,
    node: null,
    edge: null
  }
}

// 全局鼠标按下事件处理 - 点击任何地方时隐藏上下文菜单
function onDocumentMouseDown(event) {
  // 右键不处理（让 onRightClick 处理）
  if (event.button === 2) return
  // 如果点击的是上下文菜单本身，不隐藏
  if (event.target.closest('.context-menu')) return
  hideContextMenu()
}

// 删除上下文菜单中的节点
function deleteContextNode() {
  const node = contextMenu.value.node
  if (node) {
    emit('deleteNode', node)
  }
  hideContextMenu()
}

// 删除上下文菜单中的边
function deleteContextEdge() {
  const edge = contextMenu.value.edge
  if (edge) {
    // 触发边变化事件以清理关系
    const removeChange = { type: 'remove', id: edge.id }
    onEdgesChange([removeChange])
    
    // 从 edges 中移除
    edges.value = edges.value.filter(e => e.id !== edge.id)
  }
  hideContextMenu()
}

// 全局键盘监听
function handleGlobalKeyDown(event) {
  if (event.key === 'Escape' && isConnecting.value) {
    cancelConnection()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeyDown)
  // 添加全局鼠标按下监听 - 用于隐藏上下文菜单
  document.addEventListener('mousedown', onDocumentMouseDown)
  console.log('[Canvas] Event listeners registered')
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown)
  document.removeEventListener('mousedown', onDocumentMouseDown)
})

// 激活/关闭连线画笔模式
function activateBrush() {
  if (isConnecting.value) {
    // 已激活，则关闭
    cancelConnection()
  } else {
    // 激活画笔模式
    isConnecting.value = true
    connectionSource.value = null
    mousePosition.value = null
    isHandleDrag.value = false
  }
}

// 从 handle 开始连线（Vue Flow 原生事件）
function onConnectStart(event) {
  const { nodeId, handleId } = event
  const node = findNode(nodeId)
  if (node) {
    isConnecting.value = true
    connectionSource.value = node
    isHandleDrag.value = true
    sourceHandleId.value = handleId || null // 记录源 handle ID
    mousePosition.value = { x: event.event?.clientX || 0, y: event.event?.clientY || 0 }
  }
}

// handle 连线结束
function onConnectEnd(event) {
  // 如果已经通过 onConnect 创建了连线，直接取消即可
  if (connectionCreated.value) {
    cancelConnection()
    return
  }
  
  if (isHandleDrag.value && connectionSource.value) {
    // 检查是否落在某个节点上（支持整个节点区域）
    const mouseX = event.event?.clientX || event.clientX || 0
    const mouseY = event.event?.clientY || event.clientY || 0
    const targetNode = findNodeAtPosition(mouseX, mouseY)
    
    if (targetNode && targetNode.id !== connectionSource.value.id) {
      createConnection(connectionSource.value, targetNode)
    }
  }
  cancelConnection()
}

// 鼠标移动
function onMouseMove(event) {
  if (isConnecting.value) {
    mousePosition.value = { x: event.clientX, y: event.clientY }
    
    // 检测是否悬停在目标节点的 handle 上（只在有源节点时）
    if (connectionSource.value) {
      const handleInfo = findHandleAtPosition(event.clientX, event.clientY)
      if (handleInfo && handleInfo.nodeId !== connectionSource.value.id) {
        hoveredHandleId.value = handleInfo.handleId
      } else {
        hoveredHandleId.value = null
      }
    }
  }
}

// 根据鼠标位置找到节点 - 支持整个节点区域
// 优先选择非 Namespace 节点，避免容器遮挡内部组件
function findNodeAtPosition(x, y) {
  const nodeElements = document.querySelectorAll('.vue-flow__node')
  const matchedNodes = []
  
  for (const el of nodeElements) {
    const rect = el.getBoundingClientRect()
    // 扩大检测区域，更容易选中
    const padding = 10
    if (x >= rect.left - padding && 
        x <= rect.right + padding && 
        y >= rect.top - padding && 
        y <= rect.bottom + padding) {
      const nodeId = el.getAttribute('data-id')
      const node = findNode(nodeId)
      if (node) {
        matchedNodes.push({ node, area: rect.width * rect.height })
      }
    }
  }
  
  // 如果有多个匹配节点，优先选择非 Namespace 节点（面积较小的）
  if (matchedNodes.length > 1) {
    // 先按类型排序（非 namespace 优先），再按面积排序（小的优先）
    matchedNodes.sort((a, b) => {
      if (a.node.type === 'namespace' && b.node.type !== 'namespace') return 1
      if (a.node.type !== 'namespace' && b.node.type === 'namespace') return -1
      return a.area - b.area
    })
  }
  
  return matchedNodes.length > 0 ? matchedNodes[0].node : null
}

// 根据鼠标位置找到 handle
function findHandleAtPosition(x, y) {
  const handleElements = document.querySelectorAll('.vue-flow__handle')
  for (const el of handleElements) {
    const rect = el.getBoundingClientRect()
    // 扩大检测区域，更容易选中 handle
    const padding = 8
    if (x >= rect.left - padding && 
        x <= rect.right + padding && 
        y >= rect.top - padding && 
        y <= rect.bottom + padding) {
      // 获取 handle 的 ID 和所属节点 ID
      const handleId = el.getAttribute('data-handleid')
      const nodeElement = el.closest('.vue-flow__node')
      const nodeId = nodeElement?.getAttribute('data-id')
      if (handleId && nodeId) {
        return { handleId, nodeId }
      }
    }
  }
  return null
}

// 根据源节点和目标节点的相对位置计算最佳连接点
function calculateBestHandles(sourceNode, targetNode) {
  // 获取节点元素
  const sourceEl = document.querySelector(`[data-id="${sourceNode.id}"]`)
  const targetEl = document.querySelector(`[data-id="${targetNode.id}"]`)
  
  if (!sourceEl || !targetEl) {
    return { sourceHandle: 'bottom', targetHandle: 'top' }
  }
  
  const sourceRect = sourceEl.getBoundingClientRect()
  const targetRect = targetEl.getBoundingClientRect()
  
  // 计算两个节点中心点
  const sourceCenterX = sourceRect.left + sourceRect.width / 2
  const sourceCenterY = sourceRect.top + sourceRect.height / 2
  const targetCenterX = targetRect.left + targetRect.width / 2
  const targetCenterY = targetRect.top + targetRect.height / 2
  
  // 计算位移
  const dx = targetCenterX - sourceCenterX
  const dy = targetCenterY - sourceCenterY
  
  // 计算角度（弧度）
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  
  // 根据角度确定最佳连接点
  // angle: -180 到 180
  // -45 到 45: 右 -> 左
  // 45 到 135: 下 -> 上
  // 135 到 180 或 -180 到 -135: 左 -> 右
  // -135 到 -45: 上 -> 下
  
  let sourceHandle, targetHandle
  
  if (angle >= -45 && angle < 45) {
    // 目标在源的右边
    sourceHandle = 'right'
    targetHandle = 'left'
  } else if (angle >= 45 && angle < 135) {
    // 目标在源的下边
    sourceHandle = 'bottom'
    targetHandle = 'top'
  } else if (angle >= 135 || angle < -135) {
    // 目标在源的左边
    sourceHandle = 'left'
    targetHandle = 'right'
  } else {
    // 目标在源的上边 (angle >= -135 && angle < -45)
    sourceHandle = 'top'
    targetHandle = 'bottom'
  }
  
  return { sourceHandle, targetHandle }
}

// 鼠标释放
function onMouseUp(event) {
  if (isConnecting.value && !isHandleDrag.value) {
    // 连线画笔模式的处理
    const nodeUnderMouse = findNodeAtPosition(event.clientX, event.clientY)
    
    if (connectionSource.value && nodeUnderMouse && connectionSource.value.id !== nodeUnderMouse.id) {
      // 已有源节点，且释放在不同的目标节点上，创建连接
      createConnection(connectionSource.value, nodeUnderMouse)
    }
    // 无论是否成功创建连接，都结束画笔模式
    cancelConnection()
  }
}

// 拖放处理
function onDrop(event) {
  if (isConnecting.value) return // 连线模式下不处理拖放
  
  const resourceData = event.dataTransfer.getData('application/k8s-resource')
  if (!resourceData) return

  const resource = JSON.parse(resourceData)
  
  // 检查 Namespace 单一限制：画布上最多只能有一个 Namespace
  if (resource.type === 'namespace') {
    const existingNamespace = nodes.value.find(n => n.type === 'namespace')
    if (existingNamespace) {
      emit('connectionError', '画布上只能创建一个 Namespace 容器')
      return
    }
  }
  
  const { x, y } = project({ x: event.clientX - 280, y: event.clientY - 64 })
  
  const nodeId = uuidv4()
  const nodeName = `${resource.type}-${nodeId.slice(0, 4)}`
  
  // 使用配置中的默认命名空间
  const defaultNs = getDefaultNamespace()
  
  // 检查是否落在某个 Namespace 容器内
  const containingNamespace = findContainingNamespace(x, y)
  const targetNamespace = containingNamespace ? containingNamespace.data.name : defaultNs
  
  // 创建资源模板
  const resourceTemplate = createResourceTemplate(resource.type, nodeName, {
    namespace: resource.type === 'namespace' ? undefined : targetNamespace
  })
  
  if (resource.type === 'service') {
    resourceTemplate.spec.type = 'ClusterIP'
  }
  
  const newNode = {
    id: nodeId,
    type: resource.type,
    position: { x, y },
    // Namespace 放到底层（zIndex 较小），其他资源放到上层
    zIndex: resource.type === 'namespace' ? 6 : 10,
    data: {
      name: nodeName,
      resource: resourceTemplate,
      // Namespace 容器的默认大小
      ...(resource.type === 'namespace' ? { width: 600, height: 450 } : {})
    }
  }
  
  // Namespace 节点放到数组最前面（渲染在底层）
  if (resource.type === 'namespace') {
    nodes.value.unshift(newNode)
  } else {
    nodes.value.push(newNode)
  }
  emit('nodesChange', nodes.value)
}

// 检查坐标是否在某个 Namespace 容器内
function findContainingNamespace(x, y) {
  const namespaceNodes = nodes.value.filter(n => n.type === 'namespace')
  
  for (const ns of namespaceNodes) {
    const width = ns.data.width || 400
    const height = ns.data.height || 300
    
    if (x >= ns.position.x && x <= ns.position.x + width &&
        y >= ns.position.y && y <= ns.position.y + height) {
      return ns
    }
  }
  return null
}

// Namespace 拖拽开始时的状态
const namespaceDragState = ref({
  nodeId: null,
  startPosition: null,
  childNodes: [] // 拖拽开始时在 Namespace 内的节点
})

// 节点拖拽开始 - 记录 Namespace 位置和内部节点
function onNodeDragStart(event) {
  const { node } = event
  
  if (node.type === 'namespace') {
    // 记录 Namespace 的起始位置和内部节点
    const nsWidth = node.data.width || 600
    const nsHeight = node.data.height || 450
    
    const childNodes = nodes.value.filter(n => {
      if (n.type === 'namespace' || n.id === node.id) return false
      const centerX = n.position.x + 50
      const centerY = n.position.y + 30
      return centerX >= node.position.x && centerX <= node.position.x + nsWidth &&
             centerY >= node.position.y && centerY <= node.position.y + nsHeight
    })
    
    namespaceDragState.value = {
      nodeId: node.id,
      startPosition: { ...node.position },
      childNodes: childNodes.map(n => ({ id: n.id, offsetX: n.position.x - node.position.x, offsetY: n.position.y - node.position.y }))
    }
  }
}

// 节点拖拽结束 - 检查是否进入或离开 Namespace 容器
function onNodeDragStop(event) {
  const { node } = event
  
  // 如果是 Namespace 移动，更新内部节点位置
  if (node.type === 'namespace' && namespaceDragState.value.nodeId === node.id) {
    const dx = node.position.x - namespaceDragState.value.startPosition.x
    const dy = node.position.y - namespaceDragState.value.startPosition.y
    
    // 移动所有内部节点
    namespaceDragState.value.childNodes.forEach(child => {
      const childNode = nodes.value.find(n => n.id === child.id)
      if (childNode) {
        childNode.position.x = node.position.x + child.offsetX
        childNode.position.y = node.position.y + child.offsetY
      }
    })
    
    // 清空状态
    namespaceDragState.value = { nodeId: null, startPosition: null, childNodes: [] }
    // 取消 Namespace 的选中状态，以便内部组件可被选中
    removeSelectedNodes([node])
    emit('nodesChange', nodes.value)
    return
  }
  
  // 非 Namespace 节点：检查是否进入或离开 Namespace
  const defaultNs = getDefaultNamespace()
  const containingNamespace = findContainingNamespace(
    node.position.x + 50, // 使用节点中心点
    node.position.y + 30
  )
  
  const targetNamespace = containingNamespace ? containingNamespace.data.name : defaultNs
  
  // 更新资源的 namespace
  if (node.data.resource && node.data.resource.metadata) {
    node.data.resource.metadata.namespace = targetNamespace
  }
  
  emit('nodesChange', nodes.value)
}

// 创建连接 - 核心逻辑
function createConnection(sourceNode, targetNode, explicitSourceHandle = null, explicitTargetHandle = null) {
  if (!sourceNode || !targetNode) return
  
  // 自连接检查
  if (sourceNode.id === targetNode.id) {
    emit('connectionError', '不能连接到自己')
    return
  }
  
  // 验证连接合法性 (K8s 语义校验)
  const validation = validateConnection(sourceNode.type, targetNode.type, sourceNode.id, targetNode.id)
  if (!validation.valid) {
    emit('connectionError', validation.reason)
    return
  }
  
  // 确定连接点
  // 优先级：显式传入 > 用户悬停选择 > 用户拖拽源 > 自动计算
  let finalSourceHandle = explicitSourceHandle || sourceHandleId.value
  let finalTargetHandle = explicitTargetHandle || hoveredHandleId.value
  
  // 如果没有明确的连接点，则根据节点位置自动计算
  if (!finalSourceHandle || !finalTargetHandle) {
    const calculated = calculateBestHandles(sourceNode, targetNode)
    if (!finalSourceHandle) finalSourceHandle = calculated.sourceHandle
    if (!finalTargetHandle) finalTargetHandle = calculated.targetHandle
  }
  
  // 检查是否已存在相同连接（包括连接点）
  const existingEdge = edges.value.find(
    e => e.source === sourceNode.id && e.target === targetNode.id &&
         e.sourceHandle === finalSourceHandle && e.targetHandle === finalTargetHandle
  )
  if (existingEdge) return
  
  // 工作负载类型列表
  const workloadTypes = ['deployment', 'daemonset', 'statefulset', 'pod', 'job', 'cronjob']
  
  // 获取工作负载的 Pod Spec
  const getPodSpec = (resource) => {
    if (resource.kind === 'Pod') return resource.spec
    if (['Deployment', 'StatefulSet', 'DaemonSet', 'Job'].includes(resource.kind)) {
      if (!resource.spec.template) resource.spec.template = { metadata: { labels: {} }, spec: {} }
      if (!resource.spec.template.spec) resource.spec.template.spec = {}
      return resource.spec.template.spec
    }
    if (resource.kind === 'CronJob') {
      if (!resource.spec.jobTemplate) resource.spec.jobTemplate = { spec: { template: { metadata: { labels: {} }, spec: {} } } }
      if (!resource.spec.jobTemplate.spec) resource.spec.jobTemplate.spec = { template: { metadata: { labels: {} }, spec: {} } }
      if (!resource.spec.jobTemplate.spec.template) resource.spec.jobTemplate.spec.template = { metadata: { labels: {} }, spec: {} }
      if (!resource.spec.jobTemplate.spec.template.spec) resource.spec.jobTemplate.spec.template.spec = {}
      return resource.spec.jobTemplate.spec.template.spec
    }
    return null
  }
  
  // 如果是 Service ↔ Deployment/StatefulSet/DaemonSet/Pod 连接 (支持双向)
  const serviceWorkloadTypes = ['deployment', 'statefulset', 'daemonset', 'pod']
  let serviceNodeConn = null
  let workloadNodeConn = null
  
  if (sourceNode.type === 'service' && serviceWorkloadTypes.includes(targetNode.type)) {
    serviceNodeConn = sourceNode
    workloadNodeConn = targetNode
  } else if (serviceWorkloadTypes.includes(sourceNode.type) && targetNode.type === 'service') {
    serviceNodeConn = targetNode
    workloadNodeConn = sourceNode
  }
  
  if (serviceNodeConn && workloadNodeConn) {
    const targetAppLabel = workloadNodeConn.data.resource.metadata?.labels?.app ||
                          workloadNodeConn.data.resource.spec?.selector?.matchLabels?.app ||
                          workloadNodeConn.data.name
    
    if (serviceNodeConn.data.resource.spec) {
      serviceNodeConn.data.resource.spec.selector = {
        app: targetAppLabel
      }
    }
  }
  
  // 如果是 Ingress ↔ Service 连接 (支持双向)
  let ingressNode = null
  let serviceNode = null
  
  if (sourceNode.type === 'ingress' && targetNode.type === 'service') {
    ingressNode = sourceNode
    serviceNode = targetNode
  } else if (sourceNode.type === 'service' && targetNode.type === 'ingress') {
    ingressNode = targetNode
    serviceNode = sourceNode
  }
  
  if (ingressNode && serviceNode) {
    const serviceName = serviceNode.data.name
    const servicePort = serviceNode.data.resource.spec?.ports?.[0]?.port || 80
    
    // 确保 spec.rules 结构存在
    if (!ingressNode.data.resource.spec) {
      ingressNode.data.resource.spec = {}
    }
    if (!ingressNode.data.resource.spec.rules || ingressNode.data.resource.spec.rules.length === 0) {
      ingressNode.data.resource.spec.rules = [{ http: { paths: [] } }]
    }
    const rule = ingressNode.data.resource.spec.rules[0]
    if (!rule.http) {
      rule.http = { paths: [] }
    }
    if (!rule.http.paths || rule.http.paths.length === 0) {
      rule.http.paths = [{
        path: '/',
        pathType: 'Prefix',
        backend: { service: { name: '', port: { number: 80 } } }
      }]
    }
    const path = rule.http.paths[0]
    if (!path.backend) {
      path.backend = { service: { name: '', port: { number: 80 } } }
    }
    if (!path.backend.service) {
      path.backend.service = { name: '', port: { number: 80 } }
    }
    if (!path.backend.service.port) {
      path.backend.service.port = { number: 80 }
    }
    
    // 设置 Service 名称和端口
    path.backend.service.name = serviceName
    path.backend.service.port.number = servicePort
  }
  
  // 处理存储/配置资源连接（支持双向：PVC/ConfigMap/Secret ↔ 工作负载）
  const storageTypes = ['pvc', 'configmap', 'secret']
  
  // 确定哪个是存储资源，哪个是工作负载
  let storageNode = null
  let workloadNode = null
  
  if (storageTypes.includes(sourceNode.type) && workloadTypes.includes(targetNode.type)) {
    storageNode = sourceNode
    workloadNode = targetNode
  } else if (workloadTypes.includes(sourceNode.type) && storageTypes.includes(targetNode.type)) {
    storageNode = targetNode
    workloadNode = sourceNode
  }
  
  // 如果是存储资源与工作负载的连接
  if (storageNode && workloadNode) {
    const resource = workloadNode.data.resource
    const podSpec = getPodSpec(resource)
    
    if (podSpec) {
      // 根据存储类型处理
      if (storageNode.type === 'pvc') {
        const pvcName = storageNode.data.name
        const volumeName = `vol-${pvcName}`
        
        // 确保 volumes 数组存在
        if (!podSpec.volumes) podSpec.volumes = []
        
        // 检查是否已存在同名 volume
        if (!podSpec.volumes.find(v => v.name === volumeName)) {
          podSpec.volumes.push({
            name: volumeName,
            persistentVolumeClaim: { claimName: pvcName }
          })
        }
        
        // 添加 volumeMount
        if (podSpec.containers && podSpec.containers.length > 0) {
          if (!podSpec.containers[0].volumeMounts) podSpec.containers[0].volumeMounts = []
          if (!podSpec.containers[0].volumeMounts.find(m => m.name === volumeName)) {
            podSpec.containers[0].volumeMounts.push({
              name: volumeName,
              mountPath: `/mnt/${pvcName}`
            })
          }
        }
      }
      
      if (storageNode.type === 'configmap') {
        const configMapName = storageNode.data.name
        const volumeName = `cm-${configMapName}`
        
        if (!podSpec.volumes) podSpec.volumes = []
        
        if (!podSpec.volumes.find(v => v.name === volumeName)) {
          podSpec.volumes.push({
            name: volumeName,
            configMap: { name: configMapName }
          })
        }
        
        if (podSpec.containers && podSpec.containers.length > 0) {
          if (!podSpec.containers[0].volumeMounts) podSpec.containers[0].volumeMounts = []
          if (!podSpec.containers[0].volumeMounts.find(m => m.name === volumeName)) {
            podSpec.containers[0].volumeMounts.push({
              name: volumeName,
              mountPath: `/etc/config/${configMapName}`,
              readOnly: true
            })
          }
        }
      }
      
      if (storageNode.type === 'secret') {
        const secretName = storageNode.data.name
        const volumeName = `secret-${secretName}`
        
        if (!podSpec.volumes) podSpec.volumes = []
        
        if (!podSpec.volumes.find(v => v.name === volumeName)) {
          podSpec.volumes.push({
            name: volumeName,
            secret: { secretName: secretName }
          })
        }
        
        if (podSpec.containers && podSpec.containers.length > 0) {
          if (!podSpec.containers[0].volumeMounts) podSpec.containers[0].volumeMounts = []
          if (!podSpec.containers[0].volumeMounts.find(m => m.name === volumeName)) {
            podSpec.containers[0].volumeMounts.push({
              name: volumeName,
              mountPath: `/etc/secrets/${secretName}`,
              readOnly: true
            })
          }
        }
      }
    }
  }
  
  // 创建边 - 使用确定的连接点
  const edge = {
    id: `e${sourceNode.id}-${targetNode.id}-${finalSourceHandle}-${finalTargetHandle}`,
    source: sourceNode.id,
    target: targetNode.id,
    sourceHandle: finalSourceHandle,
    targetHandle: finalTargetHandle,
    animated: false, // 实线样式
    style: {
      stroke: getResourceTypeConfig(sourceNode.type)?.color || '#3b82f6'
    }
  }
  
  edges.value.push(edge)
  emit('edgesChange', edges.value)
  emit('connect', { source: sourceNode, target: targetNode })
}

// 连接处理 - 从 Vue Flow handles (落到 handle 上时)
function onConnect(params) {
  const sourceNode = findNode(params.source)
  const targetNode = findNode(params.target)
  // 使用 Vue Flow 提供的 handle 信息
  createConnection(sourceNode, targetNode, params.sourceHandle, params.targetHandle)
  // 标记已创建连线，防止 onConnectEnd 重复创建
  connectionCreated.value = true
}

// 节点变化
function onNodesChange(changes) {
  emit('nodesChange', nodes.value)
}

// 边变化 - 处理边删除时同步清理资源关系
function onEdgesChange(changes) {
  // 检查是否有边被删除
  const removedEdges = changes.filter(change => change.type === 'remove')
  
  removedEdges.forEach(change => {
    const edgeId = change.id
    // 从当前 edges 中查找被删除的边
    const edge = edges.value.find(e => e.id === edgeId)
    if (!edge) return
    
    // 使用 nodes.value.find 而不是 findNode，确保修改反映到 getAllResources
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    const targetNode = nodes.value.find(n => n.id === edge.target)
    if (!sourceNode || !targetNode) return
    
    // 清理 Ingress ↔ Service 关系
    const ingressNode = [sourceNode, targetNode].find(n => n.type === 'ingress')
    const serviceNode = [sourceNode, targetNode].find(n => n.type === 'service')
    
    if (ingressNode && serviceNode) {
      // 清除 Ingress 中对该 Service 的引用
      const rules = ingressNode.data.resource.spec?.rules || []
      rules.forEach(rule => {
        if (rule.http?.paths) {
          rule.http.paths.forEach(path => {
            if (path.backend?.service?.name === serviceNode.data.name) {
              path.backend.service.name = ''
            }
          })
        }
      })
    }
    
    // 清理 Service → Workload 关系
    if (sourceNode.type === 'service' || targetNode.type === 'service') {
      const svcNode = sourceNode.type === 'service' ? sourceNode : targetNode
      const workloadNode = sourceNode.type === 'service' ? targetNode : sourceNode
      const workloadTypes = ['deployment', 'daemonset', 'statefulset', 'pod', 'job', 'cronjob']
      
      if (workloadTypes.includes(workloadNode.type)) {
        // 清除 Service 的 selector
        if (svcNode.data.resource.spec?.selector) {
          svcNode.data.resource.spec.selector = {}
        }
      }
    }
    
    // 清理存储/配置资源关系 (PVC/ConfigMap/Secret ↔ Workload)
    const storageTypes = ['pvc', 'configmap', 'secret']
    const workloadTypes = ['deployment', 'daemonset', 'statefulset', 'pod', 'job', 'cronjob']
    
    const storageNode = [sourceNode, targetNode].find(n => storageTypes.includes(n.type))
    const workloadNode = [sourceNode, targetNode].find(n => workloadTypes.includes(n.type))
    
    if (storageNode && workloadNode) {
      const resource = workloadNode.data.resource
      console.log('[EdgeCleanup] Found storage-workload connection:', {
        storageType: storageNode.type,
        storageName: storageNode.data.name,
        workloadType: workloadNode.type,
        workloadName: workloadNode.data.name,
        resourceKind: resource.kind
      })
      
      const getPodSpec = (res) => {
        if (res.kind === 'Pod') return res.spec
        if (['Deployment', 'StatefulSet', 'DaemonSet', 'Job'].includes(res.kind)) {
          return res.spec?.template?.spec
        }
        if (res.kind === 'CronJob') {
          return res.spec?.jobTemplate?.spec?.template?.spec
        }
        return null
      }
      
      const podSpec = getPodSpec(resource)
      console.log('[EdgeCleanup] podSpec:', podSpec ? 'found' : 'null', 'volumes:', podSpec?.volumes?.length || 0)
      
      if (podSpec) {
        const storageName = storageNode.data.name
        
        if (storageNode.type === 'pvc') {
          // 移除 volume 和 volumeMount
          const volumeName = `vol-${storageName}`
          if (podSpec.volumes) {
            podSpec.volumes = podSpec.volumes.filter(v => v.name !== volumeName)
          }
          if (podSpec.containers?.[0]?.volumeMounts) {
            podSpec.containers[0].volumeMounts = podSpec.containers[0].volumeMounts.filter(
              vm => vm.name !== volumeName
            )
          }
        } else if (storageNode.type === 'configmap') {
          // 移除 ConfigMap volume 和 volumeMount
          const volumeName = `cm-${storageName}`
          console.log('[EdgeCleanup] Removing ConfigMap volume:', volumeName, 'current volumes:', podSpec.volumes?.map(v => v.name))
          
          const volCountBefore = podSpec.volumes?.length || 0
          if (podSpec.volumes) {
            podSpec.volumes = podSpec.volumes.filter(v => v.name !== volumeName)
          }
          console.log('[EdgeCleanup] After removal:', volCountBefore, '=>', podSpec.volumes?.length || 0)
          
          if (podSpec.containers?.[0]?.volumeMounts) {
            podSpec.containers[0].volumeMounts = podSpec.containers[0].volumeMounts.filter(
              vm => vm.name !== volumeName
            )
          }
          // 也移除 envFrom
          if (podSpec.containers?.[0]?.envFrom) {
            podSpec.containers[0].envFrom = podSpec.containers[0].envFrom.filter(
              ef => ef.configMapRef?.name !== storageName
            )
          }
        } else if (storageNode.type === 'secret') {
          // 移除 Secret volume 和 volumeMount
          const volumeName = `secret-${storageName}`
          if (podSpec.volumes) {
            podSpec.volumes = podSpec.volumes.filter(v => v.name !== volumeName)
          }
          if (podSpec.containers?.[0]?.volumeMounts) {
            podSpec.containers[0].volumeMounts = podSpec.containers[0].volumeMounts.filter(
              vm => vm.name !== volumeName
            )
          }
          // 也移除 envFrom
          if (podSpec.containers?.[0]?.envFrom) {
            podSpec.containers[0].envFrom = podSpec.containers[0].envFrom.filter(
              ef => ef.secretRef?.name !== storageName
            )
          }
        }
      }
    }
  })
  
  emit('edgesChange', edges.value)
}

// 节点点击
function onNodeClick({ node }) {
  // 先隐藏上下文菜单
  hideContextMenu()
  
  // 画笔连线模式
  if (isConnecting.value) {
    if (!connectionSource.value) {
      // 第一次点击：选择源节点
      connectionSource.value = node
      // 获取可能的源 handle
      const handleInfo = findHandleAtPosition(mousePosition.value?.x || 0, mousePosition.value?.y || 0)
      if (handleInfo && handleInfo.nodeId === node.id) {
        sourceHandleId.value = handleInfo.handleId
      }
    } else if (node.id !== connectionSource.value.id) {
      // 第二次点击不同节点：创建连接
      createConnection(connectionSource.value, node)
      cancelConnection()
    }
    return
  }
  
  // 正常模式
  // Namespace 节点点击时取消选中，以便内部组件可以被选中
  // 如果需要编辑 Namespace，双击可以打开属性面板
  if (node.type === 'namespace') {
    // 取消 Namespace 的选中状态
    removeSelectedNodes([node])
    return
  }
  emit('nodeSelect', node)
}

// 节点双击 - 用于选中 Namespace 进行编辑
function onNodeDoubleClick({ node }) {
  emit('nodeSelect', node)
}

// 画布点击
function onPaneClick() {
  // 隐藏上下文菜单
  hideContextMenu()
  
  if (isConnecting.value) {
    // 画布空白处点击：如果有源节点则取消选择源节点，否则退出画笔模式
    if (connectionSource.value) {
      // 取消已选择的源节点，但保持画笔模式
      connectionSource.value = null
      sourceHandleId.value = null
    } else {
      // 退出画笔模式
      cancelConnection()
    }
  } else {
    emit('nodeSelect', null)
  }
}

// 更新节点数据 - 支持完整字段编辑
function updateNodeData(nodeId, field, value) {
  const node = findNode(nodeId)
  if (!node) return
  
  const resource = node.data.resource
  
  // 确保必要的对象结构存在
  if (!resource.metadata) resource.metadata = {}
  if (!resource.spec) resource.spec = {}
  
  // 获取和设置 Pod 模板规格的辅助函数
  const getPodSpec = () => {
    if (resource.spec.template?.spec) return resource.spec.template.spec
    if (resource.spec.jobTemplate?.spec?.template?.spec) return resource.spec.jobTemplate.spec.template.spec
    if (resource.kind === 'Pod') return resource.spec
    return null
  }
  
  const ensurePodSpec = () => {
    if (resource.kind === 'Pod') {
      return resource.spec
    }
    if (['Deployment', 'StatefulSet', 'DaemonSet'].includes(resource.kind)) {
      if (!resource.spec.template) resource.spec.template = { metadata: { labels: {} }, spec: {} }
      if (!resource.spec.template.spec) resource.spec.template.spec = {}
      return resource.spec.template.spec
    }
    if (resource.kind === 'Job') {
      if (!resource.spec.template) resource.spec.template = { metadata: { labels: {} }, spec: {} }
      if (!resource.spec.template.spec) resource.spec.template.spec = {}
      return resource.spec.template.spec
    }
    if (resource.kind === 'CronJob') {
      if (!resource.spec.jobTemplate) resource.spec.jobTemplate = { spec: { template: { metadata: { labels: {} }, spec: {} } } }
      if (!resource.spec.jobTemplate.spec) resource.spec.jobTemplate.spec = { template: { metadata: { labels: {} }, spec: {} } }
      if (!resource.spec.jobTemplate.spec.template) resource.spec.jobTemplate.spec.template = { metadata: { labels: {} }, spec: {} }
      if (!resource.spec.jobTemplate.spec.template.spec) resource.spec.jobTemplate.spec.template.spec = {}
      return resource.spec.jobTemplate.spec.template.spec
    }
    return null
  }
  
  switch (field) {
    // === 元数据 ===
    case 'name':
      node.data.name = value
      resource.metadata.name = value
      // 同步更新 app 标签
      if (!resource.metadata.labels) resource.metadata.labels = {}
      resource.metadata.labels.app = value
      break
      
    case 'namespace':
      resource.metadata.namespace = value
      break
      
    case 'labels':
      resource.metadata.labels = { ...value }
      break
      
    case 'annotations':
      resource.metadata.annotations = value && Object.keys(value).length > 0 ? { ...value } : undefined
      break
    
    // === Deployment/StatefulSet 配置 ===
    case 'replicas':
      resource.spec.replicas = value
      break
      
    case 'strategyType':
      if (!resource.spec.strategy) resource.spec.strategy = {}
      resource.spec.strategy.type = value
      break
      
    case 'serviceName':
      // StatefulSet 的 headless service 名称
      if (resource.kind === 'StatefulSet') {
        resource.spec.serviceName = value
      }
      break
    
    // === Pod 配置 ===
    case 'restartPolicy': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.restartPolicy = value
      break
    }
    
    case 'serviceAccountName': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.serviceAccountName = value || undefined
      break
    }
    
    case 'nodeSelector': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.nodeSelector = value && Object.keys(value).length > 0 ? { ...value } : undefined
      break
    }
    
    case 'volumes': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.volumes = value && value.length > 0 ? value : undefined
      break
    }
    
    case 'containers': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.containers = value
      break
    }
    
    case 'initContainers': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.initContainers = value && value.length > 0 ? value : undefined
      break
    }
    
    case 'tolerations': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.tolerations = value && value.length > 0 ? value : undefined
      break
    }
    
    case 'affinity': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.affinity = value && Object.keys(value || {}).length > 0 ? value : undefined
      break
    }
    
    case 'hostNetwork': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.hostNetwork = value || undefined
      break
    }
    
    case 'dnsPolicy': {
      const podSpec = ensurePodSpec()
      if (podSpec) podSpec.dnsPolicy = value || undefined
      break
    }
    
    // === Service 配置 ===
    case 'serviceType':
      resource.spec.type = value
      break
      
    case 'selector':
      resource.spec.selector = value && Object.keys(value).length > 0 ? { ...value } : undefined
      break
      
    case 'ports':
      resource.spec.ports = value
      break
      
    case 'externalName':
      resource.spec.externalName = value || undefined
      break
    
    // === Ingress 配置 ===
    case 'ingressClassName':
      resource.spec.ingressClassName = value || undefined
      break
      
    case 'rules':
      resource.spec.rules = value
      break
      
    case 'tls':
      resource.spec.tls = value && value.length > 0 ? value : undefined
      break
    
    // === ConfigMap 配置 ===
    case 'configData':
      resource.data = value && Object.keys(value).length > 0 ? { ...value } : {}
      break
    
    // === Secret 配置 ===
    case 'secretType':
      resource.type = value
      break
      
    case 'secretData':
      resource.stringData = value && Object.keys(value).length > 0 ? { ...value } : {}
      break
    
    // === PVC 配置 ===
    case 'storage':
      if (!resource.spec.resources) resource.spec.resources = { requests: {} }
      if (!resource.spec.resources.requests) resource.spec.resources.requests = {}
      resource.spec.resources.requests.storage = value
      break
      
    case 'accessModes':
      resource.spec.accessModes = value
      break
      
    case 'storageClassName':
      resource.spec.storageClassName = value || undefined
      break
    
    // === Job 配置 ===
    case 'completions':
      resource.spec.completions = value
      break
      
    case 'parallelism':
      resource.spec.parallelism = value
      break
      
    case 'backoffLimit':
      if (resource.kind === 'CronJob') {
        if (!resource.spec.jobTemplate) resource.spec.jobTemplate = { spec: {} }
        if (!resource.spec.jobTemplate.spec) resource.spec.jobTemplate.spec = {}
        resource.spec.jobTemplate.spec.backoffLimit = value
      } else {
        resource.spec.backoffLimit = value
      }
      break
    
    // === CronJob 配置 ===
    case 'schedule':
      resource.spec.schedule = value
      break
      
    case 'concurrencyPolicy':
      resource.spec.concurrencyPolicy = value
      break
    
    // === 旧版兼容 (单容器简化编辑) ===
    case 'image': {
      const podSpec = getPodSpec()
      if (podSpec?.containers?.[0]) {
        podSpec.containers[0].image = value
      }
      break
    }
    
    case 'containerPort': {
      const podSpec = getPodSpec()
      if (podSpec?.containers?.[0]) {
        podSpec.containers[0].ports = [{ containerPort: value }]
      }
      break
    }
    
    case 'command': {
      const cmd = typeof value === 'string' ? value.split(' ').filter(s => s) : value
      const podSpec = getPodSpec()
      if (podSpec?.containers?.[0]) {
        podSpec.containers[0].command = cmd
      }
      break
    }
    
    // 旧版字段兼容
    case 'host':
      if (resource.spec?.rules?.[0]) resource.spec.rules[0].host = value
      break
    case 'path':
      if (resource.spec?.rules?.[0]?.http?.paths?.[0]) {
        resource.spec.rules[0].http.paths[0].path = value
      }
      break
    case 'port':
      if (resource.spec?.ports?.[0]) resource.spec.ports[0].port = value
      break
    case 'targetPort':
      if (resource.spec?.ports?.[0]) resource.spec.ports[0].targetPort = value
      break
    case 'nodePort':
      if (resource.spec?.ports?.[0]) resource.spec.ports[0].nodePort = value
      break
    case 'accessMode':
      resource.spec.accessModes = [value]
      break
  }
  
  emit('nodesChange', nodes.value)
}


// 删除节点
function deleteNode(nodeId) {
  nodes.value = nodes.value.filter(n => n.id !== nodeId)
  edges.value = edges.value.filter(e => e.source !== nodeId && e.target !== nodeId)
  emit('nodesChange', nodes.value)
  emit('edgesChange', edges.value)
  emit('nodeSelect', null)
}

// 获取所有资源
function getAllResources(compositionId) {
  return nodes.value.map(node => {
    const resource = JSON.parse(JSON.stringify(node.data.resource))
    if (!resource.metadata.labels) {
      resource.metadata.labels = {}
    }
    resource.metadata.labels['kubecanvas.io/composition'] = compositionId
    resource.metadata.labels['kubecanvas.io/managed-by'] = 'kubecanvas'
    
    // 清理无效容器（必须有 name 和 image）及其无效 volumeMounts
    const cleanContainers = (containers) => {
      if (!containers) return []
      return containers.filter(c => c.name && c.image).map(c => {
        // 深度拷贝
        const container = { ...c }
        
        // 清理无效的 volumeMounts（必须有 name 和 mountPath）
        if (container.volumeMounts) {
          container.volumeMounts = container.volumeMounts.filter(m => m.name && m.mountPath)
          if (container.volumeMounts.length === 0) delete container.volumeMounts
        }
        
        // 清理空资源限制
        if (container.resources) {
          if (!container.resources.requests || Object.keys(container.resources.requests).length === 0) {
            delete container.resources.requests
          }
          if (!container.resources.limits || Object.keys(container.resources.limits).length === 0) {
            delete container.resources.limits
          }
          if (Object.keys(container.resources).length === 0) {
            delete container.resources
          }
        }
        
        // 清理空安全上下文
        if (container.securityContext) {
          // 清理 capabilities
          if (container.securityContext.capabilities) {
            if (!container.securityContext.capabilities.add || container.securityContext.capabilities.add.length === 0) {
              delete container.securityContext.capabilities.add
            }
            if (!container.securityContext.capabilities.drop || container.securityContext.capabilities.drop.length === 0) {
              delete container.securityContext.capabilities.drop
            }
            if (Object.keys(container.securityContext.capabilities).length === 0) {
              delete container.securityContext.capabilities
            }
          }
          if (Object.keys(container.securityContext).length === 0) {
            delete container.securityContext
          }
        }
        
        return container
      })
    }
    
    // 清理 Pod 级配置的辅助函数
    const cleanPodSpec = (spec) => {
      // 清理 Pod 安全上下文
      if (spec.securityContext && Object.keys(spec.securityContext).length === 0) {
        delete spec.securityContext
      }
      
      // 清理 ImagePullSecrets
      if (spec.imagePullSecrets) {
        spec.imagePullSecrets = spec.imagePullSecrets.filter(s => s) 
        if (spec.imagePullSecrets.length === 0) {
          delete spec.imagePullSecrets
        }
      }
    }
    
    // 根据资源类型清理容器
    if (resource.spec?.template?.spec?.containers) {
      resource.spec.template.spec.containers = cleanContainers(resource.spec.template.spec.containers)
      cleanPodSpec(resource.spec.template.spec)
    }
    if (resource.spec?.containers) {
      resource.spec.containers = cleanContainers(resource.spec.containers)
      cleanPodSpec(resource.spec)
    }
    if (resource.spec?.jobTemplate?.spec?.template?.spec?.containers) {
      resource.spec.jobTemplate.spec.template.spec.containers = cleanContainers(resource.spec.jobTemplate.spec.template.spec.containers)
      cleanPodSpec(resource.spec.jobTemplate.spec.template.spec)
    }
    
    // 清理无效 initContainers
    if (resource.spec?.template?.spec?.initContainers) {
      resource.spec.template.spec.initContainers = cleanContainers(resource.spec.template.spec.initContainers)
      if (resource.spec.template.spec.initContainers.length === 0) {
        delete resource.spec.template.spec.initContainers
      }
    }
    if (resource.spec?.initContainers) {
      resource.spec.initContainers = cleanContainers(resource.spec.initContainers)
      if (resource.spec.initContainers.length === 0) {
        delete resource.spec.initContainers
      }
    }
    if (resource.spec?.jobTemplate?.spec?.template?.spec?.initContainers) {
      resource.spec.jobTemplate.spec.template.spec.initContainers = cleanContainers(resource.spec.jobTemplate.spec.template.spec.initContainers)
      if (resource.spec.jobTemplate.spec.template.spec.initContainers.length === 0) {
        delete resource.spec.jobTemplate.spec.template.spec.initContainers
      }
    }
    
    return resource
  })
}

// 获取原始资源（不清理容器，用于验证）
function getRawResources() {
  return nodes.value.map(node => {
    return JSON.parse(JSON.stringify(node.data.resource))
  })
}

// 清空画布
function clearCanvas() {
  nodes.value = []
  edges.value = []
  cancelConnection()
}

// 暴露方法给父组件
defineExpose({
  updateNodeData,
  deleteNode,
  getAllResources,
  getRawResources,
  clearCanvas,
  getNodes: () => nodes.value,
  getEdges: () => edges.value,
  centerView: () => {
    // 使用 fitView 将画布内容居中显示，留出边距考虑侧边栏
    // 右侧面板宽300px，需要更多左偏移
    nextTick(() => {
      fitView({ 
        padding: { top: 0.1, bottom: 0.1, left: 0.05, right: 0.35 },
        includeHiddenNodes: false,
        duration: 300
      })
    })
  }
})
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';

/* 画布容器需要可聚焦以接收键盘事件 */
.canvas-container {
  flex: 1;
  position: relative;
  min-width: 0; /* 防止 flex 子元素溢出 */
  height: calc(100vh - var(--header-height));
  margin-top: var(--header-height);
  overflow: hidden;
  outline: none;
}

/* 连线画笔工具 - 透明背景 */
.connector-brush {
  position: absolute;
  top: 12px;
  left: 8px;
  z-index: 10;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: grab;
  user-select: none;
  transition: all 0.2s ease;
  color: var(--accent-light);
  opacity: 0.7;
}

.connector-brush svg {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.connector-brush:hover {
  opacity: 1;
  transform: scale(1.15);
  color: var(--accent-primary);
}

.connector-brush:hover svg {
  filter: drop-shadow(0 0 8px var(--accent-glow));
}

.connector-brush:active {
  cursor: grabbing;
  transform: scale(0.95);
}

.connector-brush.active {
  opacity: 1;
  color: #fde047;
  animation: brush-pulse 1s ease-in-out infinite;
}

@keyframes brush-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 画笔 Tooltip */
.brush-tooltip {
  position: absolute;
  top: 85px;
  left: 60px;
  z-index: 11;
  padding: 6px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--accent-primary);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  white-space: nowrap;
  box-shadow: var(--glow-sm), var(--shadow-md);
  pointer-events: none;
  animation: tooltipFadeIn 0.15s ease;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 连线状态提示 */
.connection-status {
  position: absolute;
  top: 180px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 10px 20px;
  background: var(--primary-600);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: pulse 1.5s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status strong {
  color: #fde047;
}

.cancel-hint {
  font-size: 12px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
}

/* 临时连线 SVG */
.temp-connection-line {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

/* 连线模式下的画布样式 */
.canvas-container.connecting {
  cursor: crosshair;
}

.canvas-container.connecting .vue-flow__node {
  cursor: pointer;
  transition: all 0.15s ease;
}

.canvas-container.connecting .vue-flow__node:hover {
  filter: brightness(1.05);
}

.canvas-container.connecting .vue-flow__node:hover .k8s-node {
  box-shadow: 0 0 0 4px var(--primary-300), 0 8px 24px rgba(59, 130, 246, 0.4);
  transform: scale(1.02);
}

/* 节点连接点 - 更小 */
.vue-flow__handle {
  width: 8px !important;
  height: 8px !important;
  background: var(--accent-primary) !important;
  border: 2px solid var(--bg-secondary) !important;
  box-shadow: 0 0 4px var(--accent-glow) !important;
  cursor: crosshair !important;
  transition: all 0.15s ease !important;
}

.vue-flow__handle:hover {
  background: var(--accent-light) !important;
  transform: scale(1.5) !important;
  box-shadow: 0 0 8px var(--accent-glow) !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* 节点悬停时的高亮效果 */
.vue-flow__node:hover {
  z-index: 10;
}

/* 右键上下文菜单 */
.context-menu {
  position: fixed;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1);
  z-index: 1000;
  min-width: 150px;
}

.context-menu-item {
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
  white-space: nowrap;
}

.context-menu-item:hover {
  background: var(--bg-tertiary);
}

/* 边（连线）选中状态样式 */
.vue-flow__edge.selected .vue-flow__edge-path {
  stroke-width: 3 !important;
  filter: drop-shadow(0 0 4px var(--accent-light));
}

.vue-flow__edge:hover .vue-flow__edge-path {
  stroke-width: 2 !important;
}
</style>
