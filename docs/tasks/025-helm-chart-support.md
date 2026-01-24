---
title:      "Helm Chart 部署支持"
created:    "2026-01-25"
author:     "Claude + Gangyi"
version:    1
status:     "active"
related:    []
tags:       [helm, deployment, kubernetes]
---

# Helm Chart Implementation Plan

## Goal
Create a Helm chart for KubeCanvas that:
1. Packages all existing `deploy/` manifests into a standard Helm chart structure.
2. Makes Service type configurable (NodePort default, ClusterIP optional).
3. Makes Ingress optionally deployable.

## Proposed Changes

### [NEW] `charts/kubecanvas/` Directory Structure
```
charts/kubecanvas/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values
├── templates/
│   ├── _helpers.tpl        # Template helpers
│   ├── serviceaccount.yaml # ServiceAccount
│   ├── clusterrole.yaml    # ClusterRole
│   ├── clusterrolebinding.yaml
│   ├── deployment.yaml     # Deployment
│   ├── service.yaml        # Configurable Service
│   ├── configmap.yaml      # ConfigMap
│   └── ingress.yaml        # Optional Ingress
└── README.md               # Usage instructions
```

## Key Configuration Options (`values.yaml`)

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `service.type` | `NodePort` | Service 类型 |
| `service.nodePort` | `30073` | NodePort 端口 |
| `ingress.enabled` | `false` | 是否启用 Ingress |
| `ingress.host` | `kubecanvas.local` | Ingress 域名 |

## Usage

```bash
# NodePort 模式（默认）
helm install kubecanvas ./charts/kubecanvas

# ClusterIP + Ingress 模式
helm install kubecanvas ./charts/kubecanvas \
  --set service.type=ClusterIP \
  --set ingress.enabled=true
```
