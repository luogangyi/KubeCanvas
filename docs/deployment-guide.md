# KubeCanvas 部署指南

本文档介绍 KubeCanvas 的多种部署方式，包括本地开发、Docker 和 Kubernetes 部署。

## 目录

- [1. 本地开发](#1-本地开发)
- [2. Docker 部署](#2-docker-部署)
- [3. Docker Compose 部署](#3-docker-compose-部署)
- [4. Kubernetes 部署](#4-kubernetes-部署)
- [5. 配置说明](#5-配置说明)

---

## 1. 本地开发

### 1.1 环境要求

- Node.js >= 18.x
- npm >= 9.x
- 一个可访问的 Kubernetes 集群

### 1.2 快速开始

```bash
# 克隆代码
git clone https://github.com/luogangyi/KubeCanvas.git
cd KubeCanvas

# 安装依赖
npm install

# 配置 K8s 连接
cp .env.example .env.local
# 编辑 .env.local 填入 K8s API Server 地址和 Token
```

### 1.3 获取 K8s Token

```bash
# 创建 ServiceAccount
kubectl create serviceaccount kubecanvas -n default

# 创建 ClusterRoleBinding
kubectl create clusterrolebinding kubecanvas \
  --clusterrole=cluster-admin \
  --serviceaccount=default:kubecanvas

# 生成 Token (有效期 1 年)
kubectl create token kubecanvas -n default --duration=8760h
```

### 1.4 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:5173
```

### 1.5 其他命令

```bash
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
npm run test         # 运行测试
npm run typecheck    # TypeScript 类型检查
```

---

## 2. Docker 部署

### 2.1 单架构构建

```bash
# 构建镜像
npm run docker:build
# 或
docker build -t kubecanvas:latest .

# 运行容器
npm run docker:run
# 或
docker run -p 8080:80 --rm kubecanvas:latest

# 访问 http://localhost:8080
```

### 2.2 多架构构建 (amd64 + arm64)

适用于需要同时支持 x86 和 ARM 架构的场景（如 Apple Silicon + 云服务器）：

```bash
# 创建 buildx 构建器
docker buildx create --name multiarch --use

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/kubecanvas:latest \
  --push .
```

### 2.3 推送到镜像仓库

```bash
# 登录镜像仓库
docker login your-registry.com

# 打标签
docker tag kubecanvas:latest your-registry.com/kubecanvas:v1.0.0

# 推送
docker push your-registry.com/kubecanvas:v1.0.0
```

---

## 3. Docker Compose 部署

适用于快速本地测试或单机部署。

### 3.1 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env
# 编辑 .env 填入配置
```

### 3.2 启动服务

```bash
# 构建并启动
npm run docker:compose
# 或
docker-compose up --build

# 后台运行
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 3.3 访问

- Web UI: http://localhost:8080
- 健康检查: http://localhost:8080/health

---

## 4. Kubernetes 部署

### 4.1 准备工作

1. **推送镜像到仓库**

```bash
# 构建并推送镜像
docker build -t your-registry/kubecanvas:v1.0.0 .
docker push your-registry/kubecanvas:v1.0.0
```

2. **修改镜像地址**

编辑 `deploy/02-deployment.yaml`，将 `image: kubecanvas:latest` 改为你的镜像地址：

```yaml
containers:
  - name: kubecanvas
    image: your-registry/kubecanvas:v1.0.0
```

### 4.2 部署

```bash
# 应用所有资源
npm run k8s:deploy
# 或
kubectl apply -f deploy/

# 查看部署状态
kubectl get pods -l app=kubecanvas
kubectl get svc kubecanvas
```

### 4.3 访问方式

**方式 1: Port Forward（测试用）**

```bash
kubectl port-forward svc/kubecanvas 8080:80
# 访问 http://localhost:8080
```

**方式 2: NodePort**

修改 `deploy/03-service.yaml` 中 Service 类型：

```yaml
spec:
  type: NodePort
  ports:
    - port: 80
      nodePort: 30080
```

**方式 3: Ingress**

修改 `deploy/03-service.yaml` 中 Ingress 配置，设置正确的域名和 IngressClass。

### 4.4 查看日志

```bash
npm run k8s:logs
# 或
kubectl logs -f -l app=kubecanvas
```

### 4.5 删除部署

```bash
npm run k8s:delete
# 或
kubectl delete -f deploy/
```

---

## 5. 配置说明

### 5.1 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_K8S_MODE` | `custom` | 运行模式: `in-cluster` 或 `custom` |
| `VITE_K8S_API_SERVER` | - | K8s API Server 地址 |
| `VITE_K8S_TOKEN` | - | Bearer Token |
| `VITE_K8S_NAMESPACE` | `default` | 默认命名空间 |
| `VITE_K8S_TIMEOUT` | `30000` | 请求超时 (ms) |
| `VITE_K8S_SKIP_TLS` | `true` | 跳过 TLS 验证 |
| `VITE_LOG_LEVEL` | `info` | 日志级别 |
| `VITE_LOG_CONSOLE` | `true` | 控制台日志 |
| `VITE_LOG_PERSIST` | `false` | 日志持久化 |

### 5.2 In-Cluster 模式

在 Kubernetes 内部署时，设置 `VITE_K8S_MODE=in-cluster`，应用会自动使用 ServiceAccount Token 认证。

### 5.3 RBAC 权限

部署清单中的 ClusterRole 包含以下权限：

- **Core API**: namespaces, pods, services, configmaps, secrets, pvc
- **Apps API**: deployments, statefulsets, daemonsets, replicasets
- **Batch API**: jobs, cronjobs
- **Networking**: ingresses

如需限制权限，可修改 `deploy/01-rbac.yaml`。

---

## 常见问题

### Q: Docker 构建失败？

确保 Node.js 版本 >= 18，并检查 npm 依赖是否完整。

### Q: 无法连接 K8s API？

1. 检查 API Server 地址是否正确
2. 检查 Token 是否有效
3. 开发环境下确认 `VITE_K8S_SKIP_TLS=true`

### Q: Ingress 不生效？

1. 确认已安装 Ingress Controller (如 nginx-ingress)
2. 检查 IngressClass 配置
3. 确认域名 DNS 解析正确

---

## 更多信息

- [GitHub 仓库](https://github.com/luogangyi/KubeCanvas)
- [问题反馈](https://github.com/luogangyi/KubeCanvas/issues)
