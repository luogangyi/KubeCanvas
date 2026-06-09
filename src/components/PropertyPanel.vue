<template>
  <div class="property-panel" v-if="show">
    <div class="property-panel__header">
      <h3 class="property-panel__title">
        {{ selectedNode ? '编辑资源' : '属性面板' }}
      </h3>
      <button class="property-panel__close" @click="$emit('close')">✕</button>
    </div>
    
    <div class="property-panel__content" v-if="selectedNode">
      <!-- Edit Mode 提示 -->
      <div v-if="editMode === 'edit'" class="edit-mode-banner">
        🔒 编辑模式：部分字段不可修改
      </div>
      
      <!-- 通用元数据 -->
      <CollapsibleSection title="📋 元数据 (Metadata)" :defaultExpanded="true">
        <div class="form-group">
          <label class="form-label">名称 *</label>
          <LockedInput
            type="text"
            v-model="localData.name"
            :editability="fieldLocking.checkField('name')"
            placeholder="my-resource"
            @update:modelValue="v => emitUpdate('name', v)"
          />
        </div>
        
        <!-- Namespace 是集群级资源，不需要显示 namespace 字段 -->
        <div class="form-group" v-if="nodeType !== 'namespace'">
          <label class="form-label">命名空间</label>
          <LockedInput
            type="text"
            v-model="localData.namespace"
            :editability="fieldLocking.checkField('namespace')"
            @update:modelValue="v => emitUpdate('namespace', v)"
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
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">
                <input 
                  type="checkbox" 
                  v-model="localData.hostNetwork"
                  @change="emitUpdate('hostNetwork', localData.hostNetwork)"
                />
                Host Network
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">DNS 策略</label>
              <select 
                class="form-select" 
                v-model="localData.dnsPolicy"
                @change="emitUpdate('dnsPolicy', localData.dnsPolicy)"
              >
                <option value="ClusterFirst">ClusterFirst</option>
                <option value="ClusterFirstWithHostNet">ClusterFirstWithHostNet</option>
                <option value="Default">Default</option>
                <option value="None">None</option>
              </select>
            </div>
          </div>
          
          
          <CollapsibleSection title="Pod 模板配置 (Pod Template)" :defaultExpanded="true">
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
            
            <div class="form-group">
              <label class="form-label">ImagePullSecrets</label>
              <ListEditor 
                v-model="localData.imagePullSecrets"
                placeholder="secret-name"
                @update:modelValue="v => emitUpdate('imagePullSecrets', v)" 
              />
            </div>
            
            <CollapsibleSection title="🔐 Pod 安全上下文">
              <PodSecurityContextEditor 
                v-model="localData.securityContext"
                @update:modelValue="v => emitUpdate('securityContext', v)" 
              />
            </CollapsibleSection>
          
            <CollapsibleSection title="💾 Volumes">
              <VolumeEditor 
                v-model="localData.volumes" 
                @update:modelValue="v => emitUpdate('volumes', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="🚀 Init Containers" :badge="localData.initContainers?.length || 0">
              <ContainerEditor 
                v-model="localData.initContainers" 
                :volumes="localData.volumes"
                :isInitContainer="true"
                @update:modelValue="v => emitUpdate('initContainers', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
              <ContainerEditor 
                v-model="localData.containers" 
                :volumes="localData.volumes"
                @update:modelValue="v => emitUpdate('containers', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="🎯 Tolerations" :badge="localData.tolerations?.length || 0">
              <TolerationsEditor 
                v-model="localData.tolerations"
                @update:modelValue="v => emitUpdate('tolerations', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="📍 Affinity">
              <AffinityEditor 
                v-model="localData.affinity"
                @update:modelValue="v => emitUpdate('affinity', v)" 
              />
            </CollapsibleSection>
          </CollapsibleSection>
        </CollapsibleSection>
      </template>
      
      <!-- DaemonSet 特有属性 -->
      <template v-if="nodeType === 'daemonset'">
        <CollapsibleSection title="🔄 DaemonSet 配置" :defaultExpanded="true">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">更新策略</label>
              <select 
                class="form-select" 
                v-model="localData.strategyType"
                @change="emitUpdate('strategyType', localData.strategyType)"
              >
                <option value="RollingUpdate">RollingUpdate</option>
                <option value="OnDelete">OnDelete</option>
              </select>
            </div>
          </div>
          
          <CollapsibleSection title="Pod 模板配置 (Pod Template)" :defaultExpanded="true">
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

          <div class="form-group">
            <label class="form-label">ImagePullSecrets</label>
            <ListEditor 
              v-model="localData.imagePullSecrets"
              placeholder="secret-name"
              @update:modelValue="v => emitUpdate('imagePullSecrets', v)" 
            />
          </div>
          
          <CollapsibleSection title="🔐 Pod 安全上下文">
            <PodSecurityContextEditor 
              v-model="localData.securityContext"
              @update:modelValue="v => emitUpdate('securityContext', v)" 
            />
          </CollapsibleSection>
        
        <CollapsibleSection title="💾 Volumes">
          <VolumeEditor 
            v-model="localData.volumes" 
            @update:modelValue="v => emitUpdate('volumes', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🚀 Init Containers" :badge="localData.initContainers?.length || 0">
          <ContainerEditor 
            v-model="localData.initContainers" 
            :volumes="localData.volumes"
            :isInitContainer="true"
            @update:modelValue="v => emitUpdate('initContainers', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
          <ContainerEditor 
            v-model="localData.containers" 
            :volumes="localData.volumes"
            @update:modelValue="v => emitUpdate('containers', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🎯 Tolerations" :badge="localData.tolerations?.length || 0">
          <TolerationsEditor 
            v-model="localData.tolerations"
            @update:modelValue="v => emitUpdate('tolerations', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="📍 Affinity">
          <AffinityEditor 
            v-model="localData.affinity"
            @update:modelValue="v => emitUpdate('affinity', v)" 
          />
          </CollapsibleSection>
          </CollapsibleSection>
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
              <label class="form-label">Service 名称 * 🔒</label>
              <LockedInput
                type="text"
                v-model="localData.serviceName"
                :editability="fieldLocking.checkField('serviceName')"
                placeholder="headless-svc"
                @update:modelValue="v => emitUpdate('serviceName', v)"
              />
            </div>
          </div>

          
          <CollapsibleSection title="Pod 模板配置 (Pod Template)" :defaultExpanded="true">
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

            <div class="form-group">
              <label class="form-label">ImagePullSecrets</label>
              <ListEditor 
                v-model="localData.imagePullSecrets"
                placeholder="secret-name"
                @update:modelValue="v => emitUpdate('imagePullSecrets', v)" 
              />
            </div>
            
            <CollapsibleSection title="🔐 Pod 安全上下文">
              <PodSecurityContextEditor 
                v-model="localData.securityContext"
                @update:modelValue="v => emitUpdate('securityContext', v)" 
              />
            </CollapsibleSection>
          
            <CollapsibleSection title="💾 Volumes">
              <VolumeEditor 
                v-model="localData.volumes" 
                @update:modelValue="v => emitUpdate('volumes', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="🚀 Init Containers" :badge="localData.initContainers?.length || 0">
              <ContainerEditor 
                v-model="localData.initContainers" 
                :volumes="localData.volumes"
                :isInitContainer="true"
                @update:modelValue="v => emitUpdate('initContainers', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
              <ContainerEditor 
                v-model="localData.containers" 
                :volumes="localData.volumes"
                @update:modelValue="v => emitUpdate('containers', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="🎯 Tolerations" :badge="localData.tolerations?.length || 0">
              <TolerationsEditor 
                v-model="localData.tolerations"
                @update:modelValue="v => emitUpdate('tolerations', v)" 
              />
            </CollapsibleSection>
            
            <CollapsibleSection title="📍 Affinity">
              <AffinityEditor 
                v-model="localData.affinity"
                @update:modelValue="v => emitUpdate('affinity', v)" 
              />
            </CollapsibleSection>
          </CollapsibleSection>
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
            
            <div class="form-group">
              <label class="form-label">ImagePullSecrets</label>
              <ListEditor 
                v-model="localData.imagePullSecrets"
                placeholder="secret-name"
                @update:modelValue="v => emitUpdate('imagePullSecrets', v)" 
              />
            </div>
          </div>
          
          <CollapsibleSection title="🔐 Pod 安全上下文">
            <PodSecurityContextEditor 
              v-model="localData.securityContext"
              @update:modelValue="v => emitUpdate('securityContext', v)" 
            />
          </CollapsibleSection>
          
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
        
        <CollapsibleSection title="🚀 Init Containers" :badge="localData.initContainers?.length || 0">
          <ContainerEditor 
            v-model="localData.initContainers" 
            :volumes="localData.volumes"
            :isInitContainer="true"
            @update:modelValue="v => emitUpdate('initContainers', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
          <ContainerEditor 
            v-model="localData.containers" 
            :volumes="localData.volumes"
            @update:modelValue="v => emitUpdate('containers', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="🎯 Tolerations" :badge="localData.tolerations?.length || 0">
          <TolerationsEditor 
            v-model="localData.tolerations"
            @update:modelValue="v => emitUpdate('tolerations', v)" 
          />
        </CollapsibleSection>
        
        <CollapsibleSection title="📍 Affinity">
          <AffinityEditor 
            v-model="localData.affinity"
            @update:modelValue="v => emitUpdate('affinity', v)" 
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
            <label class="form-label">类型 🔒</label>
            <LockedInput
              type="select"
              v-model="localData.secretType"
              :editability="fieldLocking.checkField('secretType')"
              @update:modelValue="v => emitUpdate('secretType', v)"
            >
              <option value="Opaque">Opaque</option>
              <option value="kubernetes.io/tls">TLS</option>
              <option value="kubernetes.io/dockerconfigjson">Docker Config</option>
              <option value="kubernetes.io/basic-auth">Basic Auth</option>
              <option value="kubernetes.io/ssh-auth">SSH Auth</option>
            </LockedInput>
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
            <label class="form-label">存储大小 ⚠️</label>
            <LockedInput
              type="text"
              v-model="localData.storage"
              :editability="fieldLocking.checkField('storage')"
              placeholder="10Gi"
              @update:modelValue="v => emitUpdate('storage', v)"
            />
            <small v-if="editMode === 'edit'" class="hint warning-hint">⚠️ 编辑时仅支持扩容，不可缩小</small>
          </div>
          
          <div class="form-group">
            <label class="form-label">访问模式 🔒</label>
            <div class="checkbox-group" :class="{ 'checkbox-group--locked': !fieldLocking.canEdit('accessModes') }">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localData.accessModes" 
                  value="ReadWriteOnce"
                  :disabled="!fieldLocking.canEdit('accessModes')"
                  @change="emitUpdate('accessModes', localData.accessModes)"
                />
                ReadWriteOnce
              </label>
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localData.accessModes" 
                  value="ReadOnlyMany"
                  :disabled="!fieldLocking.canEdit('accessModes')"
                  @change="emitUpdate('accessModes', localData.accessModes)"
                />
                ReadOnlyMany
              </label>
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localData.accessModes" 
                  value="ReadWriteMany"
                  :disabled="!fieldLocking.canEdit('accessModes')"
                  @change="emitUpdate('accessModes', localData.accessModes)"
                />
                ReadWriteMany
              </label>
              <small v-if="!fieldLocking.canEdit('accessModes')" class="locked-hint">🔒 此字段不可变</small>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">存储类 🔒</label>
            <LockedInput
              type="text"
              v-model="localData.storageClassName"
              :editability="fieldLocking.checkField('storageClassName')"
              placeholder="rootpv-local"
              @update:modelValue="v => emitUpdate('storageClassName', v)"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="localData.localPVEnabled"
                :disabled="!fieldLocking.canEdit('volumeName')"
                @change="emitUpdate('localPVEnabled', localData.localPVEnabled)"
              />
              使用本地 PV
            </label>
            <small v-if="!fieldLocking.canEdit('volumeName')" class="locked-hint">🔒 此字段不可变</small>
          </div>

          <template v-if="localData.localPVEnabled">
            <div class="form-group">
              <label class="form-label">节点 Hostname</label>
              <LockedInput
                type="text"
                v-model="localData.localPVNode"
                :editability="fieldLocking.checkField('volumeName')"
                placeholder="留空自动选择"
                @update:modelValue="v => emitUpdate('localPVNode', v)"
              />
            </div>

            <div class="form-group">
              <label class="form-label">本地路径</label>
              <LockedInput
                type="text"
                v-model="localData.localPVPath"
                :editability="fieldLocking.checkField('volumeName')"
                placeholder="/mnt/kubecanvas-localpv/default/data"
                @update:modelValue="v => emitUpdate('localPVPath', v)"
              />
            </div>

            <div class="form-group">
              <label class="form-label">PV 名称</label>
              <LockedInput
                type="text"
                v-model="localData.localPVName"
                :editability="fieldLocking.checkField('volumeName')"
                placeholder="pv-default-data"
                @update:modelValue="v => emitUpdate('localPVName', v)"
              />
            </div>

            <div class="form-group">
              <label class="form-label">回收策略</label>
              <select
                class="form-select"
                v-model="localData.localPVReclaimPolicy"
                :disabled="!fieldLocking.canEdit('volumeName')"
                @change="emitUpdate('localPVReclaimPolicy', localData.localPVReclaimPolicy)"
              >
                <option value="Delete">Delete</option>
                <option value="Retain">Retain</option>
              </select>
            </div>
          </template>
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
        
        <CollapsibleSection title="Pod 模板配置" :defaultExpanded="true">
          <div class="form-group">
            <label class="form-label">ImagePullSecrets</label>
            <ListEditor 
              v-model="localData.imagePullSecrets"
              placeholder="secret-name"
              @update:modelValue="v => emitUpdate('imagePullSecrets', v)" 
            />
          </div>
          
          <CollapsibleSection title="🔐 Pod 安全上下文">
            <PodSecurityContextEditor 
              v-model="localData.securityContext"
              @update:modelValue="v => emitUpdate('securityContext', v)" 
            />
          </CollapsibleSection>
        
          <CollapsibleSection title="💾 Volumes">
            <VolumeEditor 
              v-model="localData.volumes" 
              @update:modelValue="v => emitUpdate('volumes', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="🚀 Init Containers" :badge="localData.initContainers?.length || 0">
            <ContainerEditor 
              v-model="localData.initContainers" 
              :volumes="localData.volumes"
              :isInitContainer="true"
              @update:modelValue="v => emitUpdate('initContainers', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
            <ContainerEditor 
              v-model="localData.containers" 
              :volumes="localData.volumes"
              @update:modelValue="v => emitUpdate('containers', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="🎯 Tolerations" :badge="localData.tolerations?.length || 0">
            <TolerationsEditor 
              v-model="localData.tolerations"
              @update:modelValue="v => emitUpdate('tolerations', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="📍 Affinity">
            <AffinityEditor 
              v-model="localData.affinity"
              @update:modelValue="v => emitUpdate('affinity', v)" 
            />
          </CollapsibleSection>
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
        
        <CollapsibleSection title="Pod 模板配置 (Pod Template)" :defaultExpanded="true">
          <div class="form-group">
            <label class="form-label">ImagePullSecrets</label>
            <ListEditor 
              v-model="localData.imagePullSecrets"
              placeholder="secret-name"
              @update:modelValue="v => emitUpdate('imagePullSecrets', v)" 
            />
          </div>
          
          <CollapsibleSection title="🔐 Pod 安全上下文">
            <PodSecurityContextEditor 
              v-model="localData.securityContext"
              @update:modelValue="v => emitUpdate('securityContext', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="💾 Volumes">
            <VolumeEditor 
              v-model="localData.volumes" 
              @update:modelValue="v => emitUpdate('volumes', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="🚀 Init Containers" :badge="localData.initContainers?.length || 0">
            <ContainerEditor 
              v-model="localData.initContainers" 
              :volumes="localData.volumes"
              :isInitContainer="true"
              @update:modelValue="v => emitUpdate('initContainers', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="🐳 容器配置" :defaultExpanded="true">
            <ContainerEditor 
              v-model="localData.containers" 
              :volumes="localData.volumes"
              @update:modelValue="v => emitUpdate('containers', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="🎯 Tolerations" :badge="localData.tolerations?.length || 0">
            <TolerationsEditor 
              v-model="localData.tolerations"
              @update:modelValue="v => emitUpdate('tolerations', v)" 
            />
          </CollapsibleSection>
          
          <CollapsibleSection title="📍 Affinity">
            <AffinityEditor 
              v-model="localData.affinity"
              @update:modelValue="v => emitUpdate('affinity', v)" 
            />
          </CollapsibleSection>
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
import LockedInput from './editors/LockedInput.vue'
import TolerationsEditor from './editors/TolerationsEditor.vue'
import AffinityEditor from './editors/AffinityEditor.vue'
import PodSecurityContextEditor from './editors/PodSecurityContextEditor.vue'
import ListEditor from './editors/ListEditor.vue'
import { useFieldLocking, getEditMode } from '../composables/useFieldLocking'
import { getLocalPVConfig, isLocalPVClaim } from '../utils/localPvResources.js'

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

// Determine edit mode based on whether resource exists in cluster
const editMode = computed(() => {
  const resource = props.selectedNode?.data?.resource
  return getEditMode(resource)
})

// Normalized kind for immutability checking
const resourceKind = computed(() => {
  const type = nodeType.value
  const kindMap = {
    deployment: 'Deployment',
    daemonset: 'DaemonSet',
    statefulset: 'StatefulSet',
    service: 'Service',
    ingress: 'Ingress',
    configmap: 'ConfigMap',
    secret: 'Secret',
    pvc: 'PersistentVolumeClaim',
    job: 'Job',
    cronjob: 'CronJob',
    pod: 'Pod',
    namespace: 'Namespace',
  }
  return kindMap[type] || type
})

// Field locking composable
const fieldLocking = useFieldLocking(resourceKind, editMode)

const localData = ref({})

// 从 K8s 资源提取编辑数据
function extractData(node) {
  if (!node) return {}
  
  const resource = node.data?.resource || {}
  const spec = resource.spec || {}
  const metadata = resource.metadata || {}
  const localPVConfig = getLocalPVConfig(resource)
  
  // 获取容器配置
  const getContainers = () => {
    if (spec.template?.spec?.containers) return spec.template.spec.containers
    if (spec.containers) return spec.containers
    if (spec.jobTemplate?.spec?.template?.spec?.containers) return spec.jobTemplate.spec.template.spec.containers
    return []
  }
  
  // 获取 initContainers 配置
  const getInitContainers = () => {
    if (spec.template?.spec?.initContainers) return spec.template.spec.initContainers
    if (spec.initContainers) return spec.initContainers
    if (spec.jobTemplate?.spec?.template?.spec?.initContainers) return spec.jobTemplate.spec.template.spec.initContainers
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
    hostNetwork: podSpec.hostNetwork || false,
    dnsPolicy: podSpec.dnsPolicy || 'ClusterFirst',
    tolerations: podSpec.tolerations || [],
    affinity: podSpec.affinity || null,
    securityContext: podSpec.securityContext || {},
    imagePullSecrets: podSpec.imagePullSecrets || [],
    volumes: podSpec.volumes || [],
    initContainers: getInitContainers(),
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
    localPVEnabled: isLocalPVClaim(resource),
    localPVNode: localPVConfig.nodeName,
    localPVPath: localPVConfig.path,
    localPVName: localPVConfig.pvName,
    localPVReclaimPolicy: localPVConfig.reclaimPolicy,
    
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

/* Edit Mode Banner */
.edit-mode-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1));
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--radius-sm);
  color: #fbbf24;
  font-size: 12px;
  font-weight: 500;
}

/* Locked Checkbox Group */
.checkbox-group--locked {
  opacity: 0.6;
  pointer-events: none;
}

.checkbox-group--locked .checkbox-label {
  cursor: not-allowed;
}

/* Lock hints */
.locked-hint {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

/* Warning hint */
.warning-hint {
  color: #fbbf24 !important;
}
</style>

