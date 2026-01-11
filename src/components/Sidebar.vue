<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <h2 class="sidebar__title">资源类型</h2>
    </div>
    
    <div class="sidebar__content">
      <!-- 工作负载 -->
      <div class="section-title">工作负载</div>
      <div class="resource-list">
        <div
          v-for="resource in workloadResources"
          :key="resource.type"
          class="resource-card"
          :class="`resource-card--${resource.type}`"
          draggable="true"
          @dragstart="onDragStart($event, resource)"
          @mouseenter="showTooltip($event, resource.description)"
          @mouseleave="hideTooltip"
        >
          <div class="resource-card__icon">
            <img :src="getIconUrl(resource.icon)" :alt="resource.name" />
          </div>
          <div class="resource-card__name">{{ resource.name }}</div>
        </div>
      </div>
      
      <!-- 网络 -->
      <div class="section-title">网络</div>
      <div class="resource-list">
        <div
          v-for="resource in networkResources"
          :key="resource.type"
          class="resource-card"
          :class="`resource-card--${resource.type}`"
          draggable="true"
          @dragstart="onDragStart($event, resource)"
          @mouseenter="showTooltip($event, resource.description)"
          @mouseleave="hideTooltip"
        >
          <div class="resource-card__icon">
            <img :src="getIconUrl(resource.icon)" :alt="resource.name" />
          </div>
          <div class="resource-card__name">{{ resource.name }}</div>
        </div>
      </div>
      
      <!-- 配置 -->
      <div class="section-title">配置</div>
      <div class="resource-list">
        <div
          v-for="resource in configResources"
          :key="resource.type"
          class="resource-card"
          :class="`resource-card--${resource.type}`"
          draggable="true"
          @dragstart="onDragStart($event, resource)"
          @mouseenter="showTooltip($event, resource.description)"
          @mouseleave="hideTooltip"
        >
          <div class="resource-card__icon">
            <img :src="getIconUrl(resource.icon)" :alt="resource.name" />
          </div>
          <div class="resource-card__name">{{ resource.name }}</div>
        </div>
      </div>
      
      <!-- 存储 -->
      <div class="section-title">存储</div>
      <div class="resource-list">
        <div
          v-for="resource in storageResources"
          :key="resource.type"
          class="resource-card"
          :class="`resource-card--${resource.type}`"
          draggable="true"
          @dragstart="onDragStart($event, resource)"
          @mouseenter="showTooltip($event, resource.description)"
          @mouseleave="hideTooltip"
        >
          <div class="resource-card__icon">
            <img :src="getIconUrl(resource.icon)" :alt="resource.name" />
          </div>
          <div class="resource-card__name">{{ resource.name }}</div>
        </div>
      </div>
      
      <!-- 已保存的资源组合 -->
      <div class="composition-list" v-if="compositions.length > 0">
        <div class="section-title">已保存的组合</div>
        <div
          v-for="composition in compositions"
          :key="composition.id"
          class="composition-item"
          @click="$emit('loadComposition', composition.id)"
        >
          <div class="composition-item__icon">📋</div>
          <div class="composition-item__name">{{ composition.name }}</div>
          <div class="composition-item__count">{{ composition.resourceCount }}</div>
        </div>
      </div>
    </div>
    
    <!-- 自定义 Tooltip - 使用 Teleport 渲染到 body -->
    <Teleport to="body">
      <div 
        v-if="tooltip.visible" 
        class="resource-tooltip"
        :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
      >
        {{ tooltip.text }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { resourceTypes } from '../utils/resourceTemplates.js'

// 导入所有 SVG 图标
import deployIcon from '../assets/icons/deploy.svg'
import stsIcon from '../assets/icons/sts.svg'
import podIcon from '../assets/icons/pod.svg'
import svcIcon from '../assets/icons/svc.svg'
import ingIcon from '../assets/icons/ing.svg'
import cmIcon from '../assets/icons/cm.svg'
import secretIcon from '../assets/icons/secret.svg'
import pvcIcon from '../assets/icons/pvc.svg'
import jobIcon from '../assets/icons/job.svg'
import cronjobIcon from '../assets/icons/cronjob.svg'

const iconMap = {
  deploy: deployIcon,
  sts: stsIcon,
  pod: podIcon,
  svc: svcIcon,
  ing: ingIcon,
  cm: cmIcon,
  secret: secretIcon,
  pvc: pvcIcon,
  job: jobIcon,
  cronjob: cronjobIcon
}

defineProps({
  compositions: {
    type: Array,
    default: () => []
  }
})

defineEmits(['loadComposition'])

// 获取图标 URL
function getIconUrl(iconName) {
  return iconMap[iconName] || deployIcon
}

// Tooltip 状态
const tooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0
})

function showTooltip(event, text) {
  const rect = event.target.closest('.resource-card').getBoundingClientRect()
  tooltip.value = {
    visible: true,
    text,
    x: rect.right + 10,
    y: rect.top + rect.height / 2 - 14
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}

// 按类别分组资源
const workloadResources = computed(() => 
  resourceTypes.filter(r => r.category === 'workloads')
)

const networkResources = computed(() => 
  resourceTypes.filter(r => r.category === 'networking')
)

const configResources = computed(() => 
  resourceTypes.filter(r => r.category === 'config')
)

const storageResources = computed(() => 
  resourceTypes.filter(r => r.category === 'storage')
)

// 拖拽开始
function onDragStart(event, resource) {
  event.dataTransfer.setData('application/k8s-resource', JSON.stringify(resource))
  event.dataTransfer.effectAllowed = 'copy'
  hideTooltip()
}
</script>

<style scoped>
.sidebar {
  width: 180px;
  position: relative;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.resource-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: all var(--transition-fast);
  user-select: none;
  height: 44px;
}

.resource-card:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-primary);
  box-shadow: var(--glow-sm);
  transform: translateX(4px);
}

.resource-card:active {
  cursor: grabbing;
  transform: scale(0.98);
}

.resource-card__icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resource-card__icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.resource-card__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

/* 自定义 Tooltip */
.custom-tooltip {
  position: fixed;
  z-index: 1000;
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
</style>
