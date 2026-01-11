<template>
  <div
    class="canvas-container"
    :class="{ 'connecting': isConnecting }"
    @drop="onDrop"
    @dragover.prevent
    @dragenter.prevent
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @contextmenu.prevent="onRightClick"
    @keydown="onKeyDown"
    tabindex="0"
  >
    <!-- 连线工具栏 -->
    <div class="canvas-toolbar">
      <div 
        class="connector-tool"
        draggable="false"
        @mousedown="startConnectorDrag"
        :class="{ 'active': isConnecting }"
      >
        <span class="connector-tool__icon">✏️</span>
        <span class="connector-tool__text">连线画笔</span>
        <span class="connector-tool__hint">拖拽到节点上 / 从节点连接点拖出</span>
      </div>
    </div>
    
    <!-- 连线提示 -->
    <div v-if="isConnecting" class="connection-status">
      <template v-if="connectionSource">
        🔗 从 <strong>{{ connectionSource.data.name }}</strong> 拖动到目标节点
        <span class="cancel-hint">(ESC 或右键取消)</span>
      </template>
      <template v-else>
        ✏️ 拖动到源节点上开始...
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
      class="canvas"
      fit-view-on-init
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @connect="onConnect"
      @connect-start="onConnectStart"
      @connect-end="onConnectEnd"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
    >
      <Background :gap="20" :size="1" />
      <Controls />
    </VueFlow>
  </div>
</template>

<script setup>
import { ref, markRaw, watch, computed, onMounted, onUnmounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { v4 as uuidv4 } from 'uuid'
import BaseNode from './nodes/BaseNode.vue'
import { createResourceTemplate, getResourceTypeConfig } from '../utils/resourceTemplates.js'

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

const emit = defineEmits(['nodeSelect', 'nodesChange', 'edgesChange', 'connect'])

const vueFlowRef = ref(null)
const { project, findNode, getNodes, getEdges } = useVueFlow()

// 连线状态
const isConnecting = ref(false)
const connectionSource = ref(null)
const mousePosition = ref(null)
const isHandleDrag = ref(false) // 是否从 handle 拖拽开始
const connectionCreated = ref(false) // 防止重复创建连线
const sourceHandleId = ref(null) // 源连接点 ID
const hoveredHandleId = ref(null) // 悬停的目标连接点 ID

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
  statefulset: markRaw(BaseNode),
  service: markRaw(BaseNode),
  pod: markRaw(BaseNode),
  ingress: markRaw(BaseNode),
  configmap: markRaw(BaseNode),
  secret: markRaw(BaseNode),
  pvc: markRaw(BaseNode),
  job: markRaw(BaseNode),
  cronjob: markRaw(BaseNode)
}

// 默认边选项
const defaultEdgeOptions = {
  animated: true,
  style: {
    strokeWidth: 2
  }
}

// 节点和边
const nodes = ref([])
const edges = ref([])

// 监听初始数据
watch([() => props.initialNodes, () => props.initialEdges], ([newNodes, newEdges]) => {
  if (newNodes.length > 0) {
    nodes.value = newNodes
  }
  if (newEdges.length > 0) {
    edges.value = newEdges
  }
}, { immediate: true })

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

// 右键取消
function onRightClick(event) {
  if (isConnecting.value) {
    cancelConnection()
  }
}

// 全局键盘监听
function handleGlobalKeyDown(event) {
  if (event.key === 'Escape' && isConnecting.value) {
    cancelConnection()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown)
})

// 开始连线画笔拖拽
function startConnectorDrag(event) {
  isConnecting.value = true
  connectionSource.value = null
  mousePosition.value = { x: event.clientX, y: event.clientY }
  isHandleDrag.value = false
  event.preventDefault()
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
    
    // 画笔模式下：如果还没有源节点，检查是否经过了某个节点
    if (!isHandleDrag.value && !connectionSource.value) {
      const nodeUnderMouse = findNodeAtPosition(event.clientX, event.clientY)
      if (nodeUnderMouse) {
        // 自动将经过的第一个节点设为源节点
        connectionSource.value = nodeUnderMouse
        // 检查是否悬停在某个 handle 上，设置为源 handle
        const handleInfo = findHandleAtPosition(event.clientX, event.clientY)
        if (handleInfo && handleInfo.nodeId === nodeUnderMouse.id) {
          sourceHandleId.value = handleInfo.handleId
        }
      }
    }
    
    // 检测是否悬停在目标节点的 handle 上
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
function findNodeAtPosition(x, y) {
  const nodeElements = document.querySelectorAll('.vue-flow__node')
  for (const el of nodeElements) {
    const rect = el.getBoundingClientRect()
    // 扩大检测区域，更容易选中
    const padding = 10
    if (x >= rect.left - padding && 
        x <= rect.right + padding && 
        y >= rect.top - padding && 
        y <= rect.bottom + padding) {
      const nodeId = el.getAttribute('data-id')
      return findNode(nodeId)
    }
  }
  return null
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
  const { x, y } = project({ x: event.clientX - 280, y: event.clientY - 64 })
  
  const nodeId = uuidv4()
  const nodeName = `${resource.type}-${nodeId.slice(0, 4)}`
  
  const resourceTemplate = createResourceTemplate(resource.type, nodeName, {
    namespace: 'default'
  })
  
  if (resource.type === 'service') {
    resourceTemplate.spec.type = 'ClusterIP'
  }
  
  const newNode = {
    id: nodeId,
    type: resource.type,
    position: { x, y },
    data: {
      name: nodeName,
      resource: resourceTemplate
    }
  }
  
  nodes.value.push(newNode)
  emit('nodesChange', nodes.value)
}

// 创建连接 - 核心逻辑
function createConnection(sourceNode, targetNode, explicitSourceHandle = null, explicitTargetHandle = null) {
  if (!sourceNode || !targetNode) return
  if (sourceNode.id === targetNode.id) return
  
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
  
  // 如果是 Service 连接到 Deployment/StatefulSet/Pod
  if (sourceNode.type === 'service' && 
      ['deployment', 'statefulset', 'pod'].includes(targetNode.type)) {
    const targetAppLabel = targetNode.data.resource.metadata?.labels?.app ||
                          targetNode.data.resource.spec?.selector?.matchLabels?.app ||
                          targetNode.data.name
    
    if (sourceNode.data.resource.spec) {
      sourceNode.data.resource.spec.selector = {
        app: targetAppLabel
      }
    }
  }
  
  // 如果是 Ingress 连接到 Service
  if (sourceNode.type === 'ingress' && targetNode.type === 'service') {
    const serviceName = targetNode.data.name
    const servicePort = targetNode.data.resource.spec?.ports?.[0]?.port || 80
    
    if (sourceNode.data.resource.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service) {
      sourceNode.data.resource.spec.rules[0].http.paths[0].backend.service.name = serviceName
      sourceNode.data.resource.spec.rules[0].http.paths[0].backend.service.port.number = servicePort
    }
  }
  
  // 创建边 - 使用确定的连接点
  const edge = {
    id: `e${sourceNode.id}-${targetNode.id}-${finalSourceHandle}-${finalTargetHandle}`,
    source: sourceNode.id,
    target: targetNode.id,
    sourceHandle: finalSourceHandle,
    targetHandle: finalTargetHandle,
    animated: true,
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

// 边变化
function onEdgesChange(changes) {
  emit('edgesChange', edges.value)
}

// 节点点击
function onNodeClick({ node }) {
  if (!isConnecting.value) {
    emit('nodeSelect', node)
  }
}

// 画布点击
function onPaneClick() {
  if (isConnecting.value) {
    if (!connectionSource.value) {
      cancelConnection()
    }
  } else {
    emit('nodeSelect', null)
  }
}

// 更新节点数据
function updateNodeData(nodeId, field, value) {
  const node = findNode(nodeId)
  if (!node) return
  
  const resource = node.data.resource
  
  switch (field) {
    case 'name':
      node.data.name = value
      resource.metadata.name = value
      break
    case 'namespace':
      resource.metadata.namespace = value
      break
    case 'replicas':
      if (resource.spec) resource.spec.replicas = value
      break
    case 'image':
      if (resource.spec?.template?.spec?.containers?.[0]) {
        resource.spec.template.spec.containers[0].image = value
      } else if (resource.spec?.containers?.[0]) {
        resource.spec.containers[0].image = value
      } else if (resource.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]) {
        resource.spec.jobTemplate.spec.template.spec.containers[0].image = value
      }
      break
    case 'containerPort':
      if (resource.spec?.template?.spec?.containers?.[0]) {
        resource.spec.template.spec.containers[0].ports = [{ containerPort: value }]
      } else if (resource.spec?.containers?.[0]) {
        resource.spec.containers[0].ports = [{ containerPort: value }]
      }
      break
    case 'serviceType':
      if (resource.spec) resource.spec.type = value
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
    case 'selector':
      const selectorLines = value.split('\n').filter(l => l.trim())
      const selector = {}
      selectorLines.forEach(line => {
        const [key, val] = line.split(':').map(s => s.trim())
        if (key && val) selector[key] = val
      })
      if (resource.spec) resource.spec.selector = selector
      break
    case 'host':
      if (resource.spec?.rules?.[0]) resource.spec.rules[0].host = value
      break
    case 'path':
      if (resource.spec?.rules?.[0]?.http?.paths?.[0]) {
        resource.spec.rules[0].http.paths[0].path = value
      }
      break
    case 'serviceName':
      if (resource.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service) {
        resource.spec.rules[0].http.paths[0].backend.service.name = value
      }
      break
    case 'servicePort':
      if (resource.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port) {
        resource.spec.rules[0].http.paths[0].backend.service.port.number = value
      }
      break
    case 'configData':
      const dataLines = value.split('\n').filter(l => l.trim())
      const data = {}
      dataLines.forEach(line => {
        const [key, ...valParts] = line.split(':')
        if (key) data[key.trim()] = valParts.join(':').trim()
      })
      resource.data = data
      break
    case 'secretType':
      resource.type = value
      break
    case 'secretData':
      const secretLines = value.split('\n').filter(l => l.trim())
      const stringData = {}
      secretLines.forEach(line => {
        const [key, ...valParts] = line.split(':')
        if (key) stringData[key.trim()] = valParts.join(':').trim()
      })
      resource.stringData = stringData
      break
    case 'storage':
      if (resource.spec?.resources?.requests) {
        resource.spec.resources.requests.storage = value
      }
      break
    case 'accessMode':
      if (resource.spec) resource.spec.accessModes = [value]
      break
    case 'storageClassName':
      if (resource.spec) resource.spec.storageClassName = value || undefined
      break
    case 'backoffLimit':
      if (resource.spec) resource.spec.backoffLimit = value
      break
    case 'schedule':
      if (resource.spec) resource.spec.schedule = value
      break
    case 'command':
      const cmd = value.split(' ').filter(s => s)
      if (resource.spec?.template?.spec?.containers?.[0]) {
        resource.spec.template.spec.containers[0].command = cmd
      } else if (resource.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]) {
        resource.spec.jobTemplate.spec.template.spec.containers[0].command = cmd
      }
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
    const resource = { ...node.data.resource }
    if (!resource.metadata.labels) {
      resource.metadata.labels = {}
    }
    resource.metadata.labels['kubecanvas.io/composition'] = compositionId
    resource.metadata.labels['kubecanvas.io/managed-by'] = 'kubecanvas'
    return resource
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
  clearCanvas,
  getNodes: () => nodes.value,
  getEdges: () => edges.value
})
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';

/* 画布容器需要可聚焦以接收键盘事件 */
.canvas-container {
  outline: none;
}

/* 画布工具栏 */
.canvas-toolbar {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px 20px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 2px solid var(--gray-200);
}

/* 连线画笔工具 */
.connector-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
  border: 2px dashed var(--primary-300);
  border-radius: 12px;
  cursor: grab;
  user-select: none;
  transition: all 0.2s ease;
}

.connector-tool:hover {
  background: linear-gradient(135deg, var(--primary-100), var(--primary-200));
  border-color: var(--primary-400);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.connector-tool:active {
  cursor: grabbing;
  transform: scale(0.98);
}

.connector-tool.active {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  border-style: solid;
  border-color: var(--primary-600);
}

.connector-tool.active .connector-tool__icon,
.connector-tool.active .connector-tool__text {
  color: white;
}

.connector-tool__icon {
  font-size: 24px;
}

.connector-tool__text {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-700);
}

.connector-tool__hint {
  font-size: 11px;
  color: var(--primary-500);
}

.connector-tool.active .connector-tool__hint {
  color: var(--primary-100);
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

/* 让 handle 更容易点击和拖拽 */
.vue-flow__handle {
  width: 16px !important;
  height: 16px !important;
  background: var(--primary-500) !important;
  border: 3px solid white !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  cursor: crosshair !important;
  transition: all 0.15s ease !important;
}

.vue-flow__handle:hover {
  background: var(--primary-600) !important;
  transform: scale(1.4) !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5) !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* 节点悬停时的高亮效果 */
.vue-flow__node:hover {
  z-index: 10;
}
</style>
