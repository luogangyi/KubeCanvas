# KubeCanvas Helm Chart

Visual Kubernetes Resource Designer - 可视化 Kubernetes 资源设计器

## 安装

### 默认安装 (ClusterIP)

```bash
helm install kubecanvas ./charts/kubecanvas
```

```bash
kubectl port-forward svc/kubecanvas 8080:80 -n default
```

访问地址: `http://localhost:8080`

> 安全提示: KubeCanvas 会用自身 ServiceAccount 代理 Kubernetes API 请求。不要直接暴露 NodePort、LoadBalancer 或 Ingress，除非前面已有认证和网络访问控制。

### ClusterIP + Ingress 安装

```bash
helm install kubecanvas ./charts/kubecanvas \
  --set service.type=ClusterIP \
  --set ingress.enabled=true \
  --set ingress.host=kubecanvas.example.com
```

## 配置项

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `namespace` | 部署命名空间 | `default` |
| `replicaCount` | 副本数 | `1` |
| `nodeSelector` | Pod 节点选择器 | `{}` |
| `image.repository` | 镜像仓库 | `registry.cn-hangzhou.aliyuncs.com/kubecanvas/kubecanvas` |
| `image.tag` | 镜像标签 | `latest` |
| `image.pullPolicy` | 拉取策略 | `IfNotPresent` |
| `service.type` | Service 类型 | `ClusterIP` |
| `service.port` | Service 端口 | `80` |
| `service.nodePort` | NodePort 端口 | `30073` |
| `ingress.enabled` | 是否启用 Ingress | `false` |
| `ingress.host` | Ingress 域名 | `kubecanvas.local` |
| `resources.requests.memory` | 内存请求 | `64Mi` |
| `resources.requests.cpu` | CPU 请求 | `50m` |
| `resources.limits.memory` | 内存限制 | `128Mi` |
| `resources.limits.cpu` | CPU 限制 | `100m` |

## 卸载

```bash
helm uninstall kubecanvas
```

## 升级

```bash
helm upgrade kubecanvas ./charts/kubecanvas
```
