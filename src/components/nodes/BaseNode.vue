<template>
  <div
    class="k8s-node"
    :class="[`k8s-node--${props.type}`, { selected: props.selected }]"
  >
    <!-- 4个连接点：上、下、左、右 -->
    <Handle id="top" type="target" :position="Position.Top" />
    <Handle id="bottom" type="source" :position="Position.Bottom" />
    <Handle id="left" type="target" :position="Position.Left" />
    <Handle id="right" type="source" :position="Position.Right" />
    
    <div class="k8s-node__header">
      <div class="k8s-node__icon">{{ icon }}</div>
      <div class="k8s-node__title">
        <div class="k8s-node__type">{{ typeLabel }}</div>
        <div class="k8s-node__name">{{ props.data.name }}</div>
      </div>
    </div>
    
    <div class="k8s-node__body">
      <slot>
        <div
          v-for="(value, key) in displayProperties"
          :key="key"
          class="k8s-node__property"
        >
          <span class="k8s-node__property-label">{{ key }}</span>
          <span class="k8s-node__property-value">{{ value }}</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { getResourceTypeConfig } from '../../utils/resourceTemplates.js'

const props = defineProps({
  type: {
    type: String,
    required: true
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

const typeConfig = computed(() => getResourceTypeConfig(props.type))

const icon = computed(() => typeConfig.value?.icon || '📦')

const typeLabel = computed(() => typeConfig.value?.name || props.type)

const displayProperties = computed(() => {
  const resource = props.data.resource
  const properties = {}
  
  switch (props.type) {
    case 'deployment':
    case 'statefulset':
      properties['副本数'] = resource?.spec?.replicas || 1
      properties['镜像'] = resource?.spec?.template?.spec?.containers?.[0]?.image || 'N/A'
      break
    case 'service':
      properties['类型'] = resource?.spec?.type || 'ClusterIP'
      properties['端口'] = resource?.spec?.ports?.[0]?.port || 'N/A'
      break
    case 'pod':
      properties['镜像'] = resource?.spec?.containers?.[0]?.image || 'N/A'
      break
    case 'ingress':
      properties['主机'] = resource?.spec?.rules?.[0]?.host || 'N/A'
      break
    case 'configmap':
      properties['键数量'] = Object.keys(resource?.data || {}).length
      break
    case 'secret':
      properties['类型'] = resource?.type || 'Opaque'
      break
    case 'pvc':
      properties['存储'] = resource?.spec?.resources?.requests?.storage || 'N/A'
      break
    case 'job':
      properties['重试次数'] = resource?.spec?.backoffLimit || 4
      break
    case 'cronjob':
      properties['调度'] = resource?.spec?.schedule || 'N/A'
      break
  }
  
  return properties
})
</script>

<style scoped>
/* 连接点样式 - 更大更明显 */
:deep(.vue-flow__handle) {
  width: 14px;
  height: 14px;
  background: var(--primary-500);
  border: 3px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

:deep(.vue-flow__handle:hover) {
  background: var(--primary-600);
  transform: scale(1.3);
}

:deep(.vue-flow__handle-top) {
  top: -7px;
}

:deep(.vue-flow__handle-bottom) {
  bottom: -7px;
}

:deep(.vue-flow__handle-left) {
  left: -7px;
}

:deep(.vue-flow__handle-right) {
  right: -7px;
}
</style>
