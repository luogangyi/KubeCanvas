---
title:      "K8s 资源字段结构重构计划"
created:    "2026-01-20"
author:     "Claude + Gangyi"
version:    1
status:     "active"
related:    []
tags:       [refactor, k8s, property-panel]
---

# K8s 资源字段结构重构计划

## 问题分析

当前 PropertyPanel 中的字段结构与 K8s API 不完全匹配。需要按照 K8s 官方 API 规范重新梳理。

## 正确的 K8s 资源层级结构

### Workloads (工作负载类)

#### Deployment / DaemonSet / ReplicaSet
```
Deployment
├── apiVersion: apps/v1
├── kind: Deployment
├── metadata (ObjectMeta)
│   ├── name
│   ├── namespace
│   ├── labels
│   └── annotations
└── spec (DeploymentSpec)
    ├── replicas
    ├── selector (LabelSelector)
    ├── strategy (DeploymentStrategy)
    │   ├── type: RollingUpdate | Recreate
    │   └── rollingUpdate (maxSurge, maxUnavailable)
    └── template (PodTemplateSpec)
        ├── metadata (ObjectMeta)
        │   └── labels
        └── spec (PodSpec)  ← Pod 配置核心
            ├── containers []
            ├── initContainers []      ← 缺失
            ├── volumes []
            ├── restartPolicy
            ├── serviceAccountName
            ├── nodeSelector {}
            ├── affinity               ← 缺失
            ├── tolerations []         ← 缺失
            ├── hostNetwork            ← 缺失
            ├── dnsPolicy              ← 缺失
            └── securityContext        ← 缺失
```

#### StatefulSet
```
StatefulSet
└── spec (StatefulSetSpec)
    ├── serviceName (required, immutable)
    ├── replicas
    ├── selector
    ├── podManagementPolicy: OrderedReady | Parallel
    ├── updateStrategy
    │   └── type: RollingUpdate | OnDelete
    ├── volumeClaimTemplates []   ← 需要完善
    └── template (PodTemplateSpec)
        └── spec (PodSpec)
```

#### Pod
```
Pod
└── spec (PodSpec)
    ├── containers []
    ├── initContainers []
    ├── volumes []
    ├── restartPolicy: Always | OnFailure | Never
    ├── serviceAccountName
    ├── nodeSelector {}
    ├── affinity
    ├── tolerations []
    └── ...
```

#### Job
```
Job
└── spec (JobSpec)
    ├── completions
    ├── parallelism
    ├── backoffLimit
    ├── activeDeadlineSeconds
    └── template (PodTemplateSpec)
        └── spec (PodSpec)
```

#### CronJob
```
CronJob
└── spec (CronJobSpec)
    ├── schedule (cron expression)
    ├── concurrencyPolicy: Allow | Forbid | Replace
    ├── successfulJobsHistoryLimit
    ├── failedJobsHistoryLimit
    └── jobTemplate (JobTemplateSpec)
        └── spec (JobSpec)
            └── template (PodTemplateSpec)
```

---

## 需要修改的文件

### 1. PropertyPanel.vue
- 移除已完成的 "Pod 配置" 冗余部分 ✅
- 添加缺失的 PodSpec 字段编辑器
- 为工作负载添加统一的 "Pod 模板" 配置区块

### 2. 添加缺失字段

| 字段 | 所属类型 | 优先级 |
|------|----------|--------|
| initContainers | PodSpec | 高 |
| tolerations | PodSpec | 中 |  
| affinity | PodSpec | 中 |
| hostNetwork | PodSpec | 低 |
| dnsPolicy | PodSpec | 低 |
| podSecurityContext | PodSpec | 中 |
| volumeClaimTemplates | StatefulSet | 高 |
| podManagementPolicy | StatefulSet | 低 |
| rollingUpdate maxSurge/maxUnavailable | Deployment | 中 |

---

## 实施步骤

### Phase 1: 添加 initContainers 支持 (高优先级)
1. 修改 PropertyPanel.vue 添加 initContainers 编辑器
2. 修改 extractData 函数提取 initContainers
3. 修改 Canvas.vue 的 updateNodeData 支持 initContainers
4. 修改 getAllResources 清理无效 initContainers

### Phase 2: 完善 PodSpec 字段
1. 添加 tolerations 编辑器
2. 添加 affinity 编辑器 (可选，较复杂)
3. 添加常用字段: hostNetwork, dnsPolicy 等

### Phase 3: StatefulSet 特有字段
1. 添加 volumeClaimTemplates 编辑器
2. 添加 podManagementPolicy 选项

---

## 用户确认事项

1. 是否需要先专注于 **initContainers** 的添加？
2. 对于 affinity/tolerations 等复杂字段，是否需要完整的 UI 编辑器，还是简化为 YAML 编辑？
3. 是否需要调整现有的属性面板布局？
