<template>
  <div class="app-container">
    <!-- 头部 -->
    <header class="app-header">
      <div class="app-header__logo">
        <img src="./assets/icons/kubecanvas-logo-new.png" alt="KubeCanvas" class="app-header__logo-icon" />
        <span>KubeCanvas</span>
      </div>
      
      <div class="app-header__actions">
        <button class="btn btn-secondary" @click="clearCanvas">
          🗑️ 清空
        </button>
        <button class="btn btn-secondary" @click="refreshCompositions">
          🔄 刷新
        </button>
        <button class="btn btn-primary" @click="handleSaveClick" :disabled="saving || loading">
          💾 {{ currentCompositionName ? '保存更新' : '保存到 K8s' }}
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
      @connectionError="onConnectionError"
      @deleteNode="deleteSelectedNode"
    />
    
    <!-- 属性面板 -->
    <PropertyPanel
      :selectedNode="selectedNode"
      :show="showPanel"
      @update="onPropertyUpdate"
      @close="closePanel"
      @delete="deleteSelectedNode"
    />
    
    <!-- Toast 通知 - Teleport 到 body 确保在最上层 -->
    <Teleport to="body">
      <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]" style="z-index: 9999 !important;">
        {{ toast.message }}
      </div>
    </Teleport>
    
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

const { createResource, createResources, listCompositions, getCompositionResources, updateCompositionsRegistry, patchResource, deleteResource } = useK8sApi()

// 画布引用
const canvasRef = ref(null)

// 当前资源组合 ID
const currentCompositionId = ref(generateCompositionLabel())

// 当前组合名称（恢复的组合才有）
const currentCompositionName = ref('')

// 原始资源快照（用于增量更新比较）
const originalResources = ref([])

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
  console.log('[Toast] Showing toast:', message, 'type:', type)
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 5000)  // 延长到 5 秒以便观察
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

// 连接错误事件 (K8s 语义校验失败)
function onConnectionError(reason) {
  showToast(reason, 'error')
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

// 删除选中节点（支持从右键菜单传入节点或使用当前选中节点）
async function deleteSelectedNode(nodeFromContextMenu = null) {
  const nodeToDelete = nodeFromContextMenu || selectedNode.value
  if (!nodeToDelete || !canvasRef.value) return
  
  const resource = nodeToDelete.data?.resource
  
  // Namespace 删除二次确认：检查是否有内部组件
  if (nodeToDelete.type === 'namespace') {
    const allNodes = canvasRef.value.getNodes()
    const nsNode = nodeToDelete
    const nsWidth = nsNode.data.width || 600
    const nsHeight = nsNode.data.height || 450
    
    // 查找 Namespace 内部的组件
    const childNodes = allNodes.filter(n => {
      if (n.id === nsNode.id || n.type === 'namespace') return false
      return n.position.x >= nsNode.position.x && 
             n.position.x <= nsNode.position.x + nsWidth &&
             n.position.y >= nsNode.position.y && 
             n.position.y <= nsNode.position.y + nsHeight
    })
    
    if (childNodes.length > 0) {
      const confirmed = window.confirm(
        `Namespace "${nsNode.data.name}" 内部有 ${childNodes.length} 个组件。\n删除 Namespace 将同时删除所有内部组件，是否继续？`
      )
      if (!confirmed) return
      
      // 如果是已保存的组合，从 K8s 删除子资源
      if (currentCompositionName.value) {
        try {
          loading.value = true
          loadingMessage.value = '删除 Namespace 及内部资源中...'
          loadingProgress.value = 10
          loadingSuccess.value = false
          
          // 先删除子资源
          for (let i = 0; i < childNodes.length; i++) {
            const childNode = childNodes[i]
            const childResource = childNode.data?.resource
            if (childResource?.metadata?.resourceVersion) {
              try {
                await deleteResource(childResource.kind, childResource.metadata.name, childResource.metadata.namespace)
                console.log(`Deleted child resource: ${childResource.kind}/${childResource.metadata.name}`)
              } catch (error) {
                // 404 表示资源已不存在，继续删除其他资源
                if (error.response?.status !== 404) {
                  console.error(`Failed to delete ${childResource.kind}/${childResource.metadata.name}:`, error)
                }
              }
            }
            canvasRef.value.deleteNode(childNode.id)
            loadingProgress.value = 10 + (i + 1) * 60 / childNodes.length
          }
          
          // 再删除 Namespace
          const nsResource = nsNode.data?.resource
          if (nsResource?.metadata?.resourceVersion) {
            try {
              await deleteResource(nsResource.kind, nsResource.metadata.name)
              console.log(`Deleted namespace: ${nsResource.metadata.name}`)
            } catch (error) {
              if (error.response?.status !== 404) {
                console.error(`Failed to delete Namespace/${nsResource.metadata.name}:`, error)
              }
            }
          }
          
          loadingProgress.value = 100
          loadingSuccess.value = true
          successMessage.value = `已删除 Namespace 及其 ${childNodes.length} 个内部组件`
          
          setTimeout(() => {
            loading.value = false
          }, 1000)
          
        } catch (error) {
          loading.value = false
          showToast(`删除失败: ${error.message}`, 'error')
          console.error('Namespace delete error:', error)
          return
        }
      } else {
        // 未保存的组合，只从画布删除
        for (const childNode of childNodes) {
          canvasRef.value.deleteNode(childNode.id)
        }
        showToast(`已删除 Namespace 及其 ${childNodes.length} 个内部组件`)
      }
    } else {
      // 没有子资源，只删除 Namespace
      if (currentCompositionName.value) {
        const nsResource = nsNode.data?.resource
        if (nsResource?.metadata?.resourceVersion) {
          try {
            loading.value = true
            loadingMessage.value = '删除 Namespace 中...'
            loadingProgress.value = 50
            loadingSuccess.value = false
            
            await deleteResource(nsResource.kind, nsResource.metadata.name)
            
            loadingProgress.value = 100
            loadingSuccess.value = true
            successMessage.value = `已删除 Namespace ${nsResource.metadata.name}`
            
            setTimeout(() => {
              loading.value = false
            }, 1000)
          } catch (error) {
            loading.value = false
            if (error.response?.status !== 404) {
              showToast(`删除失败: ${error.message}`, 'error')
              console.error('Namespace delete error:', error)
              return
            }
          }
        }
      }
    }
    
    // 删除 Namespace 自身（从画布）
    canvasRef.value.deleteNode(nodeToDelete.id)
    selectedNode.value = null
    return
  }
  
  // 检查引用关系
  const referenceCheck = checkResourceReferences(nodeToDelete)
  if (referenceCheck.isReferenced) {
    showToast(`无法删除：${resource?.metadata?.name} 正在被 ${referenceCheck.referencedBy.join(', ')} 引用`, 'error')
    return
  }
  
  // 如果是已保存的资源（有 resourceVersion），从 K8s 删除
  if (currentCompositionName.value && resource?.metadata?.resourceVersion) {
    try {
      loading.value = true
      loadingMessage.value = '删除资源中...'
      loadingProgress.value = 30
      loadingSuccess.value = false
      
      await deleteResource(resource.kind, resource.metadata.name, resource.metadata.namespace)
      
      loadingProgress.value = 100
      loadingSuccess.value = true
      successMessage.value = `已删除 ${resource.kind}/${resource.metadata.name}`
      
      // 从原始资源快照中移除
      const resourceKey = r => `${r.kind}/${r.metadata?.namespace || ''}/${r.metadata?.name || ''}`
      const keyToRemove = resourceKey(resource)
      originalResources.value = originalResources.value.filter(r => resourceKey(r) !== keyToRemove)
      
      setTimeout(() => {
        loading.value = false
      }, 1000)
    } catch (error) {
      loading.value = false
      // 404 表示资源已不存在，不算错误
      if (error.response?.status !== 404) {
        showToast(`删除失败: ${error.message}`, 'error')
        console.error('Delete error:', error)
        return
      }
    }
  }
  
  // 从画布删除
  canvasRef.value.deleteNode(nodeToDelete.id)
  selectedNode.value = null
  
  // 更新注册表中的资源数量
  if (currentCompositionName.value) {
    const remainingNodes = canvasRef.value.getNodes()
    const firstResource = remainingNodes.find(n => n.data?.resource?.metadata?.namespace)
    const namespace = firstResource?.data?.resource?.metadata?.namespace || 'default'
    await updateCompositionsRegistry(currentCompositionId.value, namespace, remainingNodes.length, currentCompositionName.value)
    await refreshCompositions()
  }
  
  if (!currentCompositionName.value) {
    // 新组合，只显示本地删除提示
    showToast('已从画布删除')
  }
}

// 检查资源引用关系
function checkResourceReferences(nodeToCheck) {
  const nodes = canvasRef.value?.getNodes() || []
  const edges = canvasRef.value?.getEdges() || []
  const resource = nodeToCheck.data?.resource
  const resourceName = resource?.metadata?.name
  const resourceKind = resource?.kind
  
  const referencedBy = []
  
  // 检查边连接（如果有其他节点连接到这个节点）
  const incomingEdges = edges.filter(e => e.target === nodeToCheck.id)
  const outgoingEdges = edges.filter(e => e.source === nodeToCheck.id)
  
  // 检查具体引用关系
  for (const node of nodes) {
    if (node.id === nodeToCheck.id) continue
    
    const nodeResource = node.data?.resource
    const nodeName = node.data?.name || nodeResource?.metadata?.name
    
    // 检查 ConfigMap 引用
    if (resourceKind === 'ConfigMap') {
      const volumes = getVolumes(nodeResource)
      if (volumes.some(v => v.configMap?.name === resourceName)) {
        referencedBy.push(nodeName)
      }
    }
    
    // 检查 Secret 引用
    if (resourceKind === 'Secret') {
      const volumes = getVolumes(nodeResource)
      if (volumes.some(v => v.secret?.secretName === resourceName)) {
        referencedBy.push(nodeName)
      }
    }
    
    // 检查 PVC 引用
    if (resourceKind === 'PersistentVolumeClaim') {
      const volumes = getVolumes(nodeResource)
      if (volumes.some(v => v.persistentVolumeClaim?.claimName === resourceName)) {
        referencedBy.push(nodeName)
      }
    }
    
    // 检查 Service 引用（Ingress -> Service）
    if (resourceKind === 'Service' && nodeResource?.kind === 'Ingress') {
      const rules = nodeResource.spec?.rules || []
      for (const rule of rules) {
        const paths = rule.http?.paths || []
        if (paths.some(p => p.backend?.service?.name === resourceName)) {
          referencedBy.push(nodeName)
        }
      }
    }
  }
  
  return {
    isReferenced: referencedBy.length > 0,
    referencedBy: [...new Set(referencedBy)] // 去重
  }
}

// 获取资源的 volumes
function getVolumes(resource) {
  if (!resource) return []
  
  if (resource.kind === 'Pod') {
    return resource.spec?.volumes || []
  }
  if (['Deployment', 'StatefulSet', 'DaemonSet', 'Job'].includes(resource.kind)) {
    return resource.spec?.template?.spec?.volumes || []
  }
  if (resource.kind === 'CronJob') {
    return resource.spec?.jobTemplate?.spec?.template?.spec?.volumes || []
  }
  return []
}

// 清空画布
function clearCanvas() {
  if (canvasRef.value) {
    canvasRef.value.clearCanvas()
    currentCompositionId.value = generateCompositionLabel()
    currentCompositionName.value = '' // 重置组合名称
    originalResources.value = [] // 清空原始资源
    selectedNode.value = null
    showToast('画布已清空')
  }
}

// 点击保存按钮
function handleSaveClick() {
  if (currentCompositionName.value) {
    // 已有组合名称，直接增量保存
    handleIncrementalSave()
  } else {
    // 新组合，显示对话框
    showSaveDialog.value = true
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

// 增量保存（用于恢复的组合）
async function handleIncrementalSave() {
  if (!canvasRef.value) return
  
  const currentResources = canvasRef.value.getAllResources(currentCompositionId.value)
  
  if (currentResources.length === 0) {
    showToast('画布为空，请先添加资源', 'error')
    return
  }
  
  // Debug: 检查 Job 资源的 volumes
  const jobResource = currentResources.find(r => r.kind === 'Job')
  if (jobResource) {
    console.log('[Save] Current Job volumes:', jobResource.spec?.template?.spec?.volumes)
  }
  const originalJob = originalResources.value.find(r => r.kind === 'Job')
  if (originalJob) {
    console.log('[Save] Original Job volumes:', originalJob.spec?.template?.spec?.volumes)
  }
  
  // 计算资源差异
  const { toCreate, toPatch, unchanged } = diffResources(originalResources.value, currentResources)
  
  console.log('Resource diff:', { toCreate: toCreate.length, toPatch: toPatch.length, unchanged: unchanged.length })
  
  if (toCreate.length === 0 && toPatch.length === 0) {
    showToast('没有需要保存的更改')
    return
  }
  
  // 显示加载覆盖层
  loading.value = true
  loadingMessage.value = '保存更新中...'
  loadingProgress.value = 10
  loadingSuccess.value = false
  saving.value = true
  
  try {
    const results = []
    const errors = []
    
    // 1. 创建新资源（Namespace 优先）
    const sortedToCreate = [...toCreate].sort((a, b) => {
      if (a.kind === 'Namespace' && b.kind !== 'Namespace') return -1
      if (a.kind !== 'Namespace' && b.kind === 'Namespace') return 1
      return 0
    })
    
    loadingProgress.value = 30
    
    for (const resource of sortedToCreate) {
      try {
        const result = await createResource(resource)
        results.push({ type: 'create', resource: result })
        console.log(`Created: ${resource.kind}/${resource.metadata.name}`)
      } catch (error) {
        errors.push({ type: 'create', resource, error: error.response?.data || error.message })
        console.error(`Failed to create ${resource.kind}/${resource.metadata.name}:`, error)
      }
    }
    
    loadingProgress.value = 50
    
    // 2. Patch 修改的资源
    for (const resource of toPatch) {
      try {
        const result = await patchResource(resource)
        results.push({ type: 'patch', resource: result })
        console.log(`Patched: ${resource.kind}/${resource.metadata.name}`)
      } catch (error) {
        const errorMsg = error.message || error.response?.data?.message || '未知错误'
        errors.push({ type: 'patch', resource, error: errorMsg })
        console.error(`Failed to patch ${resource.kind}/${resource.metadata.name}:`, error)
        // 立即显示错误提示
        showToast(`${resource.kind}/${resource.metadata.name}: ${errorMsg}`, 'error')
      }
    }
    
    loadingProgress.value = 70
    
    if (errors.length === 0) {
      // 更新注册表
      const allResources = [...unchanged, ...results.map(r => r.resource)]
      const firstResource = allResources.find(r => r.metadata?.namespace)
      const namespace = firstResource?.metadata?.namespace || 'default'
      await updateCompositionsRegistry(currentCompositionId.value, namespace, allResources.length, currentCompositionName.value)
      
      // 更新原始资源快照
      originalResources.value = currentResources.map(r => JSON.parse(JSON.stringify(r)))
      
      loadingProgress.value = 100
      loadingSuccess.value = true
      successMessage.value = `已更新！创建 ${toCreate.length} 个，修改 ${toPatch.length} 个资源`
      
      setTimeout(() => {
        loading.value = false
      }, 1500)
      
      await refreshCompositions()
    } else {
      loading.value = false
      // 不再显示重复的 toast，因为每条错误已经单独显示了
      console.error('Failed resources:', errors)
    }
  } catch (error) {
    loading.value = false
    showToast(`保存失败: ${error.message}`, 'error')
    console.error('Incremental save error:', error)
  } finally {
    saving.value = false
  }
}

// 资源差异计算
function diffResources(original, current) {
  const resourceKey = (r) => `${r.kind}/${r.metadata?.namespace || ''}/${r.metadata?.name || ''}`
  
  const originalMap = new Map(original.map(r => [resourceKey(r), r]))
  const currentMap = new Map(current.map(r => [resourceKey(r), r]))
  
  const toCreate = []
  const toPatch = []
  const unchanged = []
  
  for (const [key, resource] of currentMap) {
    if (!originalMap.has(key)) {
      // 新资源
      toCreate.push(resource)
    } else {
      const originalResource = originalMap.get(key)
      if (hasResourceChanged(originalResource, resource)) {
        // 已修改
        toPatch.push(resource)
      } else {
        // 未修改
        unchanged.push(resource)
      }
    }
  }
  
  return { toCreate, toPatch, unchanged }
}

// 检查资源是否已修改（比较 spec）
function hasResourceChanged(original, current) {
  // 比较 spec 部分（忽略 metadata 中的 resourceVersion 等）
  const originalSpec = JSON.stringify(original.spec || {})
  const currentSpec = JSON.stringify(current.spec || {})
  
  if (originalSpec !== currentSpec) return true
  
  // 对于 ConfigMap/Secret，比较 data
  if (original.kind === 'ConfigMap' || original.kind === 'Secret') {
    const originalData = JSON.stringify(original.data || original.stringData || {})
    const currentData = JSON.stringify(current.data || current.stringData || {})
    if (originalData !== currentData) return true
  }
  
  return false
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
    const ingressNodesForEdges = nodes.filter(n => n.type === 'ingress')
    const serviceNodesForEdges = nodes.filter(n => n.type === 'service')
    const workloadNodesForEdges = nodes.filter(n => ['deployment', 'statefulset', 'daemonset', 'pod', 'job', 'cronjob'].includes(n.type))
    const configMapNodesForEdges = nodes.filter(n => n.type === 'configmap')
    const secretNodesForEdges = nodes.filter(n => n.type === 'secret')
    const pvcNodesForEdges = nodes.filter(n => n.type === 'pvc')
    
    // 0. Ingress -> Service (根据 backend.service.name 匹配)
    ingressNodesForEdges.forEach(ingressNode => {
      const rules = ingressNode.data.resource.spec?.rules || []
      rules.forEach(rule => {
        const paths = rule.http?.paths || []
        paths.forEach(path => {
          const serviceName = path.backend?.service?.name
          if (serviceName) {
            const serviceNode = serviceNodesForEdges.find(s => s.data.name === serviceName)
            if (serviceNode) {
              const handles = getBestHandles(ingressNode, serviceNode)
              edges.push({
                id: `e-ing-${ingressNode.id}-${serviceNode.id}`,
                source: ingressNode.id,
                target: serviceNode.id,
                sourceHandle: handles.sourceHandle,
                targetHandle: handles.targetHandle,
                animated: false,
                style: { strokeWidth: 1, stroke: '#3b82f6' }
              })
            }
          }
        })
      })
    })
    
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
              animated: false,
              style: { strokeWidth: 1, stroke: '#3b82f6' }
            })
          }
        })
      }
    })
    
    // 获取 Pod Spec 的辅助函数
    const getPodSpecForRestore = (nodeType, resource) => {
      if (nodeType === 'pod') return resource.spec
      if (['deployment', 'statefulset', 'daemonset', 'job'].includes(nodeType)) {
        return resource.spec?.template?.spec
      }
      if (nodeType === 'cronjob') {
        return resource.spec?.jobTemplate?.spec?.template?.spec
      }
      return null
    }
    
    // 2. Workload -> ConfigMap/Secret/PVC (根据 volumes 匹配)
    workloadNodesForEdges.forEach(workloadNode => {
      const podSpec = getPodSpecForRestore(workloadNode.type, workloadNode.data.resource)
      const volumes = podSpec?.volumes || []
      
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
              animated: false,
              style: { strokeWidth: 1, stroke: '#3b82f6' }
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
              animated: false,
              style: { strokeWidth: 1, stroke: '#3b82f6' }
            })
          }
        }
        
        // PVC volume
        if (volume.persistentVolumeClaim?.claimName) {
          const pvcNode = pvcNodesForEdges.find(p => p.data.name === volume.persistentVolumeClaim.claimName)
          if (pvcNode) {
            const handles = getBestHandles(workloadNode, pvcNode)
            edges.push({
              id: `e-vol-${workloadNode.id}-${pvcNode.id}`,
              source: workloadNode.id,
              target: pvcNode.id,
              sourceHandle: handles.sourceHandle,
              targetHandle: handles.targetHandle,
              animated: false,
              style: { strokeWidth: 1, stroke: '#3b82f6' }
            })
          }
        }
      })
    })
    
    loadingProgress.value = 100
    loadingSuccess.value = true
    successMessage.value = `成功恢复 ${resources.length} 个资源！`
    
    // 保存原始资源快照和组合名称
    originalResources.value = resources.map(r => JSON.parse(JSON.stringify(r)))
    
    // 从注册表获取组合名称
    const registry = compositions.value.find(c => c.id === compositionId)
    currentCompositionName.value = registry?.name || ''
    
    console.log('Setting initialNodes:', nodes.length, 'initialEdges:', edges.length)
    console.log('Composition name:', currentCompositionName.value)
    initialNodes.value = nodes
    initialEdges.value = edges
    currentCompositionId.value = compositionId
    
    // 居中显示画布内容
    setTimeout(() => {
      if (canvasRef.value?.centerView) {
        canvasRef.value.centerView()
      }
    }, 500)
    
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
