<template>
  <div class="probe-editor">
    <div class="probe-type">
      <label class="form-label">检测方式</label>
      <select class="form-select" v-model="local.type" @change="onTypeChange">
        <option value="">不启用</option>
        <option value="httpGet">HTTP GET</option>
        <option value="tcpSocket">TCP Socket</option>
        <option value="exec">Exec Command</option>
      </select>
    </div>
    
    <template v-if="local.type">
      <!-- HTTP GET -->
      <div v-if="local.type === 'httpGet'" class="probe-config">
        <div class="config-row">
          <div class="config-field">
            <label class="config-label">路径</label>
            <input
              type="text"
              class="form-input"
              placeholder="/healthz"
              v-model="local.httpGet.path"
              @input="emitChange"
            />
          </div>
          <div class="config-field">
            <label class="config-label">端口</label>
            <input
              type="number"
              class="form-input"
              placeholder="8080"
              v-model.number="local.httpGet.port"
              @input="emitChange"
            />
          </div>
          <div class="config-field">
            <label class="config-label">Scheme</label>
            <select class="form-select" v-model="local.httpGet.scheme" @change="emitChange">
              <option value="HTTP">HTTP</option>
              <option value="HTTPS">HTTPS</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- TCP Socket -->
      <div v-if="local.type === 'tcpSocket'" class="probe-config">
        <div class="config-row">
          <div class="config-field">
            <label class="config-label">端口</label>
            <input
              type="number"
              class="form-input"
              placeholder="8080"
              v-model.number="local.tcpSocket.port"
              @input="emitChange"
            />
          </div>
        </div>
      </div>
      
      <!-- Exec -->
      <div v-if="local.type === 'exec'" class="probe-config">
        <div class="config-field">
          <label class="config-label">命令 (每行一个参数)</label>
          <textarea
            class="form-textarea"
            placeholder="/bin/sh&#10;-c&#10;cat /tmp/healthy"
            v-model="local.exec.commandText"
            @input="emitChange"
            rows="3"
          ></textarea>
        </div>
      </div>
      
      <!-- 通用参数 -->
      <div class="probe-params">
        <div class="param-row">
          <div class="param-field">
            <label class="param-label">初始延迟 (秒)</label>
            <input
              type="number"
              class="form-input"
              min="0"
              v-model.number="local.initialDelaySeconds"
              @input="emitChange"
            />
          </div>
          <div class="param-field">
            <label class="param-label">检测间隔 (秒)</label>
            <input
              type="number"
              class="form-input"
              min="1"
              v-model.number="local.periodSeconds"
              @input="emitChange"
            />
          </div>
          <div class="param-field">
            <label class="param-label">超时 (秒)</label>
            <input
              type="number"
              class="form-input"
              min="1"
              v-model.number="local.timeoutSeconds"
              @input="emitChange"
            />
          </div>
          <div class="param-field">
            <label class="param-label">失败阈值</label>
            <input
              type="number"
              class="form-input"
              min="1"
              v-model.number="local.failureThreshold"
              @input="emitChange"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const defaultLocal = () => ({
  type: '',
  httpGet: { path: '/healthz', port: 8080, scheme: 'HTTP' },
  tcpSocket: { port: 8080 },
  exec: { commandText: '' },
  initialDelaySeconds: 0,
  periodSeconds: 10,
  timeoutSeconds: 1,
  failureThreshold: 3
})

const local = ref(defaultLocal())

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    local.value = defaultLocal()
    return
  }
  
  local.value = {
    type: newVal.httpGet ? 'httpGet' : newVal.tcpSocket ? 'tcpSocket' : newVal.exec ? 'exec' : '',
    httpGet: {
      path: newVal.httpGet?.path || '/healthz',
      port: newVal.httpGet?.port || 8080,
      scheme: newVal.httpGet?.scheme || 'HTTP'
    },
    tcpSocket: {
      port: newVal.tcpSocket?.port || 8080
    },
    exec: {
      commandText: (newVal.exec?.command || []).join('\n')
    },
    initialDelaySeconds: newVal.initialDelaySeconds || 0,
    periodSeconds: newVal.periodSeconds || 10,
    timeoutSeconds: newVal.timeoutSeconds || 1,
    failureThreshold: newVal.failureThreshold || 3
  }
}, { immediate: true, deep: true })

function onTypeChange() {
  emitChange()
}

function emitChange() {
  if (!local.value.type) {
    emit('update:modelValue', undefined)
    return
  }
  
  const result = {
    initialDelaySeconds: local.value.initialDelaySeconds,
    periodSeconds: local.value.periodSeconds,
    timeoutSeconds: local.value.timeoutSeconds,
    failureThreshold: local.value.failureThreshold
  }
  
  switch (local.value.type) {
    case 'httpGet':
      result.httpGet = {
        path: local.value.httpGet.path,
        port: local.value.httpGet.port,
        scheme: local.value.httpGet.scheme
      }
      break
    case 'tcpSocket':
      result.tcpSocket = {
        port: local.value.tcpSocket.port
      }
      break
    case 'exec':
      result.exec = {
        command: local.value.exec.commandText.split('\n').filter(l => l.trim())
      }
      break
  }
  
  emit('update:modelValue', result)
}
</script>

<style scoped>
.probe-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.probe-type {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.probe-config {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

.config-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 80px;
}

.config-label {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 500;
}

.config-field .form-input,
.config-field .form-select,
.config-field .form-textarea {
  font-size: 13px;
  padding: 6px 8px;
}

.probe-params {
  padding: 12px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

.param-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.param-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-label {
  font-size: 10px;
  color: var(--gray-500);
  font-weight: 500;
}

.param-field .form-input {
  font-size: 13px;
  padding: 6px 8px;
}
</style>
