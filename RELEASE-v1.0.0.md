# KubeCanvas Release v1.0.0

**发布日期**: 2026-01-17

## 🎉 首个正式版本发布

KubeCanvas 是一款可视化的 Kubernetes 资源编排工具，通过拖拉拽方式快速创建和管理 K8s 资源组合。

---

## ✨ 主要功能

### 可视化编排
- 拖拉拽创建资源节点
- 连线定义资源关系
- Namespace 容器化布局
- 实时属性编辑

### 支持的资源类型
- **工作负载**: Deployment, StatefulSet, DaemonSet, Job, CronJob, Pod
- **网络**: Service, Ingress
- **配置**: ConfigMap, Secret
- **存储**: PersistentVolumeClaim

### Kubernetes 集成
- 直接部署到 K8s 集群
- 增量保存更新
- 从集群恢复组合
- 统一标签管理

---

## 🚀 部署方式

### 快速部署到 K8s 集群

```bash
kubectl apply -f deploy/01-rbac.yaml
kubectl apply -f deploy/02-deployment.yaml
kubectl apply -f deploy/03-service-nodeport.yaml

# 访问 http://<节点IP>:30073
```

### Docker 运行

```bash
docker run -p 8080:80 \
  -e KUBERNETES_API_SERVER="https://your-k8s-api:6443" \
  -e KUBERNETES_TOKEN="your-token" \
  registry.cn-hangzhou.aliyuncs.com/kubecanvas/kubecanvas:latest
```

---

## 📝 本版本更新

### 新增功能
- ✅ 默认主题改为亮色 (可通过 `VITE_UI_THEME` 配置)
- ✅ ConfigMap 配置支持 (`deploy/04-configmap.yaml`)
- ✅ NodePort Service 配置 (`deploy/03-service-nodeport.yaml`)
- ✅ K8s API 请求日志记录 (`/var/log/nginx/k8s-api.log`)
- ✅ README 中添加 K8s 快速部署说明

### Bug 修复
- ✅ 修复 Namespace 删除无法持久化到 K8s 的问题
- ✅ 修复 Namespace 节点无法右键选中的问题 (pointer-events)
- ✅ 修复 Toast 被 Loading 遮罩层覆盖的问题 (z-index)
- ✅ 抑制浏览器环境下误导的 "In-cluster mode failed" 警告

---

## ⚠️ 已知问题

### 上下文菜单隐藏问题
- **现象**: 右键出现删除菜单后，在 Namespace 内部区域左键点击无法隐藏菜单
- **临时解决方案**: 右键点击其他地方可以隐藏菜单，或直接点击菜单上的删除按钮
- **根本原因**: Namespace body 区域设置了 `pointer-events: none` 用于点击穿透，导致 mousedown 事件无法触发
- **计划修复**: 下一版本

---

## 📦 镜像信息

- **镜像地址**: `registry.cn-hangzhou.aliyuncs.com/kubecanvas/kubecanvas:latest`
- **Git Tag**: `release-v1.0.0`

---

## 🙏 致谢

感谢所有参与测试和反馈的用户！
