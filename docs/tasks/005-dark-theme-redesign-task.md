# 任务 02: UI 深色科技风格重设计

## 任务目标
将 KubeCanvas 从浅色主题重设计为深色科技风格（参考 docs/images/screenshot.png）

---

## 完成状态 ✅

### 规划阶段 ✅
- [x] 分析参考截图设计元素
- [x] 审查现有 CSS 样式结构
- [x] 创建实施计划
- [x] 用户确认计划

### 实施阶段 ✅
- [x] 创建 K8s SVG 图标 (10个资源类型)
- [x] 重构 `main.css` 全局样式
  - [x] 定义深色主题配色变量
  - [x] 添加玻璃效果变量
  - [x] 添加发光效果变量
  - [x] 更新全局组件样式
- [x] 创建 `editors.css` 编辑器通用样式
- [x] 更新 `resourceTemplates.js` 图标配置
- [x] 更新侧边栏 `Sidebar.vue`
- [x] 更新节点 `BaseNode.vue`
- [x] 更新属性面板 `PropertyPanel.vue`
- [x] 更新 `CollapsibleSection.vue`

### 验证阶段 ✅
- [x] 构建测试 (npm run build)
- [x] 浏览器视觉验证
- [x] 功能测试 (拖拽、编辑)

---

## 关键改动

### 新增文件
- `src/assets/editors.css` - 编辑器通用深色样式
- `src/assets/icons/*.svg` - 10个 K8s 原生 SVG 图标

### 修改文件
- `src/assets/main.css` - 全面重构为深色主题
- `src/components/Sidebar.vue` - 单列布局 + SVG图标 + Tooltip
- `src/components/Canvas.vue` - 铅笔图标 + 实线连接
- `src/components/nodes/BaseNode.vue` - 深色节点 + SVG图标
- `src/components/PropertyPanel.vue` - 深色表单
- `src/components/editors/*.vue` - 深色主题适配
