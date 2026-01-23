---
title:      "GPU Support and SecurityContext Implementation"
created:    "2026-01-23"
author:     "Claude + Gangyi"
version:    1
status:     "active"
related:    ["020-k8s-resource-field-restructure.md"]
tags:       [gpu, security-context, refactor]
---

# GPU Support and SecurityContext Implementation

## Goal Description
1.  Add **GPU** configuration support in Container Resources (specifically `nvidia.com/gpu`).
2.  Implement **SecurityContext** editing for both Containers (`securityContext`) and Pods (`securityContext`).
3.  Add **ImagePullSecrets** to Pod configuration.

## Proposed Changes

### 1. GPU Support
#### [x] [MODIFY] [ResourceEditor.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/editors/ResourceEditor.vue)
-   Add a **GPU** input field in the "Limits" section.
-   Map it to `limits['nvidia.com/gpu']`.

### 2. Security Context
#### [x] [NEW] [SecurityContextEditor.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/editors/SecurityContextEditor.vue)
-   **Scope**: Container level.
-   **Fields**:
    -   `privileged` (bool)
    -   `runAsUser` (int)
    -   `runAsGroup` (int)
    -   `readOnlyRootFilesystem` (bool)
    -   `allowPrivilegeEscalation` (bool)
    -   `capabilities` (add/drop list)

#### [x] [NEW] [PodSecurityContextEditor.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/editors/PodSecurityContextEditor.vue)
-   **Scope**: Pod level.
-   **Fields**:
    -   `runAsUser` (int)
    -   `runAsGroup` (int)
    -   `fsGroup` (int)

### 3. Integration
#### [x] [MODIFY] [ContainerEditor.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/editors/ContainerEditor.vue)
-   Add `SecurityContext` collapsible section.
-   Use `SecurityContextEditor`.

#### [x] [MODIFY] [PropertyPanel.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/PropertyPanel.vue)
-   Add `PodSecurityContext` collapsible section for all workloads (Deployment, STS, DS, Pod, Job, CronJob).
-   Add `ImagePullSecrets` input (ListEditor) to Pod settings.

## Verification Plan
1.  **GPU**: Verify adding a GPU limit adds `nvidia.com/gpu` to the generated YAML.
2.  **SecurityContext**:
    -   Set `privileged: true` in a container and verify YAML.
    -   Set `fsGroup` in a Pod and verify YAML.
3.  **ImagePullSecrets**: Add a secret name and verify YAML.
