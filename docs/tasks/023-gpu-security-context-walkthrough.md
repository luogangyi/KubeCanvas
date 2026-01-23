---
title:      "GPU Support and SecurityContext Walkthrough"
created:    "2026-01-23"
author:     "Claude + Gangyi"
version:    1
status:     "active"
related:    ["022-gpu-and-security-context.md"]
tags:       [gpu, security-context, walkthrough]
---

# Walkthrough: GPU and SecurityContext Support

## Changes Implemented

### 1. GPU Support
-   **ResourceEditor.vue**: Added `GPU (NVIDIA)` field to Limits section, mapping to `nvidia.com/gpu`.

### 2. Security Context
-   **SecurityContextEditor.vue**: Created new component for Container SecurityContext.
    -   Fields: Privileged, AllowPrivilegeEscalation, ReadOnlyRootFilesystem, RunAsUser, RunAsGroup, Capabilities.
-   **PodSecurityContextEditor.vue**: Created new component for Pod SecurityContext.
    -   Fields: RunAsUser, RunAsGroup, FSGroup.
-   **ContainerEditor.vue**: Integrated `SecurityContextEditor`.
-   **PropertyPanel.vue**: Integrated `PodSecurityContextEditor` and `ImagePullSecrets` for:
    -   Deployment
    -   DaemonSet
    -   StatefulSet
    -   Pod
    -   Job
    -   CronJob

### 3. Data Cleanup
-   **Canvas.vue**: Updated `cleanContainers` and added `cleanPodSpec` to remove empty/invalid security context and image pull secrets objects before saving to Kubernetes.

## Verification

### Automated Tests
-   Verify that adding a GPU limit results in `limits: { "nvidia.com/gpu": "1" }` in the generated YAML.
-   Verify that setting `privileged: true` results in `securityContext: { privileged: true }` in the container spec.
-   Verify that setting Pod `runAsUser` results in `securityContext: { runAsUser: 1000 }` in the Pod spec.
-   Verify that valid `imagePullSecrets` are retained and empty ones removed.

### Manual Verification
1.  Open KubeCanvas.
2.  Select a Deployment.
3.  In "Container Configuration" -> "Resource Limits", add GPU limit.
4.  In "Container Configuration", expand "Security Context" and check "Privileged".
5.  In "Pod Configuration", expand "Pod Security Context" and set RunAsUser.
6.  Save changes and inspect the generated YAML or check the cluster state.
