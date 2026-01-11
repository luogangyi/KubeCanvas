<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <h2 class="sidebar__title">资源类型</h2>
    </div>
    
    <div class="sidebar__content">
      <!-- 工作负载 -->
      <div class="section-title">工作负载</div>
      <div
        v-for="resource in workloadResources"
        :key="resource.type"
        class="resource-card"
        :class="`resource-card--${resource.type}`"
        draggable="true"
        @dragstart="onDragStart($event, resource)"
      >
        <div class="resource-card__icon">{{ resource.icon }}</div>
        <div class="resource-card__info">
          <div class="resource-card__name">{{ resource.name }}</div>
          <div class="resource-card__desc">{{ resource.description }}</div>
        </div>
      </div>
      
      <!-- 网络 -->
      <div class="section-title" style="margin-top: 20px">网络</div>
      <div
        v-for="resource in networkResources"
        :key="resource.type"
        class="resource-card"
        :class="`resource-card--${resource.type}`"
        draggable="true"
        @dragstart="onDragStart($event, resource)"
      >
        <div class="resource-card__icon">{{ resource.icon }}</div>
        <div class="resource-card__info">
          <div class="resource-card__name">{{ resource.name }}</div>
          <div class="resource-card__desc">{{ resource.description }}</div>
        </div>
      </div>
      
      <!-- 配置 -->
      <div class="section-title" style="margin-top: 20px">配置</div>
      <div
        v-for="resource in configResources"
        :key="resource.type"
        class="resource-card"
        :class="`resource-card--${resource.type}`"
        draggable="true"
        @dragstart="onDragStart($event, resource)"
      >
        <div class="resource-card__icon">{{ resource.icon }}</div>
        <div class="resource-card__info">
          <div class="resource-card__name">{{ resource.name }}</div>
          <div class="resource-card__desc">{{ resource.description }}</div>
        </div>
      </div>
      
      <!-- 存储 -->
      <div class="section-title" style="margin-top: 20px">存储</div>
      <div
        v-for="resource in storageResources"
        :key="resource.type"
        class="resource-card"
        :class="`resource-card--${resource.type}`"
        draggable="true"
        @dragstart="onDragStart($event, resource)"
      >
        <div class="resource-card__icon">{{ resource.icon }}</div>
        <div class="resource-card__info">
          <div class="resource-card__name">{{ resource.name }}</div>
          <div class="resource-card__desc">{{ resource.description }}</div>
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
          <div class="composition-item__info">
            <div class="composition-item__name">{{ composition.name }}</div>
            <div class="composition-item__meta">{{ composition.resourceCount }} 个资源</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resourceTypes } from '../utils/resourceTemplates.js'

defineProps({
  compositions: {
    type: Array,
    default: () => []
  }
})

defineEmits(['loadComposition'])

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
}
</script>
