# K8s 资源连线验证规则实现方案

## 目标

防止用户创建无效的 K8s 资源拓扑，通过白名单(Allowlist)和黑名单(Blocklist)验证连线合法性。

---

## 1. 合法连线白名单 (Allowlist)

| Source | Target | 关系类型 | K8s 字段 |
|--------|--------|----------|----------|
| Ingress | Service | 路由转发 | `rules[].backend.service` |
| Service | Deployment | 流量选择 | `spec.selector` |
| Service | StatefulSet | 流量选择 | `spec.selector` |
| Service | DaemonSet | 流量选择 | `spec.selector` |
| Service | Pod | 流量选择 | `spec.selector` |
| Deployment | PVC | 挂载存储 | `volumes[].persistentVolumeClaim` |
| Deployment | ConfigMap | 挂载/注入 | `envFrom` / `volumes[].configMap` |
| Deployment | Secret | 挂载/注入 | `envFrom` / `volumes[].secret` |
| StatefulSet | PVC | 挂载存储 | 同 Deployment |
| StatefulSet | ConfigMap | 挂载/注入 | 同 Deployment |
| StatefulSet | Secret | 挂载/注入 | 同 Deployment |
| StatefulSet | Service | Headless服务 | `spec.serviceName` |
| DaemonSet | PVC/CM/Secret | 挂载/注入 | 同 Deployment |
| Job | PVC/CM/Secret | 挂载/注入 | `template.spec...` |
| CronJob | PVC/CM/Secret | 挂载/注入 | `jobTemplate...` |
| Pod | PVC/CM/Secret | 挂载/注入 | `spec.volumes` |

---

## 2. 非法操作黑名单 (Blocklist)

1. **禁止自环** - 任何资源不能连接自己
2. **禁止配置类资源互连** - ConfigMap/Secret/PVC 之间不能互连
3. **禁止反向依赖** - Pod→Service, PVC→Deployment 等
4. **禁止跨层级混乱** - Ingress→Pod (必须经过 Service)

---

## 3. 实现方案

### [NEW] `src/utils/connectionRules.js`

```javascript
// 合法连接矩阵 (source -> [targets])
const CONNECTION_ALLOWLIST = {
  ingress: ['service'],
  service: ['deployment', 'daemonset', 'statefulset', 'pod'],
  deployment: ['pvc', 'configmap', 'secret'],
  daemonset: ['pvc', 'configmap', 'secret'],
  statefulset: ['pvc', 'configmap', 'secret', 'service'],
  job: ['pvc', 'configmap', 'secret'],
  cronjob: ['pvc', 'configmap', 'secret'],
  pod: ['pvc', 'configmap', 'secret'],
}

// 验证函数
export function validateConnection(sourceType, targetType) {
  // 1. 自环检查 (由调用方检查 sourceId !== targetId)
  
  // 2. 白名单检查
  const allowedTargets = CONNECTION_ALLOWLIST[sourceType]
  if (!allowedTargets || !allowedTargets.includes(targetType)) {
    return {
      valid: false,
      reason: getInvalidReason(sourceType, targetType)
    }
  }
  
  return { valid: true }
}
```

### [MODIFY] `src/components/Canvas.vue`

在 `createConnection` 函数中添加验证：

```javascript
function createConnection(sourceNode, targetNode, ...) {
  // 验证连接合法性
  const validation = validateConnection(sourceNode.type, targetNode.type)
  if (!validation.valid) {
    showToast(validation.reason, 'error')
    return
  }
  // ... 继续创建连接
}
```

---

## 4. 用户体验

- **非法连接时显示 Toast 提示**
- **提示信息说明为什么不能连接**
- **可选：连线时高亮可连接的目标节点**

---

## 5. 验证测试用例

| 测试 | 预期结果 |
|------|----------|
| Ingress → Service | ✅ 允许 |
| Service → Deployment | ✅ 允许 |
| Service → ConfigMap | ❌ 拒绝 |
| ConfigMap → Secret | ❌ 拒绝 |
| Pod → Service | ❌ 拒绝 (反向依赖) |
| Ingress → Pod | ❌ 拒绝 (必须经过 Service) |
