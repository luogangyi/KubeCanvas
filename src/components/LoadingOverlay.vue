<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="loading-overlay">
        <div class="loading-container" :class="{ success: isSuccess }">
          <!-- 加载中状态 -->
          <template v-if="!isSuccess">
            <div class="loading-spinner">
              <svg class="spinner-icon" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
              </svg>
            </div>
            <div class="loading-text">{{ message }}</div>
            <div class="loading-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
              </div>
            </div>
          </template>
          
          <!-- 成功状态 -->
          <template v-else>
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="success-text">{{ successMessage }}</div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: '处理中...'
  },
  successMessage: {
    type: String,
    default: '操作成功！'
  },
  progress: {
    type: Number,
    default: 0
  },
  isSuccess: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.loading-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 20px 32px;
  text-align: center;
  box-shadow: var(--shadow-xl);
  min-width: 180px;
}

.loading-container.success {
  border-color: #22c55e;
}

/* 加载动画 */
.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
}

.spinner-icon {
  animation: rotate 1.4s linear infinite;
}

.spinner-icon .path {
  stroke: var(--accent-primary);
  stroke-linecap: round;
  animation: dash 1.4s ease-in-out infinite;
}

@keyframes rotate {
  100% { transform: rotate(360deg); }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

.loading-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

/* 进度条 */
.loading-progress {
  width: 100%;
}

.progress-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-light));
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* 成功状态 */
.success-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  background: rgba(34, 197, 94, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #22c55e;
  animation: scaleIn 0.3s ease;
}

.success-icon svg {
  width: 24px;
  height: 24px;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.success-text {
  font-size: 13px;
  font-weight: 600;
  color: #22c55e;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
