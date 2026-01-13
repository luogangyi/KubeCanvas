# KubeCanvas - Kubernetes 可视化资源编排工具

一个基于 Vue 3 + Vue Flow 的图形化 Kubernetes 资源编排工具，支持拖拽创建资源、连线建立关联、参数编辑和一键部署到 K8s 集群。

## 技术栈

| 类别 | 技术选型 |
|------|---------|
| 框架 | Vue 3 + Vite |
| 画布 | Vue Flow (基于 React Flow 的 Vue 实现) |
| HTTP | Axios |
| 样式 | Vanilla CSS (CNCF/AWS 亮色风格) |
| 图标 | Heroicons |

## 项目结构

```
KubeCanvas/
├── public/
├── src/
│   ├── assets/                 # 静态资源
│   ├── components/
│   │   ├── Canvas.vue          # 画布组件
│   │   ├── Sidebar.vue         # 资源列表侧边栏
│   │   ├── PropertyPanel.vue   # 属性编辑面板
│   │   └── nodes/
│   │       ├── DeploymentNode.vue
│   │       ├── StatefulSetNode.vue
│   │       ├── ServiceNode.vue
│   │       └── BaseNode.vue
│   ├── composables/
│   │   ├── useK8sApi.js        # K8s API 调用
│   │   └── useResourceLabel.js # 统一标签管理
│   ├── config/
│   │   └── k8s.config.js       # K8s API 配置
│   ├── utils/
│   │   └── resourceTemplates.js # K8s 资源模板
│   ├── App.vue
│   └── main.js
├── vite.config.js
└── package.json
```

---

## Proposed Changes

### 项目初始化

#### [NEW] [package.json](file:///Users/luogangyi/Code/KubeCanvas/package.json)
使用 Vite + Vue 3 初始化项目，添加依赖：
- `@vue-flow/core` - 画布拖拽连线
- `@vue-flow/background` - 画布背景
- `@vue-flow/controls` - 画布控制
- `axios` - HTTP 请求
- `@heroicons/vue` - 图标库

---

### 配置模块

#### [NEW] [k8s.config.js](file:///Users/luogangyi/Code/KubeCanvas/src/config/k8s.config.js)
K8s API 配置文件，包含：
- `apiServer`: K8s API 地址
- `token`: 认证 Token
- `namespace`: 默认命名空间

---

### 核心组件

#### [NEW] [App.vue](file:///Users/luogangyi/Code/KubeCanvas/src/App.vue)
主应用布局：左侧边栏 + 中间画布 + 右侧属性面板

#### [NEW] [Sidebar.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/Sidebar.vue)
资源列表侧边栏：
- 可拖拽的资源卡片 (Deployment, StatefulSet, Service, Ingress, PVC, ConfigMap)
- 已保存的资源组合列表
- 查询和加载功能

#### [NEW] [Canvas.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/Canvas.vue)
核心画布组件：
- 基于 Vue Flow 实现
- 支持从侧边栏拖入资源
- 支持节点间连线
- 连线时自动建立 Selector 关联

#### [NEW] [PropertyPanel.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/PropertyPanel.vue)
属性编辑面板：
- 显示选中资源的详细配置
- 支持编辑各种 K8s 资源参数
- 实时更新画布中的节点数据

---

### 资源节点组件

#### [NEW] [nodes/BaseNode.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/nodes/BaseNode.vue)
节点基础组件，定义通用样式和连接点

#### [NEW] [nodes/DeploymentNode.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/nodes/DeploymentNode.vue)
Deployment 节点，显示名称、副本数、镜像等信息

#### [NEW] [nodes/StatefulSetNode.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/nodes/StatefulSetNode.vue)
StatefulSet 节点，显示名称、副本数、镜像等信息

#### [NEW] [nodes/ServiceNode.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/nodes/ServiceNode.vue)
Service 节点，显示类型 (NodePort/ClusterIP)、端口映射等

---

### API 集成

#### [NEW] [composables/useK8sApi.js](file:///Users/luogangyi/Code/KubeCanvas/src/composables/useK8sApi.js)
K8s API 调用封装：
- `createResources()` - 批量创建资源
- `getResourcesByLabel()` - 按标签查询资源
- `updateResource()` - 更新单个资源
- `deleteResource()` - 删除资源

#### [NEW] [composables/useResourceLabel.js](file:///Users/luogangyi/Code/KubeCanvas/src/composables/useResourceLabel.js)
统一标签管理：
- `generateCompositionLabel()` - 生成资源组合标签
- `applyLabelToResources()` - 为所有资源应用统一标签

---

### 资源模板

#### [NEW] [utils/resourceTemplates.js](file:///Users/luogangyi/Code/KubeCanvas/src/utils/resourceTemplates.js)
K8s 资源 YAML 模板生成：
- Deployment 模板
- StatefulSet 模板
- Service (NodePort/ClusterIP) 模板
- 根据连线关系自动设置 Selector

---

### 样式文件

#### [NEW] [assets/main.css](file:///Users/luogangyi/Code/KubeCanvas/src/assets/main.css)
CNCF/AWS 风格亮色主题：
- 浅蓝色渐变背景
- 圆角卡片设计
- 微妙阴影效果
- 响应式布局

---

## 核心功能实现

### 连线与 Selector 关联

当用户将 Service 连接到 Deployment/StatefulSet 时：
1. 自动读取目标工作负载的 `matchLabels`
2. 将这些标签设置为 Service 的 `spec.selector`
3. 确保 Service 能正确路由到目标 Pod

```javascript
// 连线时的处理逻辑
function onConnect(connection) {
  const sourceNode = getNode(connection.source);
  const targetNode = getNode(connection.target);
  
  if (sourceNode.type === 'service' && 
      ['deployment', 'statefulset'].includes(targetNode.type)) {
    // 自动设置 selector
    sourceNode.data.resource.spec.selector = 
      targetNode.data.resource.spec.selector.matchLabels;
  }
}
```

### 统一标签管理

所有资源在保存时自动添加：
```yaml
labels:
  kubecanvas.io/composition: "composition-{uuid}"
  kubecanvas.io/managed-by: "kubecanvas"
```

---

## Verification Plan

### 自动化测试

由于这是新项目，暂无现有测试。验证将通过以下方式进行：

### 浏览器测试

1. **启动开发服务器**
   ```bash
   cd /Users/luogangyi/Code/KubeCanvas
   npm run dev
   ```

2. **测试拖拽功能**
   - 从侧边栏拖拽 Deployment 到画布
   - 从侧边栏拖拽 StatefulSet 到画布
   - 从侧边栏拖拽 2 个 Service 到画布
   - 验证节点正确显示

3. **测试连线功能**
   - 将 Service (NodePort) 连接到 Deployment
   - 将 Service (ClusterIP) 连接到 StatefulSet
   - 验证连线显示正确

4. **测试属性编辑**
   - 点击节点，验证属性面板显示
   - 修改参数，验证节点数据更新

5. **测试保存功能**
   - 点击保存按钮
   - 验证生成正确的 K8s 资源 YAML
   - （需要用户提供有效的 K8s 集群进行实际部署测试）

### 人工验证

> [!NOTE]
> K8s API 调用需要有效的集群地址和 Token。请在 `src/config/k8s.config.js` 中配置后进行实际部署测试。

---

## User Review Required

> [!IMPORTANT]
> **K8s 集群配置**: 请确认是否需要我在配置文件中预设特定的 K8s API 地址和 Token，还是保留为占位符让您后续填写？

> [!IMPORTANT]
> **资源类型范围**: 当前计划支持 Deployment、StatefulSet、Service、Ingress、PVC、ConfigMap。是否需要添加其他资源类型如 Pod、Job、CronJob、Secret 等？
