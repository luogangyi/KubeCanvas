<template>
  <div class="property-panel" v-if="show">
    <div class="property-panel__header">
      <h3 class="property-panel__title">
        {{ selectedNode ? '编辑资源' : '属性面板' }}
      </h3>
      <button class="property-panel__close" @click="$emit('close')">✕</button>
    </div>
    
    <div class="property-panel__content">
      <template v-if="selectedNode">
        <!-- 基本信息 -->
        <div class="section-title">基本信息</div>
        
        <div class="form-group">
          <label class="form-label">名称</label>
          <input
            type="text"
            class="form-input"
            v-model="localData.name"
            @input="updateName"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">命名空间</label>
          <input
            type="text"
            class="form-input"
            v-model="localData.namespace"
            @input="updateNamespace"
          />
        </div>
        
        <div class="divider"></div>
        
        <!-- Deployment/StatefulSet 特有属性 -->
        <template v-if="['deployment', 'statefulset'].includes(nodeType)">
          <div class="section-title">容器配置</div>
          
          <div class="form-group">
            <label class="form-label">副本数</label>
            <input
              type="number"
              class="form-input"
              min="1"
              v-model.number="localData.replicas"
              @input="updateReplicas"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">镜像</label>
            <input
              type="text"
              class="form-input"
              placeholder="nginx:latest"
              v-model="localData.image"
              @input="updateImage"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">容器端口</label>
            <input
              type="number"
              class="form-input"
              v-model.number="localData.containerPort"
              @input="updateContainerPort"
            />
          </div>
        </template>
        
        <!-- Service 特有属性 -->
        <template v-if="nodeType === 'service'">
          <div class="section-title">服务配置</div>
          
          <div class="form-group">
            <label class="form-label">类型</label>
            <select class="form-select" v-model="localData.serviceType" @change="updateServiceType">
              <option value="ClusterIP">ClusterIP</option>
              <option value="NodePort">NodePort</option>
              <option value="LoadBalancer">LoadBalancer</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">端口</label>
            <input
              type="number"
              class="form-input"
              v-model.number="localData.port"
              @input="updatePort"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">目标端口</label>
            <input
              type="number"
              class="form-input"
              v-model.number="localData.targetPort"
              @input="updateTargetPort"
            />
          </div>
          
          <div class="form-group" v-if="localData.serviceType === 'NodePort'">
            <label class="form-label">NodePort (30000-32767)</label>
            <input
              type="number"
              class="form-input"
              min="30000"
              max="32767"
              v-model.number="localData.nodePort"
              @input="updateNodePort"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Selector</label>
            <textarea
              class="form-textarea"
              v-model="localData.selectorText"
              @input="updateSelector"
              placeholder="app: my-app"
            ></textarea>
            <small style="color: var(--gray-500);">YAML 格式的标签选择器</small>
          </div>
        </template>
        
        <!-- Pod 特有属性 -->
        <template v-if="nodeType === 'pod'">
          <div class="section-title">容器配置</div>
          
          <div class="form-group">
            <label class="form-label">镜像</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.image"
              @input="updateImage"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">容器端口</label>
            <input
              type="number"
              class="form-input"
              v-model.number="localData.containerPort"
              @input="updateContainerPort"
            />
          </div>
        </template>
        
        <!-- Ingress 特有属性 -->
        <template v-if="nodeType === 'ingress'">
          <div class="section-title">路由配置</div>
          
          <div class="form-group">
            <label class="form-label">主机名</label>
            <input
              type="text"
              class="form-input"
              placeholder="example.com"
              v-model="localData.host"
              @input="updateHost"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">路径</label>
            <input
              type="text"
              class="form-input"
              placeholder="/"
              v-model="localData.path"
              @input="updatePath"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">后端服务名</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.serviceName"
              @input="updateServiceName"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">后端服务端口</label>
            <input
              type="number"
              class="form-input"
              v-model.number="localData.servicePort"
              @input="updateServicePort"
            />
          </div>
        </template>
        
        <!-- ConfigMap 特有属性 -->
        <template v-if="nodeType === 'configmap'">
          <div class="section-title">配置数据</div>
          
          <div class="form-group">
            <label class="form-label">数据 (YAML 格式)</label>
            <textarea
              class="form-textarea"
              style="min-height: 200px"
              v-model="localData.configData"
              @input="updateConfigData"
              placeholder="key1: value1&#10;key2: value2"
            ></textarea>
          </div>
        </template>
        
        <!-- Secret 特有属性 -->
        <template v-if="nodeType === 'secret'">
          <div class="section-title">密钥配置</div>
          
          <div class="form-group">
            <label class="form-label">类型</label>
            <select class="form-select" v-model="localData.secretType" @change="updateSecretType">
              <option value="Opaque">Opaque</option>
              <option value="kubernetes.io/dockerconfigjson">Docker Config</option>
              <option value="kubernetes.io/tls">TLS</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">数据 (YAML 格式)</label>
            <textarea
              class="form-textarea"
              style="min-height: 150px"
              v-model="localData.secretData"
              @input="updateSecretData"
              placeholder="username: admin&#10;password: secret"
            ></textarea>
          </div>
        </template>
        
        <!-- PVC 特有属性 -->
        <template v-if="nodeType === 'pvc'">
          <div class="section-title">存储配置</div>
          
          <div class="form-group">
            <label class="form-label">存储大小</label>
            <input
              type="text"
              class="form-input"
              placeholder="1Gi"
              v-model="localData.storage"
              @input="updateStorage"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">访问模式</label>
            <select class="form-select" v-model="localData.accessMode" @change="updateAccessMode">
              <option value="ReadWriteOnce">ReadWriteOnce</option>
              <option value="ReadOnlyMany">ReadOnlyMany</option>
              <option value="ReadWriteMany">ReadWriteMany</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">存储类 (可选)</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.storageClassName"
              @input="updateStorageClass"
            />
          </div>
        </template>
        
        <!-- Job 特有属性 -->
        <template v-if="nodeType === 'job'">
          <div class="section-title">任务配置</div>
          
          <div class="form-group">
            <label class="form-label">镜像</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.image"
              @input="updateImage"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">命令</label>
            <input
              type="text"
              class="form-input"
              placeholder="echo Hello"
              v-model="localData.command"
              @input="updateCommand"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">重试次数</label>
            <input
              type="number"
              class="form-input"
              min="0"
              v-model.number="localData.backoffLimit"
              @input="updateBackoffLimit"
            />
          </div>
        </template>
        
        <!-- CronJob 特有属性 -->
        <template v-if="nodeType === 'cronjob'">
          <div class="section-title">定时任务配置</div>
          
          <div class="form-group">
            <label class="form-label">调度 (Cron 表达式)</label>
            <input
              type="text"
              class="form-input"
              placeholder="*/5 * * * *"
              v-model="localData.schedule"
              @input="updateSchedule"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">镜像</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.image"
              @input="updateImage"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">命令</label>
            <input
              type="text"
              class="form-input"
              placeholder="echo Hello"
              v-model="localData.command"
              @input="updateCommand"
            />
          </div>
        </template>
        
        <div class="divider"></div>
        
        <!-- 删除按钮 -->
        <button class="btn btn-danger" style="width: 100%" @click="$emit('delete')">
          删除资源
        </button>
      </template>
      
      <template v-else>
        <div class="property-panel__empty">
          <div class="property-panel__empty-icon">📋</div>
          <p>选择一个节点以编辑其属性</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  selectedNode: {
    type: Object,
    default: null
  },
  show: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update', 'close', 'delete'])

const nodeType = computed(() => props.selectedNode?.type || '')

// 本地数据
const localData = ref({})

// 监听选中节点变化，初始化本地数据
watch(() => props.selectedNode, (node) => {
  if (node) {
    const resource = node.data?.resource || {}
    localData.value = {
      name: node.data?.name || '',
      namespace: resource.metadata?.namespace || 'default',
      // Deployment/StatefulSet
      replicas: resource.spec?.replicas || 1,
      image: resource.spec?.template?.spec?.containers?.[0]?.image || 
             resource.spec?.containers?.[0]?.image || 
             resource.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.image || 'nginx:latest',
      containerPort: resource.spec?.template?.spec?.containers?.[0]?.ports?.[0]?.containerPort || 
                     resource.spec?.containers?.[0]?.ports?.[0]?.containerPort || 80,
      // Service
      serviceType: resource.spec?.type || 'ClusterIP',
      port: resource.spec?.ports?.[0]?.port || 80,
      targetPort: resource.spec?.ports?.[0]?.targetPort || 80,
      nodePort: resource.spec?.ports?.[0]?.nodePort || 30000,
      selectorText: resource.spec?.selector ? 
        Object.entries(resource.spec.selector).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
      // Ingress
      host: resource.spec?.rules?.[0]?.host || '',
      path: resource.spec?.rules?.[0]?.http?.paths?.[0]?.path || '/',
      serviceName: resource.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.name || '',
      servicePort: resource.spec?.rules?.[0]?.http?.paths?.[0]?.backend?.service?.port?.number || 80,
      // ConfigMap
      configData: resource.data ? 
        Object.entries(resource.data).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
      // Secret
      secretType: resource.type || 'Opaque',
      secretData: resource.stringData ? 
        Object.entries(resource.stringData).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
      // PVC
      storage: resource.spec?.resources?.requests?.storage || '1Gi',
      accessMode: resource.spec?.accessModes?.[0] || 'ReadWriteOnce',
      storageClassName: resource.spec?.storageClassName || '',
      // Job
      backoffLimit: resource.spec?.backoffLimit || 4,
      // CronJob
      schedule: resource.spec?.schedule || '*/5 * * * *',
      command: resource.spec?.template?.spec?.containers?.[0]?.command?.join(' ') ||
               resource.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.command?.join(' ') || ''
    }
  }
}, { immediate: true })

// 更新方法
function emitUpdate(field, value) {
  emit('update', { field, value })
}

function updateName() { emitUpdate('name', localData.value.name) }
function updateNamespace() { emitUpdate('namespace', localData.value.namespace) }
function updateReplicas() { emitUpdate('replicas', localData.value.replicas) }
function updateImage() { emitUpdate('image', localData.value.image) }
function updateContainerPort() { emitUpdate('containerPort', localData.value.containerPort) }
function updateServiceType() { emitUpdate('serviceType', localData.value.serviceType) }
function updatePort() { emitUpdate('port', localData.value.port) }
function updateTargetPort() { emitUpdate('targetPort', localData.value.targetPort) }
function updateNodePort() { emitUpdate('nodePort', localData.value.nodePort) }
function updateSelector() { emitUpdate('selector', localData.value.selectorText) }
function updateHost() { emitUpdate('host', localData.value.host) }
function updatePath() { emitUpdate('path', localData.value.path) }
function updateServiceName() { emitUpdate('serviceName', localData.value.serviceName) }
function updateServicePort() { emitUpdate('servicePort', localData.value.servicePort) }
function updateConfigData() { emitUpdate('configData', localData.value.configData) }
function updateSecretType() { emitUpdate('secretType', localData.value.secretType) }
function updateSecretData() { emitUpdate('secretData', localData.value.secretData) }
function updateStorage() { emitUpdate('storage', localData.value.storage) }
function updateAccessMode() { emitUpdate('accessMode', localData.value.accessMode) }
function updateStorageClass() { emitUpdate('storageClassName', localData.value.storageClassName) }
function updateBackoffLimit() { emitUpdate('backoffLimit', localData.value.backoffLimit) }
function updateSchedule() { emitUpdate('schedule', localData.value.schedule) }
function updateCommand() { emitUpdate('command', localData.value.command) }
</script>
