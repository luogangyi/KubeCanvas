<template>
  <div class="container-editor">
    <div 
      v-for="(container, index) in localContainers" 
      :key="index" 
      class="container-card"
    >
      <div class="container-header">
        <span class="container-index">#{{ index + 1 }}</span>
        <input
          type="text"
          class="form-input container-name-input"
          placeholder="容器名称"
          v-model="container.name"
          @input="emitChange"
        />
        <button 
          v-if="localContainers.length > 1"
          class="btn-icon btn-remove" 
          @click="removeContainer(index)" 
          title="删除容器"
        >
          ✕
        </button>
      </div>
      
      <div class="container-body">
        <!-- 基础信息 -->
        <CollapsibleSection title="基础信息" :defaultExpanded="true">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">镜像 *</label>
              <input
                type="text"
                class="form-input"
                placeholder="nginx:latest"
                v-model="container.image"
                @input="emitChange"
              />
            </div>
            <div class="form-group">
              <label class="form-label">拉取策略</label>
              <select class="form-select" v-model="container.imagePullPolicy" @change="emitChange">
                <option value="">默认</option>
                <option value="Always">Always</option>
                <option value="IfNotPresent">IfNotPresent</option>
                <option value="Never">Never</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label class="form-label">工作目录</label>
              <input
                type="text"
                class="form-input"
                placeholder="/app"
                v-model="container.workingDir"
                @input="emitChange"
              />
            </div>
          </div>
        </CollapsibleSection>
        
        <!-- 命令与参数 -->
        <CollapsibleSection title="命令与参数">
          <div class="form-group">
            <label class="form-label">Command (Entrypoint)</label>
            <ListEditor v-model="container.command" placeholder="/bin/sh" @update:modelValue="emitChange" />
          </div>
          <div class="form-group">
            <label class="form-label">Args (Arguments)</label>
            <ListEditor v-model="container.args" placeholder="-c" @update:modelValue="emitChange" />
          </div>
        </CollapsibleSection>
        
        <!-- 端口 -->
        <CollapsibleSection title="端口" :badge="container.ports?.length || 0">
          <PortEditor v-model="container.ports" @update:modelValue="emitChange" />
        </CollapsibleSection>
        
        <!-- 环境变量 -->
        <CollapsibleSection title="环境变量" :badge="container.env?.length || 0">
          <EnvEditor v-model="container.env" @update:modelValue="emitChange" />
        </CollapsibleSection>
        
        <!-- 资源限制 -->
        <CollapsibleSection title="资源限制">
          <ResourceEditor v-model="container.resources" @update:modelValue="emitChange" />
        </CollapsibleSection>
        
        <!-- 健康检查 -->
        <CollapsibleSection title="健康检查">
          <div class="probe-tabs">
            <button 
              class="probe-tab" 
              :class="{ active: activeProbeTab === 'liveness' }"
              @click="activeProbeTab = 'liveness'"
            >
              存活探针
            </button>
            <button 
              class="probe-tab" 
              :class="{ active: activeProbeTab === 'readiness' }"
              @click="activeProbeTab = 'readiness'"
            >
              就绪探针
            </button>
            <button 
              class="probe-tab" 
              :class="{ active: activeProbeTab === 'startup' }"
              @click="activeProbeTab = 'startup'"
            >
              启动探针
            </button>
          </div>
          <div class="probe-content">
            <ProbeEditor 
              v-if="activeProbeTab === 'liveness'"
              v-model="container.livenessProbe" 
              @update:modelValue="emitChange" 
            />
            <ProbeEditor 
              v-if="activeProbeTab === 'readiness'"
              v-model="container.readinessProbe" 
              @update:modelValue="emitChange" 
            />
            <ProbeEditor 
              v-if="activeProbeTab === 'startup'"
              v-model="container.startupProbe" 
              @update:modelValue="emitChange" 
            />
          </div>
        </CollapsibleSection>
        
        <!-- 挂载 -->
        <CollapsibleSection title="Volume 挂载" :badge="container.volumeMounts?.length || 0">
          <VolumeMountEditor 
            v-model="container.volumeMounts" 
            :volumes="volumes"
            @update:modelValue="emitChange" 
          />
        </CollapsibleSection>
      </div>
    </div>
    
    <button class="btn btn-add-container" @click="addContainer">
      <span>+ 添加容器</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import ListEditor from './ListEditor.vue'
import PortEditor from './PortEditor.vue'
import EnvEditor from './EnvEditor.vue'
import ResourceEditor from './ResourceEditor.vue'
import ProbeEditor from './ProbeEditor.vue'
import VolumeMountEditor from './VolumeMountEditor.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  volumes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const localContainers = ref([])
const activeProbeTab = ref('liveness')

const defaultContainer = () => ({
  name: '',
  image: '',
  imagePullPolicy: '',
  workingDir: '',
  command: [],
  args: [],
  ports: [],
  env: [],
  resources: {},
  livenessProbe: null,
  readinessProbe: null,
  startupProbe: null,
  volumeMounts: []
})

watch(() => props.modelValue, (newVal) => {
  localContainers.value = (newVal || []).map(c => ({
    name: c.name || '',
    image: c.image || '',
    imagePullPolicy: c.imagePullPolicy || '',
    workingDir: c.workingDir || '',
    command: c.command || [],
    args: c.args || [],
    ports: c.ports || [],
    env: c.env || [],
    resources: c.resources || {},
    livenessProbe: c.livenessProbe || null,
    readinessProbe: c.readinessProbe || null,
    startupProbe: c.startupProbe || null,
    volumeMounts: c.volumeMounts || []
  }))
  
  if (localContainers.value.length === 0) {
    localContainers.value = [defaultContainer()]
  }
}, { immediate: true, deep: true })

function addContainer() {
  localContainers.value.push(defaultContainer())
  emitChange()
}

function removeContainer(index) {
  localContainers.value.splice(index, 1)
  emitChange()
}

function emitChange() {
  const containers = localContainers.value
    .filter(c => c.name && c.image)
    .map(c => {
      const result = {
        name: c.name,
        image: c.image
      }
      if (c.imagePullPolicy) result.imagePullPolicy = c.imagePullPolicy
      if (c.workingDir) result.workingDir = c.workingDir
      if (c.command?.length) result.command = c.command
      if (c.args?.length) result.args = c.args
      if (c.ports?.length) result.ports = c.ports
      if (c.env?.length) result.env = c.env
      if (c.resources && Object.keys(c.resources).length) result.resources = c.resources
      if (c.livenessProbe) result.livenessProbe = c.livenessProbe
      if (c.readinessProbe) result.readinessProbe = c.readinessProbe
      if (c.startupProbe) result.startupProbe = c.startupProbe
      if (c.volumeMounts?.length) result.volumeMounts = c.volumeMounts
      return result
    })
  emit('update:modelValue', containers)
}
</script>

<style scoped>
.container-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.container-card {
  border: 2px solid var(--gray-200);
  border-radius: 12px;
  overflow: hidden;
  background: white;
}

.container-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
  border-bottom: 1px solid var(--gray-200);
}

.container-index {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary-600);
  background: white;
  padding: 4px 8px;
  border-radius: 6px;
}

.container-name-input {
  flex: 1;
  font-weight: 600;
}

.container-body {
  padding: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.probe-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.probe-tab {
  flex: 1;
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--gray-200);
  background: var(--gray-50);
  color: var(--gray-600);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.probe-tab:hover {
  background: var(--gray-100);
}

.probe-tab.active {
  background: var(--primary-500);
  border-color: var(--primary-500);
  color: white;
}

.probe-content {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-remove {
  background: white;
  color: var(--gray-500);
}

.btn-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.btn-add-container {
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  background: var(--gray-50);
  border: 2px dashed var(--gray-300);
  color: var(--gray-600);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-container:hover {
  background: var(--primary-50);
  border-color: var(--primary-300);
  color: var(--primary-600);
}
</style>
