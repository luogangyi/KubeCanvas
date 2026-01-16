# KubeCanvas 组件操作综合校验计划

## 目标

对项目进行整体检查，确保所有资源组件的连线、删除、修改操作都正确处理。

---

## 1. 校验清单

### 1.1 连线关联校验 (双向连接)
验证从任意方向连线都能正确设置关联关系：

| 连接类型 | 字段设置 | 正向 | 反向 |
|----------|----------|------|------|
| Service ↔ Deployment | `service.spec.selector` | ⬜ | ⬜ |
| Service ↔ StatefulSet | `service.spec.selector` | ⬜ | ⬜ |
| Service ↔ DaemonSet | `service.spec.selector` | ⬜ | ⬜ |
| Service ↔ Pod | `service.spec.selector` | ⬜ | ⬜ |
| Ingress ↔ Service | `ingress.spec.rules[].backend` | ⬜ | ⬜ |
| Deployment ↔ ConfigMap | `volumes[].configMap` | ⬜ | ⬜ |
| Deployment ↔ Secret | `volumes[].secret` | ⬜ | ⬜ |
| Deployment ↔ PVC | `volumes[].persistentVolumeClaim` | ⬜ | ⬜ |
| StatefulSet ↔ 配置/存储 | 同上 | ⬜ | ⬜ |
| DaemonSet ↔ 配置/存储 | 同上 | ⬜ | ⬜ |
| Job ↔ 配置/存储 | 同上 | ⬜ | ⬜ |
| CronJob ↔ 配置/存储 | 同上 | ⬜ | ⬜ |
| Pod ↔ 配置/存储 | 同上 | ⬜ | ⬜ |

### 1.2 删除连线时关联清理

| 场景 | 清理字段 |
|------|----------|
| 删除 Service→Workload 边 | 清空 `service.spec.selector` |
| 删除 Ingress→Service 边 | 清空 `ingress.backend.service` |
| 删除 Workload→ConfigMap 边 | 移除对应 volume/envFrom |
| 删除 Workload→Secret 边 | 移除对应 volume/envFrom |
| 删除 Workload→PVC 边 | 移除对应 volume |

### 1.3 恢复组合时只读字段 (基于 K8s patch/update 规范)

**通用不可变字段 (所有资源):**
- `metadata.name`, `metadata.namespace`, `metadata.uid`, `metadata.creationTimestamp`
- `apiVersion`, `kind`

**工作负载资源:**

| 资源 | 不可变字段 |
|------|-----------|
| **Deployment** | `spec.selector` (Critical!) |
| **StatefulSet** | `spec.selector`, `spec.serviceName`, `spec.podManagementPolicy`, `spec.volumeClaimTemplates` |
| **DaemonSet** | `spec.selector` |
| **Job** | `spec.selector`, `spec.template`, `spec.completions`, `spec.parallelism` |
| **CronJob** | 无特殊限制 |
| **Pod** | 大部分 spec 字段 |

**网络资源:**

| 资源 | 不可变字段 |
|------|-----------|
| **Service** | `spec.clusterIP`, `spec.ipFamilies` |
| **Ingress** | 无特殊限制 |

**存储/配置资源:**

| 资源 | 不可变字段 |
|------|-----------|
| **PVC** | `spec.storageClassName`, `spec.accessModes`, `spec.volumeName`, `spec.volumeMode` |
| **ConfigMap** | `immutable` |
| **Secret** | `type`, `immutable` |
| **Namespace** | `metadata.name` |

### 1.4 删除组件时引用检查
- 删除被 Service 引用的 Workload → 提示引用关系
- 删除被 Ingress 引用的 Service → 提示引用关系
- 删除被 Workload 挂载的 ConfigMap → 提示引用关系

### 1.5 Namespace 删除确认
- 弹出二次确认对话框
- 提示将删除内部所有组件
- 确认后删除 Namespace 及其子组件

### 1.6 新建场景删除清理
- 关联的边被删除
- Selector、volume 等关联关系被清理

### 1.7 Namespace 单一限制
- 画布上最多只能创建一个 Namespace
- 创建第二个 Namespace 时显示错误提示

---

## 2. 实施步骤

1. [ ] 检查 Canvas.vue 连线逻辑覆盖度
2. [ ] 检查删除边清理逻辑覆盖度
3. [ ] 添加 Namespace 单一限制
4. [ ] 添加 Namespace 删除确认对话框
5. [ ] 验证 PropertyPanel 只读字段应用
6. [ ] 进行功能测试
