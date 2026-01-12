<template>
  <div class="property-panel" v-if="show">
    <div class="property-panel__header">
      <h3 class="property-panel__title">
        {{ selectedNode ? '编辑资源' : '属性面板' }}
      </h3>
      <button class="property-panel__close" @click="$emit('close')">✕</button>
    </div>
    
    <div class="property-panel__content" v-if="selectedNode">
      <!-- 通用元数据 -->
      <CollapsibleSection title="📋 元数据 (Metadata)" :defaultExpanded="true">
        <div class="form-group">
          <label class="form-label">名称 *</label>
          <input
            type="text"
            class="form-input"
            v-model="localData.name"
            @input="emitUpdate('name', localData.name)"
            placeholder="my-resource"
          />
        </div>
        
        <!-- Namespace 是集群级资源，不需要显示 namespace 字段 -->
        <div class="form-group" v-if="nodeType !== 'namespace'">
          <label class="form-label">命名空间</label>
          <input
            type="text"
            class="form-input"
            v-model="localData.namespace"
            @input="emitUpdate('namespace', localData.namespace)"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Labels</label>
          <KeyValueEditor 
            v-model="localData.labels" 
            @update:modelValue="v => emitUpdate('labels', v)" 
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Annotations</label>
          <KeyValueEditor 
            v-model="localData.annotations" 
            @update:modelValue="v => emitUpdate('annotations', v)" 
          />
        </div>
      </CollapsibleSection>
      
      <!-- Deployment 特有属性 -->
      <template v-if="nodeType === 'deployment'">
        <CollapsibleSection title="🚀 Deployment 配置" :defaultExpanded="true">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">副本数</label>
              <input
                type="number"
                class="form-input"
                min="0"
                v-model.number="localData.replicas"
                @input="emitUpdate('replicas', localData.replicas)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">更新策略</label>
              <select 
                class="form-select" 
                v-model="localData.strategyType"
                @change="emitUpdate('strategyType', localData.strategyType)"
              >
                <option value="RollingUpdate">RollingUpdate</option>
                <option value="Recreate">Recreate</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="📦 Pod 配置">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">重启策略</label>
              <select 
                class="form-select" 
                v-model="localData.restartPolicy"
                @change="emitUpdate('restartPolicy', localData.restartPolicy)"
              >
                <option value="Always">Always</option>
                <option value="OnFailure">OnFailure</option>
                <option value="Never">Never</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">ServiceAccount</label>
              <input
                type="text"
                class="form-input"
                v-model="localData.serviceAccountName"
                @input="emitUpdate('serviceAccountName', localData.serviceAccountName)"
                placeholder="default"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Node Selector</label>
            <KeyValueEditor 
              v-model="localData.nodeSelector" 
              @update:modelValue="v => emitUpdate('nodeSelector', v)" 
            />
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="💾 Volumes">
          <VolumeEditor 
            v-model="localData.volumes" 
            @update:modelValue="v => emitUpdate('volumes', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
          <ContainerEditor 
            v-model="localData.containers" 
            :volumes="localData.volumes"
            @update:modelValue="v => emitUpdate('containers', v)" 
          />
        </CollapsibleSection>
      </template>
      
      <!-- StatefulSet 特有属性 -->
      <template v-if="nodeType === 'statefulset'">
        <CollapsibleSection title="📦 StatefulSet 配置" :defaultExpanded="true">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">副本数</label>
              <input
                type="number"
                class="form-input"
                min="0"
                v-model.number="localData.replicas"
                @input="emitUpdate('replicas', localData.replicas)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Service 名称 *</label>
              <input
                type="text"
                class="form-input"
                v-model="localData.serviceName"
                @input="emitUpdate('serviceName', localData.serviceName)"
                placeholder="headless-svc"
              />
            </div>
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="📦 Pod 配置">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">重启策略</label>
              <select 
                class="form-select" 
                v-model="localData.restartPolicy"
                @change="emitUpdate('restartPolicy', localData.restartPolicy)"
              >
                <option value="Always">Always</option>
                <option value="OnFailure">OnFailure</option>
                <option value="Never">Never</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">ServiceAccount</label>
              <input
                type="text"
                class="form-input"
                v-model="localData.serviceAccountName"
                @input="emitUpdate('serviceAccountName', localData.serviceAccountName)"
              />
            </div>
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="💾 Volumes">
          <VolumeEditor 
            v-model="localData.volumes" 
            @update:modelValue="v => emitUpdate('volumes', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
          <ContainerEditor 
            v-model="localData.containers" 
            :volumes="localData.volumes"
            @update:modelValue="v => emitUpdate('containers', v)" 
          />
        </CollapsibleSection>
      </template>
      
      <!-- Pod 特有属性 -->
      <template v-if="nodeType === 'pod'">
        <CollapsibleSection title="📦 Pod 配置" :defaultExpanded="true">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">重启策略</label>
              <select 
                class="form-select" 
                v-model="localData.restartPolicy"
                @change="emitUpdate('restartPolicy', localData.restartPolicy)"
              >
                <option value="Always">Always</option>
                <option value="OnFailure">OnFailure</option>
                <option value="Never">Never</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">ServiceAccount</label>
              <input
                type="text"
                class="form-input"
                v-model="localData.serviceAccountName"
                @input="emitUpdate('serviceAccountName', localData.serviceAccountName)"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Node Selector</label>
            <KeyValueEditor 
              v-model="localData.nodeSelector" 
              @update:modelValue="v => emitUpdate('nodeSelector', v)" 
            />
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="💾 Volumes">
          <VolumeEditor 
            v-model="localData.volumes" 
            @update:modelValue="v => emitUpdate('volumes', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
          <ContainerEditor 
            v-model="localData.containers" 
            :volumes="localData.volumes"
            @update:modelValue="v => emitUpdate('containers', v)" 
          />
        </CollapsibleSection>
      </template>
      
      <!-- Service 特有属性 -->
      <template v-if="nodeType === 'service'">
        <CollapsibleSection title="🔗 Service 配置" :defaultExpanded="true">
          <div class="form-group">
            <label class="form-label">类型</label>
            <select 
              class="form-select" 
              v-model="localData.serviceType"
              @change="emitUpdate('serviceType', localData.serviceType)"
            >
              <option value="ClusterIP">ClusterIP</option>
              <option value="NodePort">NodePort</option>
              <option value="LoadBalancer">LoadBalancer</option>
              <option value="ExternalName">ExternalName</option>
            </select>
          </div>
          
          <div class="form-group" v-if="localData.serviceType === 'ExternalName'">
            <label class="form-label">External Name</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.externalName"
              @input="emitUpdate('externalName', localData.externalName)"
              placeholder="my.database.example.com"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Selector</label>
            <KeyValueEditor 
              v-model="localData.selector" 
              @update:modelValue="v => emitUpdate('selector', v)" 
            />
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="🔌 端口配置" :defaultExpanded="true">
          <ServicePortEditor 
            v-model="localData.ports" 
            :showNodePort="localData.serviceType === 'NodePort' || localData.serviceType === 'LoadBalancer'"
            @update:modelValue="v => emitUpdate('ports', v)" 
          />
        </CollapsibleSection>
      </template>
      
      <!-- Ingress 特有属性 -->
      <template v-if="nodeType === 'ingress'">
        <CollapsibleSection title="🌐 Ingress 配置" :defaultExpanded="true">
          <div class="form-group">
            <label class="form-label">Ingress Class</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.ingressClassName"
              @input="emitUpdate('ingressClassName', localData.ingressClassName)"
              placeholder="nginx"
            />
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="📍 路由规则" :defaultExpanded="true">
          <IngressRuleEditor 
            v-model="localData.rules" 
            @update:modelValue="v => emitUpdate('rules', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🔐 TLS 配置">
          <div class="tls-list">
            <div v-for="(tls, index) in localData.tls" :key="index" class="tls-item">
              <div class="form-group">
                <label class="form-label">Hosts (每行一个)</label>
                <textarea
                  class="form-textarea"
                  v-model="tls.hostsText"
                  @input="updateTls"
                  rows="2"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Secret Name</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="tls.secretName"
                  @input="updateTls"
                />
              </div>
              <button class="btn-icon btn-remove" @click="removeTls(index)">✕</button>
            </div>
            <button class="btn btn-add" @click="addTls">+ 添加 TLS</button>
          </div>
        </CollapsibleSection>
      </template>
      
      <!-- ConfigMap 特有属性 -->
      <template v-if="nodeType === 'configmap'">
        <CollapsibleSection title="⚙️ 配置数据" :defaultExpanded="true">
          <KeyValueEditor 
            v-model="localData.configData" 
            @update:modelValue="v => emitUpdate('configData', v)" 
          />
        </CollapsibleSection>
      </template>
      
      <!-- Secret 特有属性 -->
      <template v-if="nodeType === 'secret'">
        <CollapsibleSection title="🔐 Secret 配置" :defaultExpanded="true">
          <div class="form-group">
            <label class="form-label">类型</label>
            <select 
              class="form-select" 
              v-model="localData.secretType"
              @change="emitUpdate('secretType', localData.secretType)"
            >
              <option value="Opaque">Opaque</option>
              <option value="kubernetes.io/tls">TLS</option>
              <option value="kubernetes.io/dockerconfigjson">Docker Config</option>
              <option value="kubernetes.io/basic-auth">Basic Auth</option>
              <option value="kubernetes.io/ssh-auth">SSH Auth</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">数据 (值会自动 Base64 编码)</label>
            <KeyValueEditor 
              v-model="localData.secretData" 
              @update:modelValue="v => emitUpdate('secretData', v)" 
            />
          </div>
        </CollapsibleSection>
      </template>
      
      <!-- PVC 特有属性 -->
      <template v-if="nodeType === 'pvc'">
        <CollapsibleSection title="💾 PVC 配置" :defaultExpanded="true">
          <div class="form-group">
            <label class="form-label">存储大小</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.storage"
              @input="emitUpdate('storage', localData.storage)"
              placeholder="10Gi"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">访问模式</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localData.accessModes" 
                  value="ReadWriteOnce"
                  @change="emitUpdate('accessModes', localData.accessModes)"
                />
                ReadWriteOnce
              </label>
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localData.accessModes" 
                  value="ReadOnlyMany"
                  @change="emitUpdate('accessModes', localData.accessModes)"
                />
                ReadOnlyMany
              </label>
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localData.accessModes" 
                  value="ReadWriteMany"
                  @change="emitUpdate('accessModes', localData.accessModes)"
                />
                ReadWriteMany
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">存储类</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.storageClassName"
              @input="emitUpdate('storageClassName', localData.storageClassName)"
              placeholder="留空使用默认"
            />
          </div>
        </CollapsibleSection>
      </template>
      
      <!-- Job 特有属性 -->
      <template v-if="nodeType === 'job'">
        <CollapsibleSection title="⚡ Job 配置" :defaultExpanded="true">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">完成次数</label>
              <input
                type="number"
                class="form-input"
                min="1"
                v-model.number="localData.completions"
                @input="emitUpdate('completions', localData.completions)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">并行数</label>
              <input
                type="number"
                class="form-input"
                min="1"
                v-model.number="localData.parallelism"
                @input="emitUpdate('parallelism', localData.parallelism)"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">重试次数</label>
            <input
              type="number"
              class="form-input"
              min="0"
              v-model.number="localData.backoffLimit"
              @input="emitUpdate('backoffLimit', localData.backoffLimit)"
            />
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="💾 Volumes">
          <VolumeEditor 
            v-model="localData.volumes" 
            @update:modelValue="v => emitUpdate('volumes', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
          <ContainerEditor 
            v-model="localData.containers" 
            :volumes="localData.volumes"
            @update:modelValue="v => emitUpdate('containers', v)" 
          />
        </CollapsibleSection>
      </template>
      
      <!-- CronJob 特有属性 -->
      <template v-if="nodeType === 'cronjob'">
        <CollapsibleSection title="⏰ CronJob 配置" :defaultExpanded="true">
          <div class="form-group">
            <label class="form-label">调度表达式 (Cron)</label>
            <input
              type="text"
              class="form-input"
              v-model="localData.schedule"
              @input="emitUpdate('schedule', localData.schedule)"
              placeholder="*/5 * * * *"
            />
            <small class="hint">分 时 日 月 周 (如: */5 * * * * 每5分钟)</small>
          </div>
          
          <div class="form-group">
            <label class="form-label">并发策略</label>
            <select 
              class="form-select" 
              v-model="localData.concurrencyPolicy"
              @change="emitUpdate('concurrencyPolicy', localData.concurrencyPolicy)"
            >
              <option value="Allow">Allow</option>
              <option value="Forbid">Forbid</option>
              <option value="Replace">Replace</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">重试次数</label>
            <input
              type="number"
              class="form-input"
              min="0"
              v-model.number="localData.backoffLimit"
              @input="emitUpdate('backoffLimit', localData.backoffLimit)"
            />
          </div>
        </CollapsibleSection>
        
        <CollapsibleSection title="💾 Volumes">
          <VolumeEditor 
            v-model="localData.volumes" 
            @update:modelValue="v => emitUpdate('volumes', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
          <ContainerEditor 
            v-model="localData.containers" 
            :volumes="localData.volumes"
            @update:modelValue="v => emitUpdate('containers', v)" 
          />
        </CollapsibleSection>
      </template>
      
      <!-- 删除按钮 -->
      <div class="delete-section">
        <button class="btn btn-danger" @click="$emit('delete')">
          🗑️ 删除资源
        </button>
      </div>
    </div>
    
    <div class="property-panel__content" v-else>
      <div class="property-panel__empty">
        <div class="property-panel__empty-icon">📋</div>
        <p>选择一个节点以编辑其属性</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import CollapsibleSection from './editors/CollapsibleSection.vue'
import KeyValueEditor from './editors/KeyValueEditor.vue'
import ContainerEditor from './editors/ContainerEditor.vue'
import VolumeEditor from './editors/VolumeEditor.vue'
import ServicePortEditor from './editors/ServicePortEditor.vue'
import IngressRuleEditor from './editors/IngressRuleEditor.vue'

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

const localData = ref({})

// 从 K8s 资源提取编辑数据
function extractData(node) {
  if (!node) return {}
  
  const resource = node.data?.resource || {}
  const spec = resource.spec || {}
  const metadata = resource.metadata || {}
  
  // 获取容器配置
  const getContainers = () => {
    if (spec.template?.spec?.containers) return spec.template.spec.containers
    if (spec.containers) return spec.containers
    if (spec.jobTemplate?.spec?.template?.spec?.containers) return spec.jobTemplate.spec.template.spec.containers
    return []
  }
  
  // 获取 Pod spec
  const getPodSpec = () => {
    if (spec.template?.spec) return spec.template.spec
    if (spec.jobTemplate?.spec?.template?.spec) return spec.jobTemplate.spec.template.spec
    return spec
  }
  
  const podSpec = getPodSpec()
  
  return {
    // 通用元数据
    name: node.data?.name || metadata.name || '',
    namespace: metadata.namespace || 'default',
    labels: metadata.labels || {},
    annotations: metadata.annotations || {},
    
    // Deployment/StatefulSet
    replicas: spec.replicas || 1,
    strategyType: spec.strategy?.type || 'RollingUpdate',
    serviceName: spec.serviceName || '',
    
    // Pod 配置  
    restartPolicy: podSpec.restartPolicy || 'Always',
    serviceAccountName: podSpec.serviceAccountName || '',
    nodeSelector: podSpec.nodeSelector || {},
    volumes: podSpec.volumes || [],
    containers: getContainers(),
    
    // Service
    serviceType: spec.type || 'ClusterIP',
    selector: spec.selector || {},
    ports: spec.ports || [],
    externalName: spec.externalName || '',
    
    // Ingress
    ingressClassName: spec.ingressClassName || '',
    rules: spec.rules || [],
    tls: (spec.tls || []).map(t => ({
      hostsText: (t.hosts || []).join('\n'),
      secretName: t.secretName || ''
    })),
    
    // ConfigMap
    configData: resource.data || {},
    
    // Secret
    secretType: resource.type || 'Opaque',
    secretData: resource.stringData || {},
    
    // PVC
    storage: spec.resources?.requests?.storage || '1Gi',
    accessModes: spec.accessModes || ['ReadWriteOnce'],
    storageClassName: spec.storageClassName || '',
    
    // Job
    completions: spec.completions || 1,
    parallelism: spec.parallelism || 1,
    backoffLimit: spec.backoffLimit ?? 4,
    
    // CronJob
    schedule: spec.schedule || '*/5 * * * *',
    concurrencyPolicy: spec.concurrencyPolicy || 'Allow'
  }
}

watch(() => props.selectedNode, (node) => {
  localData.value = extractData(node)
}, { immediate: true, deep: true })

function emitUpdate(field, value) {
  emit('update', { field, value })
}

// TLS 操作
function addTls() {
  localData.value.tls.push({ hostsText: '', secretName: '' })
}

function removeTls(index) {
  localData.value.tls.splice(index, 1)
  updateTls()
}

function updateTls() {
  const tls = localData.value.tls
    .filter(t => t.hostsText || t.secretName)
    .map(t => ({
      hosts: t.hostsText.split('\n').filter(h => h.trim()),
      secretName: t.secretName
    }))
  emitUpdate('tls', tls)
}
</script>

<style scoped>
/* 继承 main.css 的深色主题变量 */

.form-group {
  margin-bottom: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary);
}

.hint {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.tls-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tls-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  position: relative;
}

.tls-item .btn-remove {
  position: absolute;
  top: 8px;
  right: 8px;
}

.btn-add {
  padding: 8px 12px;
  font-size: 12px;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-default);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-add:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-primary);
  color: var(--accent-light);
}

.btn-icon {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: var(--danger);
  color: var(--danger);
}

.delete-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}
</style>
