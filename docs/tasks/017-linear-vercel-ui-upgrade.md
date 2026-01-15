# KubeCanvas UI 升级方案 - Linear/Vercel 设计风格

## 设计理念

采用 **Linear/Vercel** 设计语言的核心特征：
- **极简主义**：去除多余装饰，专注内容
- **高对比度**：深色背景 + 明亮强调色
- **精细排版**：严格的字体层级和间距系统
- **细腻交互**：微妙的 hover/active 状态变化
- **深色优先**：专业开发者工具的标准配色

---

## 1. 配色方案升级

### 暗色主题 (Linear-style)

| 变量 | 当前值 | 新值 | 说明 |
|------|--------|------|------|
| `--bg-primary` | #0a0e17 | **#000000** | 纯黑背景 |
| `--bg-secondary` | #0f1419 | **#0a0a0a** | 次级背景 |
| `--bg-tertiary` | #151c25 | **#111111** | 卡片背景 |
| `--bg-elevated` | #1a2332 | **#171717** | 悬浮元素 |
| `--text-primary` | #e2e8f0 | **#ededed** | 高亮白 |
| `--text-secondary` | #94a3b8 | **#a1a1a1** | 中性灰 |
| `--text-muted` | #64748b | **#666666** | 弱化文字 |
| `--border-default` | rgba(59,130,246,0.15) | **rgba(255,255,255,0.08)** | 中性边框 |
| `--accent-primary` | #3b82f6 | **#0070f3** | Vercel 蓝 |

### 减少发光效果

Linear 风格强调**克制**，减少 glow 效果：
```css
--glow-sm: 0 0 0 1px rgba(255, 255, 255, 0.1);
--glow-md: 0 0 0 1px var(--accent-primary);
```

---

## 2. 排版系统

### 字体层级

```css
/* 页面标题 */
--font-size-xl: 20px;    /* 600 weight */
--font-size-lg: 16px;    /* 600 weight */
--font-size-md: 14px;    /* 500 weight */
--font-size-sm: 13px;    /* 400 weight */
--font-size-xs: 11px;    /* 500 weight, uppercase */

/* 行高 */
--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.7;
```

### 字重规范

- **700**: 仅 Logo/大标题
- **600**: 区块标题、按钮
- **500**: 表单标签
- **400**: 正文内容

---

## 3. 间距系统

采用 **4px 基准网格**：

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
```

---

## 4. 圆角规范

Linear 风格使用**更小的圆角**：

```css
--radius-sm: 4px;   /* 输入框、小按钮 */
--radius-md: 6px;   /* 卡片、面板 */
--radius-lg: 8px;   /* 模态框 */
```

---

## 5. 边框规范

使用 **1px 细边框**，颜色极淡：

```css
--border-subtle: rgba(255, 255, 255, 0.06);
--border-default: rgba(255, 255, 255, 0.1);
--border-strong: rgba(255, 255, 255, 0.15);
```

---

## 6. 阴影规范

深色模式下阴影几乎不可见，用边框代替：

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.7);
```

---

## 7. 交互状态

### Hover

```css
/* 从 */
background: var(--bg-tertiary);
/* 到 */
background: var(--bg-elevated);
border-color: var(--border-strong);
```

### Active/Selected

```css
background: rgba(0, 112, 243, 0.1);
border-color: var(--accent-primary);
```

---

## 8. 具体组件改进

### Header
- 高度减到 48px
- 移除玻璃模糊效果，使用纯色背景
- 按钮改用 ghost 风格

### Sidebar
- 宽度保持 180px
- 移除蓝色边框倾向，改用中性灰
- 资源卡片使用更细的边框

### Canvas 节点
- 减少 glow 效果
- 边框更细 (1px)
- 选中态用 accent 色边框

### Property Panel
- 表单输入框高度统一 32px
- 减少蓝色倾向的边框
- 改用中性灰边框

### 按钮
- Primary: 实心 Vercel 蓝，白字
- Secondary: 透明背景，边框
- Danger: 红色边框/背景

---

## 9. 实施步骤

1. **更新 CSS 变量** - 配色、圆角、间距
2. **调整组件样式** - Header、Sidebar、Panel
3. **优化节点样式** - 减少 glow，细化边框
4. **统一表单样式** - 输入框、按钮
5. **测试验证** - 确保两个主题都美观

---

## 10. 预期效果

**Before**: 科技感、蓝色发光、玻璃效果
**After**: 极简、专业、高对比度、克制的设计语言

参考：
- [Linear.app](https://linear.app)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Raycast](https://www.raycast.com)
