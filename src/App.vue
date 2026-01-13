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
        <button class="btn btn-primary" @click="showSaveDialog = true" :disabled="saving || loading">
          💾 保存到 K8s
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
    
    <!-- 保存对话框 -->
    <SaveDialog
      :visible="showSaveDialog"
      @confirm="handleSaveConfirm"
      @cancel="showSaveDialog = false"
    />
    
    <!-- 加载状态覆盖层 -->
    <LoadingOverlay
      :visible="loading"
      :message="loadingMessage"
      :successMessage="successMessage"
      :progress="loadingProgress"
      :isSuccess="loadingSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Canvas from './components/Canvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import SaveDialog from './components/SaveDialog.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import { useK8sApi } from './composables/useK8sApi.js'
import { generateCompositionLabel } from './utils/resourceTemplates.js'

const { createResources, listCompositions, getCompositionResources, updateCompositionsRegistry } = useK8sApi()

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

// 保存对话框
const showSaveDialog = ref(false)

// 加载状态覆盖层
const loading = ref(false)
const loadingMessage = ref('处理中...')
const successMessage = ref('操作成功！')
const loadingProgress = ref(0)
const loadingSuccess = ref(false)

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

// 处理保存确认（带组合名称）
async function handleSaveConfirm(compositionName) {
  showSaveDialog.value = false
  
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
  
  // 显示加载覆盖层
  loading.value = true
  loadingMessage.value = '保存中...'
  loadingProgress.value = 10
  loadingSuccess.value = false
  saving.value = true
  
  // 对资源排序：Namespace 必须先创建
  const sortedResources = [...resources].sort((a, b) => {
    if (a.kind === 'Namespace' && b.kind !== 'Namespace') return -1
    if (a.kind !== 'Namespace' && b.kind === 'Namespace') return 1
    return 0
  })
  
  console.log('Creating resources in order:', sortedResources.map(r => `${r.kind}/${r.metadata?.name}`))
  
  try {
    loadingProgress.value = 30
    const { results, errors } = await createResources(sortedResources)
    
    loadingProgress.value = 70
    
    if (errors.length === 0) {
      // 注册到 ConfigMap（包含组合名称）
      const firstResource = sortedResources.find(r => r.metadata?.namespace)
      const namespace = firstResource?.metadata?.namespace || 'default'
      await updateCompositionsRegistry(currentCompositionId.value, namespace, results.length, compositionName)
      
      loadingProgress.value = 100
      loadingSuccess.value = true
      successMessage.value = `成功保存 ${results.length} 个资源！`
      
      // 1.5秒后隐藏
      setTimeout(() => {
        loading.value = false
      }, 1500)
      
      await refreshCompositions()
    } else {
      loading.value = false
      showToast(`创建了 ${results.length} 个资源，${errors.length} 个失败`, 'error')
      console.error('Failed resources:', errors)
    }
  } catch (error) {
    loading.value = false
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
  // 显示加载覆盖层
  loading.value = true
  loadingMessage.value = '恢复中...'
  loadingProgress.value = 20
  loadingSuccess.value = false
  
  try {
    loadingProgress.value = 40
    const resources = await getCompositionResources(compositionId)
    
    if (resources.length === 0) {
      loading.value = false
      showToast('未找到资源', 'error')
      return
    }
    
    loadingProgress.value = 60
    console.log('Loaded resources from K8s:', resources)
    
    // 先分离 Namespace 节点和其他资源
    const namespaceResources = resources.filter(r => r.kind === 'Namespace')
    const otherResources = resources.filter(r => r.kind !== 'Namespace')
    
    // 按层级分类资源（从上到下：Ingress → Service → Workloads → Pod → Storage）
    const layerConfig = [
      { name: 'ingress', kinds: ['Ingress'] },
      { name: 'service', kinds: ['Service'] },
      { name: 'workload', kinds: ['Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet', 'Job', 'CronJob'] },
      { name: 'pod', kinds: ['Pod'] },
      { name: 'storage', kinds: ['ConfigMap', 'Secret', 'PersistentVolumeClaim'] }
    ]
    
    // 节点尺寸和间距配置
    const nodeWidth = 180
    const nodeHeight = 100
    const horizontalGap = 50
    const verticalGap = 80
    const nsHeaderHeight = 50
    const nsPadding = 30
    
    // 获取资源的层级索引
    const getLayerIndex = (kind) => {
      for (let i = 0; i < layerConfig.length; i++) {
        if (layerConfig[i].kinds.includes(kind)) return i
      }
      return layerConfig.length // 未分类的放最后
    }
    
    // 如果有 Namespace，按 Namespace 分组处理
    if (namespaceResources.length > 0) {
      // 创建 Namespace 节点
      let currentY = 50
      const allNodes = []
      
      namespaceResources.forEach((nsResource, nsIndex) => {
        const nsName = nsResource.metadata.name
        
        // 找到属于这个 Namespace 的所有资源
        const nsChildren = otherResources.filter(r => r.metadata.namespace === nsName)
        
        // 按层分组
        const childrenByLayer = {}
        layerConfig.forEach(layer => {
          childrenByLayer[layer.name] = nsChildren.filter(r => layer.kinds.includes(r.kind))
        })
        // 未分类的资源
        const classifiedKinds = layerConfig.flatMap(l => l.kinds)
        const unclassified = nsChildren.filter(r => !classifiedKinds.includes(r.kind))
        childrenByLayer.storage = [...(childrenByLayer.storage || []), ...unclassified]
        
        // 计算有资源的层
        const activeLayers = layerConfig.filter(layer => (childrenByLayer[layer.name] || []).length > 0)
        
        // 计算 Namespace 需要的高度
        const nsHeight = Math.max(
          activeLayers.length * (nodeHeight + verticalGap) + nsHeaderHeight + nsPadding,
          300
        )
        
        // 计算最大层宽度
        let maxLayerWidth = 0
        activeLayers.forEach(layer => {
          const count = (childrenByLayer[layer.name] || []).length
          const width = count * nodeWidth + (count - 1) * horizontalGap
          maxLayerWidth = Math.max(maxLayerWidth, width)
        })
        const nsWidth = Math.max(maxLayerWidth + nsPadding * 2, 600)
        
        // 创建 Namespace 节点
        const nsNode = {
          id: nsResource.metadata.uid || `ns-${nsIndex}`,
          type: 'namespace',
          position: { x: 50, y: currentY },
          zIndex: 0,
          data: {
            name: nsName,
            resource: nsResource,
            width: nsWidth,
            height: nsHeight
          }
        }
        allNodes.push(nsNode)
        
        // 在 Namespace 内部创建子节点
        let layerY = currentY + nsHeaderHeight + 20
        activeLayers.forEach((layer) => {
          const layerResources = childrenByLayer[layer.name] || []
          const layerWidth = layerResources.length * nodeWidth + (layerResources.length - 1) * horizontalGap
          const offsetX = (nsWidth - layerWidth) / 2
          
          layerResources.forEach((resource, i) => {
            const kind = resource.kind.toLowerCase()
            const x = 50 + nsPadding + offsetX + i * (nodeWidth + horizontalGap)
            
            allNodes.push({
              id: resource.metadata.uid || `node-${kind}-${i}`,
              type: kind === 'persistentvolumeclaim' ? 'pvc' : kind,
              position: { x, y: layerY },
              zIndex: 10,
              data: {
                name: resource.metadata.name,
                resource: resource
              }
            })
          })
          
          if (layerResources.length > 0) {
            layerY += nodeHeight + verticalGap
          }
        })
        
        currentY += nsHeight + 50
      })
      
      // 处理不属于任何 Namespace 的资源（放在 Namespace 之后）
      const orphanResources = otherResources.filter(r => 
        !namespaceResources.some(ns => ns.metadata.name === r.metadata.namespace)
      )
      
      if (orphanResources.length > 0) {
        // 按层分组
        const orphansByLayer = {}
        layerConfig.forEach(layer => {
          orphansByLayer[layer.name] = orphanResources.filter(r => layer.kinds.includes(r.kind))
        })
        
        const activeOrphanLayers = layerConfig.filter(layer => (orphansByLayer[layer.name] || []).length > 0)
        
        activeOrphanLayers.forEach((layer, layerIdx) => {
          const layerResources = orphansByLayer[layer.name] || []
          layerResources.forEach((resource, i) => {
            const kind = resource.kind.toLowerCase()
            allNodes.push({
              id: resource.metadata.uid || `orphan-${kind}-${i}`,
              type: kind === 'persistentvolumeclaim' ? 'pvc' : kind,
              position: { 
                x: 50 + i * (nodeWidth + horizontalGap), 
                y: currentY + layerIdx * (nodeHeight + verticalGap) 
              },
              zIndex: 10,
              data: {
                name: resource.metadata.name,
                resource: resource
              }
            })
          })
        })
      }
      
      // 合并节点列表
      var nodes = allNodes
    } else {
      // 没有 Namespace，使用简单分层布局
      const resourcesByLayer = {}
      layerConfig.forEach(layer => {
        resourcesByLayer[layer.name] = otherResources.filter(r => layer.kinds.includes(r.kind))
      })
      const classifiedKinds = layerConfig.flatMap(l => l.kinds)
      const unclassified = otherResources.filter(r => !classifiedKinds.includes(r.kind))
      resourcesByLayer.storage = [...(resourcesByLayer.storage || []), ...unclassified]
      
      const activeLayers = layerConfig.filter(layer => (resourcesByLayer[layer.name] || []).length > 0)
      
      // 计算最大层宽度
      let maxLayerWidth = 0
      activeLayers.forEach(layer => {
        const count = (resourcesByLayer[layer.name] || []).length
        maxLayerWidth = Math.max(maxLayerWidth, count * nodeWidth + (count - 1) * horizontalGap)
      })
      
      const allNodes = []
      activeLayers.forEach((layer, layerIndex) => {
        const layerResources = resourcesByLayer[layer.name] || []
        const layerWidth = layerResources.length * nodeWidth + (layerResources.length - 1) * horizontalGap
        const offsetX = (maxLayerWidth - layerWidth) / 2
        
        layerResources.forEach((resource, i) => {
          const kind = resource.kind.toLowerCase()
          allNodes.push({
            id: resource.metadata.uid || `node-${kind}-${i}`,
            type: kind === 'persistentvolumeclaim' ? 'pvc' : kind,
            position: {
              x: 50 + offsetX + i * (nodeWidth + horizontalGap),
              y: 50 + layerIndex * (nodeHeight + verticalGap)
            },
            zIndex: 10,
            data: {
              name: resource.metadata.name,
              resource: resource
            }
          })
        })
      })
      
      var nodes = allNodes
    }
    
    // 计算两个节点之间最佳连接点的辅助函数
    const getBestHandles = (sourceNode, targetNode) => {
      const sx = sourceNode.position.x
      const sy = sourceNode.position.y
      const tx = targetNode.position.x
      const ty = targetNode.position.y
      
      const dx = tx - sx
      const dy = ty - sy
      
      // 主要垂直方向（上下排列的节点）
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > 0) {
          return { sourceHandle: 'bottom', targetHandle: 'top' }
        } else {
          return { sourceHandle: 'top', targetHandle: 'bottom' }
        }
      } else {
        // 主要水平方向（左右排列的节点）
        if (dx > 0) {
          return { sourceHandle: 'right', targetHandle: 'left' }
        } else {
          return { sourceHandle: 'left', targetHandle: 'right' }
        }
      }
    }
    
    // 根据关系推断边
    const edges = []
    const serviceNodesForEdges = nodes.filter(n => n.type === 'service')
    const workloadNodesForEdges = nodes.filter(n => ['deployment', 'statefulset', 'pod'].includes(n.type))
    const configMapNodesForEdges = nodes.filter(n => n.type === 'configmap')
    const secretNodesForEdges = nodes.filter(n => n.type === 'secret')
    
    // 1. Service -> Workload (根据 selector 匹配)
    serviceNodesForEdges.forEach(serviceNode => {
      const selector = serviceNode.data.resource.spec?.selector
      if (selector) {
        // 尝试匹配所有 selector 键
        const selectorKeys = Object.keys(selector)
        workloadNodesForEdges.forEach(workloadNode => {
          const labels = workloadNode.data.resource.metadata?.labels || {}
          const matchLabels = workloadNode.data.resource.spec?.selector?.matchLabels || {}
          
          // 检查是否有任何 selector 键匹配
          const isMatch = selectorKeys.some(key => 
            labels[key] === selector[key] || matchLabels[key] === selector[key]
          )
          
          if (isMatch) {
            const handles = getBestHandles(serviceNode, workloadNode)
            edges.push({
              id: `e-svc-${serviceNode.id}-${workloadNode.id}`,
              source: serviceNode.id,
              target: workloadNode.id,
              sourceHandle: handles.sourceHandle,
              targetHandle: handles.targetHandle,
              animated: false
            })
          }
        })
      }
    })
    
    // 2. Workload -> ConfigMap/Secret (根据 volumes 匹配)
    workloadNodesForEdges.forEach(workloadNode => {
      const volumes = workloadNode.data.resource.spec?.template?.spec?.volumes || []
      
      volumes.forEach(volume => {
        // ConfigMap volume
        if (volume.configMap?.name) {
          const cmNode = configMapNodesForEdges.find(cm => cm.data.name === volume.configMap.name)
          if (cmNode) {
            const handles = getBestHandles(workloadNode, cmNode)
            edges.push({
              id: `e-vol-${workloadNode.id}-${cmNode.id}`,
              source: workloadNode.id,
              target: cmNode.id,
              sourceHandle: handles.sourceHandle,
              targetHandle: handles.targetHandle,
              animated: false
            })
          }
        }
        
        // Secret volume
        if (volume.secret?.secretName) {
          const secretNode = secretNodesForEdges.find(s => s.data.name === volume.secret.secretName)
          if (secretNode) {
            const handles = getBestHandles(workloadNode, secretNode)
            edges.push({
              id: `e-vol-${workloadNode.id}-${secretNode.id}`,
              source: workloadNode.id,
              target: secretNode.id,
              sourceHandle: handles.sourceHandle,
              targetHandle: handles.targetHandle,
              animated: false
            })
          }
        }
      })
    })
    
    loadingProgress.value = 100
    loadingSuccess.value = true
    successMessage.value = `成功恢复 ${resources.length} 个资源！`
    
    console.log('Setting initialNodes:', nodes.length, 'initialEdges:', edges.length)
    initialNodes.value = nodes
    initialEdges.value = edges
    currentCompositionId.value = compositionId
    
    // 1.5秒后隐藏
    setTimeout(() => {
      loading.value = false
    }, 1500)
  } catch (error) {
    loading.value = false
    showToast(`加载失败: ${error.message}`, 'error')
    console.error('Load error:', error)
  }
}

// 初始化
onMounted(() => {
  refreshCompositions()
})
</script>
