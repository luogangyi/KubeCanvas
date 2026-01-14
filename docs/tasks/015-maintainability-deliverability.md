# KubeCanvas 可维护性和可交付性提升方案

## 目标

1. **日志系统** - 统一的控制台日志输出和可配置的日志持久化
2. **Docker 打包** - 支持 Docker 镜像构建和部署
3. **K8s 部署** - 完整的 Kubernetes 部署清单
4. **配置管理** - 生产环境配置最佳实践

---

## 1. 日志系统

### 1.1 日志服务模块

#### [NEW] [logger.ts](file:///Users/luogangyi/Code/KubeCanvas/src/utils/logger.ts)

创建统一的日志服务：

```typescript
// 日志级别
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// 配置接口
interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enablePersist: boolean
  persistEndpoint?: string
}

// 单例日志服务
class Logger {
  // info(), warn(), error(), debug()
  // 格式化输出: [时间] [级别] [模块] 消息
  // 可选: 发送到后端持久化
}
```

**特性：**
- 日志级别过滤 (debug/info/warn/error)
- 模块标签 (API/Canvas/UI 等)
- 时间戳格式化
- 可选的远程持久化

### 1.2 环境变量配置

```bash
# 日志配置
VITE_LOG_LEVEL=info          # debug|info|warn|error
VITE_LOG_CONSOLE=true        # 是否输出到控制台
VITE_LOG_PERSIST=false       # 是否持久化到后端
VITE_LOG_ENDPOINT=           # 日志收集端点 (可选)
```

---

## 2. Docker 打包

### 2.1 Dockerfile

#### [NEW] [Dockerfile](file:///Users/luogangyi/Code/KubeCanvas/Dockerfile)

多阶段构建，生产镜像体积小：

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2.2 Nginx 配置

#### [NEW] [nginx.conf](file:///Users/luogangyi/Code/KubeCanvas/nginx.conf)

支持 SPA 路由和 K8s API 代理：

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # K8s API 代理 (in-cluster 模式)
    location /k8s-api/ {
        proxy_pass https://kubernetes.default.svc/;
        proxy_ssl_verify off;
        proxy_set_header Authorization "Bearer $KUBERNETES_TOKEN";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2.3 .dockerignore

#### [NEW] [.dockerignore](file:///Users/luogangyi/Code/KubeCanvas/.dockerignore)

```
node_modules
dist
.git
.env.local
*.log
```

### 2.4 Docker Compose (开发)

#### [NEW] [docker-compose.yml](file:///Users/luogangyi/Code/KubeCanvas/docker-compose.yml)

```yaml
version: '3.8'
services:
  kubecanvas:
    build: .
    ports:
      - "8080:80"
    environment:
      - KUBERNETES_TOKEN=${VITE_K8S_TOKEN}
```

---

## 3. Kubernetes 部署

### 3.1 部署清单

#### [NEW] [deploy/deployment.yaml](file:///Users/luogangyi/Code/KubeCanvas/deploy/deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubecanvas
  labels:
    app: kubecanvas
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kubecanvas
  template:
    metadata:
      labels:
        app: kubecanvas
    spec:
      serviceAccountName: kubecanvas
      containers:
      - name: kubecanvas
        image: kubecanvas:latest
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "128Mi"
            cpu: "100m"
```

### 3.2 ServiceAccount 和 RBAC

#### [NEW] [deploy/rbac.yaml](file:///Users/luogangyi/Code/KubeCanvas/deploy/rbac.yaml)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubecanvas
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubecanvas
rules:
- apiGroups: ["", "apps", "batch", "networking.k8s.io"]
  resources: ["*"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubecanvas
subjects:
- kind: ServiceAccount
  name: kubecanvas
  namespace: default
roleRef:
  kind: ClusterRole
  name: kubecanvas
  apiGroup: rbac.authorization.k8s.io
```

### 3.3 Service 和 Ingress

#### [NEW] [deploy/service.yaml](file:///Users/luogangyi/Code/KubeCanvas/deploy/service.yaml)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubecanvas
spec:
  selector:
    app: kubecanvas
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubecanvas
spec:
  rules:
  - host: kubecanvas.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubecanvas
            port:
              number: 80
```

---

## 4. NPM Scripts 扩展

### [MODIFY] [package.json](file:///Users/luogangyi/Code/KubeCanvas/package.json)

添加构建和部署脚本：

```json
{
  "scripts": {
    "docker:build": "docker build -t kubecanvas:latest .",
    "docker:run": "docker run -p 8080:80 kubecanvas:latest",
    "docker:push": "docker push kubecanvas:latest",
    "k8s:deploy": "kubectl apply -f deploy/",
    "k8s:delete": "kubectl delete -f deploy/"
  }
}
```

---

## 5. 实施顺序

| 阶段 | 任务 | 预计工作量 |
|------|------|------------|
| 1 | 创建日志服务模块 | 中 |
| 2 | 更新环境变量配置 | 小 |
| 3 | 创建 Dockerfile 和 nginx.conf | 中 |
| 4 | 创建 K8s 部署清单 | 中 |
| 5 | 更新 package.json scripts | 小 |
| 6 | 更新 README 文档 | 小 |

---

## 6. 目录结构 (新增)

```
KubeCanvas/
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
├── nginx.conf
├── deploy/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── rbac.yaml
└── src/
    └── utils/
        └── logger.ts
```

---

## 7. 使用示例

### 本地开发
```bash
npm run dev
```

### Docker 构建运行
```bash
npm run docker:build
npm run docker:run
# 访问 http://localhost:8080
```

### K8s 部署
```bash
# 构建并推送镜像
docker build -t your-registry/kubecanvas:v1.0.0 .
docker push your-registry/kubecanvas:v1.0.0

# 部署到 K8s
kubectl apply -f deploy/
```
