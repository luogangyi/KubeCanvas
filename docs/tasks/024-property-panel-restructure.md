---
title:      "Property Panel Restructuring Plan"
created:    "2026-01-24"
author:     "Claude + Gangyi"
version:    1
status:     "active"
related:    ["020-k8s-resource-field-restructure.md"]
tags:       [refactor, ui, property-panel]
---

# Property Panel Restructuring Plan

## Goal Description
1.  **Rename** "资源限制" (Resource Limits) to "资源配置" (Resource Configuration) in the Container Editor.
2.  **Restructure** `PropertyPanel.vue` for Workloads (Deployment, DaemonSet, StatefulSet, ReplicaSet).
    *   Create a unified **"Pod 模板 (Pod Template)"** section.
    *   Move all PodSpec-related fields inside this section as sub-items or grouped fields.
    *   The fields to move include:
        *   `containers`
        *   `initContainers`
        *   `volumes`
        *   `restartPolicy`
        *   `serviceAccountName`
        *   `nodeSelector`
        *   `affinity`
        *   `tolerations`
        *   `hostNetwork`
        *   `dnsPolicy`
        *   `securityContext` (Pod level)
        *   `imagePullSecrets`

## Proposed Changes

### 1. Rename UI Text
#### [MODIFY] [ContainerEditor.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/editors/ContainerEditor.vue)
-   Change `<CollapsibleSection title="资源限制">` to `<CollapsibleSection title="资源配置">`.

### 2. Group Pod Fields in PropertyPanel
#### [MODIFY] [PropertyPanel.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/PropertyPanel.vue)
-   For **Deployment**, **DaemonSet**, **StatefulSet**:
    -   Create a new parent `<CollapsibleSection title="Pod 模板配置 (Pod Template)" :defaultExpanded="true">`.
    -   Move the following existing sections/fields *inside* this new section:
        -   `ServiceAccount` input
        -   `ImagePullSecrets` input
        -   `Pod Security Context` section
        -   `Volumes` section
        -   `Init Containers` section
        -   `Containers` section
        -   `Tolerations` section
        -   `Affinity` section
        -   `HostNetwork` / `DNSPolicy` (if present)
        -   `NodeSelector` (if present)

## Detailed View of Pod Template Structure
```html
<CollapsibleSection title="Pod 模板配置 (Pod Template)">
  <!-- 基础 Pod 设置 -->
  <div class="form-row">...ServiceAccount, ImagePullSecrets...</div>
  
  <!-- Pod 安全与网络 -->
  <CollapsibleSection title="安全与网络">...</CollapsibleSection>
  
  <!-- 存储 -->
  <CollapsibleSection title="存储卷 (Volumes)">...</CollapsibleSection>
  
  <!-- 容器列表 -->
  <CollapsibleSection title="Init 容器">...</CollapsibleSection>
  <CollapsibleSection title="工作容器 (Containers)">...</CollapsibleSection>
  
  <!-- 调度 -->
  <CollapsibleSection title="调度 (Affinity/Tolerations)">...</CollapsibleSection>
</CollapsibleSection>
```
