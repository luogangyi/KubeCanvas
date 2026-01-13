# 实施计划 02: UI 深色科技风格重设计

## 目标
参考 `docs/images/screenshot.png` 的设计风格，将 KubeCanvas 从当前的浅色主题重新设计为深色科技风格界面。

## 设计分析

| 元素 | 当前样式 | 目标样式 |
|-----|---------|---------| 
| **背景** | 浅灰色渐变 | 深蓝黑色渐变，带蓝色光晕效果 |
| **头部** | 白色背景 | 深色半透明，毛玻璃效果 |
| **侧边栏** | 白色背景 | 深色半透明面板，圆角卡片 |
| **画布** | 浅色网格 | 深色背景，蓝色点阵网格 |
| **节点** | 白色卡片 | 深色玻璃效果，蓝色边框发光 |
| **图标** | Emoji 表情符号 | K8s 社区原生 SVG 图标 |

---

## 改动清单

### 新增文件
- `src/assets/icons/*.svg` - 10个 K8s SVG 图标
- `src/assets/editors.css` - 编辑器共享样式

### 修改文件
- `src/assets/main.css` - 深色主题配色
- `src/components/Sidebar.vue` - 单列布局 + Tooltip
- `src/components/Canvas.vue` - 铅笔图标 + 实线
- `src/components/nodes/BaseNode.vue` - 深色节点
- `src/components/PropertyPanel.vue` - 深色表单
- `src/components/editors/*.vue` - 深色适配

---

## 配色方案

```css
/* 背景层次 */
--bg-primary: #0a0e17;
--bg-secondary: #0f1419;
--bg-tertiary: #151c25;

/* 蓝色强调色 */
--accent-primary: #3b82f6;
--accent-glow: #60a5fa;

/* 玻璃效果 */
background: rgba(15, 20, 25, 0.8);
backdrop-filter: blur(20px);
```

---

## 验证计划

1. 启动 `npm run dev`
2. 验证深色背景、玻璃效果、发光边框
3. 验证拖拽、连线功能正常
4. 执行 `npm run build` 确保构建成功
