<template>
  <div class="app-container">
    <!-- 头部 -->
    <header class="app-header">
      <div class="app-header__logo">
        <div class="app-header__logo-icon">☸</div>
        <span>KubeCanvas</span>
      </div>
      
      <div class="app-header__actions">
        <button class="btn btn-secondary" @click="clearCanvas">
          🗑️ 清空
        </button>
        <button class="btn btn-secondary" @click="refreshCompositions">
          🔄 刷新
        </button>
        <button class="btn btn-primary" @click="saveComposition" :disabled="saving">
          {{ saving ? '保存中...' : '💾 保存到 K8s' }}
        </button>
      </div>
    </header>
    
    <!-- 侧边栏 -->
    <Sidebar
      :compositions="compositions"
      @loadComposition="loadComposition"
    />
    
    <!-- 画布 -->
    <Canvas
      ref="canvasRef"
      :compositionId="currentCompositionId"
      :initialNodes="initialNodes"
      :initialEdges="initialEdges"
      @nodeSelect="onNodeSelect"
      @nodesChange="onNodesChange"
      @edgesChange="onEdgesChange"
      @connect="onConnect"
    />
    
    <!-- 属性面板 -->
    <PropertyPanel
      :selectedNode="selectedNode"
      :show="showPanel"
      @update="onPropertyUpdate"
      @close="closePanel"
      @delete="deleteSelectedNode"
    />
    
    <!-- Toast 通知 -->
    <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Canvas from './components/Canvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import { useK8sApi } from './composables/useK8sApi.js'
import { generateCompositionLabel } from './utils/resourceTemplates.js'

const { createResources, listCompositions, getCompositionResources } = useK8sApi()

// 画布引用
const canvasRef = ref(null)

// 当前资源组合 ID
const currentCompositionId = ref(generateCompositionLabel())

// 已保存的资源组合列表
const compositions = ref([])

// 选中的节点
const selectedNode = ref(null)

// 初始节点和边（加载时使用）
const initialNodes = ref([])
const initialEdges = ref([])

// 面板显示
const showPanel = ref(true)

// 保存状态
const saving = ref(false)

// Toast 通知
const toast = reactive({
  show: false,
  message: '',
  type: 'success'
})

// 显示 Toast
function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

// 节点选中
function onNodeSelect(node) {
  selectedNode.value = node
  if (node) {
    showPanel.value = true
  }
}

// 节点变化
function onNodesChange(nodes) {
  // 可以在这里保存到本地存储
}

// 边变化
function onEdgesChange(edges) {
  // 可以在这里保存到本地存储
}

// 连接事件
function onConnect({ source, target }) {
  showToast(`已连接: ${source.data.name} → ${target.data.name}`)
}

// 属性更新
function onPropertyUpdate({ field, value }) {
  if (selectedNode.value && canvasRef.value) {
    canvasRef.value.updateNodeData(selectedNode.value.id, field, value)
    // 更新选中节点引用
    const nodes = canvasRef.value.getNodes()
    selectedNode.value = nodes.find(n => n.id === selectedNode.value.id)
  }
}

// 关闭面板
function closePanel() {
  showPanel.value = false
  selectedNode.value = null
}

// 删除选中节点
function deleteSelectedNode() {
  if (selectedNode.value && canvasRef.value) {
    canvasRef.value.deleteNode(selectedNode.value.id)
    selectedNode.value = null
  }
}

// 清空画布
function clearCanvas() {
  if (canvasRef.value) {
    canvasRef.value.clearCanvas()
    currentCompositionId.value = generateCompositionLabel()
    selectedNode.value = null
    showToast('画布已清空')
  }
}

// 保存资源组合到 K8s
async function saveComposition() {
  if (!canvasRef.value) return
  
  const resources = canvasRef.value.getAllResources(currentCompositionId.value)
  
  if (resources.length === 0) {
    showToast('画布为空，请先添加资源', 'error')
    return
  }
  
  // 验证 Ingress 资源的 backend 配置
  const invalidIngresses = resources.filter(r => {
    if (r.kind !== 'Ingress') return false
    const paths = r.spec?.rules?.[0]?.http?.paths || []
    return paths.some(p => !p.backend?.service?.name)
  })
  
  if (invalidIngresses.length > 0) {
    const names = invalidIngresses.map(i => i.metadata.name).join(', ')
    showToast(`Ingress (${names}) 需要连接到 Service`, 'error')
    return
  }
  
  saving.value = true
  
  try {
    const { results, errors } = await createResources(resources)
    
    if (errors.length === 0) {
      showToast(`成功创建 ${results.length} 个资源！`)
      await refreshCompositions()
    } else {
      showToast(`创建了 ${results.length} 个资源，${errors.length} 个失败`, 'error')
      console.error('Failed resources:', errors)
    }
  } catch (error) {
    showToast(`保存失败: ${error.message}`, 'error')
    console.error('Save error:', error)
  } finally {
    saving.value = false
  }
}

// 刷新资源组合列表
async function refreshCompositions() {
  try {
    compositions.value = await listCompositions()
  } catch (error) {
    console.error('Failed to load compositions:', error)
  }
}

// 加载资源组合
async function loadComposition(compositionId) {
  try {
    const resources = await getCompositionResources(compositionId)
    
    if (resources.length === 0) {
      showToast('未找到资源', 'error')
      return
    }
    
    console.log('Loaded resources from K8s:', resources)
    
    // 转换为节点格式（过滤掉无效资源）
    const nodes = resources
      .filter(resource => resource && resource.kind && resource.metadata)
      .map((resource, index) => {
      const kind = resource.kind.toLowerCase()
      return {
        id: resource.metadata.uid || `node-${index}`,
        type: kind === 'persistentvolumeclaim' ? 'pvc' : kind,
        position: { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 200 },
        data: {
          name: resource.metadata.name,
          resource: resource
        }
      }
    })
    
    // 根据 selector 推断边
    const edges = []
    const serviceNodes = nodes.filter(n => n.type === 'service')
    const workloadNodes = nodes.filter(n => ['deployment', 'statefulset', 'pod'].includes(n.type))
    
    serviceNodes.forEach(serviceNode => {
      const selector = serviceNode.data.resource.spec?.selector
      if (selector && selector.app) {
        const targetNode = workloadNodes.find(w => 
          w.data.resource.metadata?.labels?.app === selector.app ||
          w.data.resource.spec?.selector?.matchLabels?.app === selector.app
        )
        if (targetNode) {
          edges.push({
            id: `e${serviceNode.id}-${targetNode.id}`,
            source: serviceNode.id,
            target: targetNode.id,
            animated: true
          })
        }
      }
    })
    
    console.log('Setting initialNodes:', nodes.length, 'initialEdges:', edges.length)
    initialNodes.value = nodes
    initialEdges.value = edges
    currentCompositionId.value = compositionId
    
    showToast(`已加载 ${resources.length} 个资源`)
  } catch (error) {
    showToast(`加载失败: ${error.message}`, 'error')
    console.error('Load error:', error)
  }
}

// 初始化
onMounted(() => {
  refreshCompositions()
})
</script>
