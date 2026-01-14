# Light/Dark Theme Implementation Plan

## 目标

1. 保留现有暗色主题
2. 添加亮色主题
3. 通过配置文件切换主题
4. 确保所有 UI 元素适配两种主题

## 实现方案

### 1. 主题配置

#### [NEW] 环境变量配置

```bash
# .env.example
VITE_UI_THEME=dark  # dark | light
```

### 2. CSS 变量改造

#### [MODIFY] main.css

添加 `[data-theme="light"]` 主题变量：

```css
/* 暗色主题 (默认) */
:root, [data-theme="dark"] {
  --bg-primary: #0a0e17;
  --bg-secondary: #0f1419;
  --text-primary: #e2e8f0;
  ...
}

/* 亮色主题 */
[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --text-primary: #1e293b;
  ...
}
```

### 3. 主题服务

#### [NEW] src/composables/useTheme.ts

```typescript
export function useTheme() {
  const theme = ref(import.meta.env.VITE_UI_THEME || 'dark')
  
  function setTheme(newTheme: 'dark' | 'light') {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }
  
  // 初始化时应用主题
  function initTheme() {
    const saved = localStorage.getItem('theme')
    const initial = saved || import.meta.env.VITE_UI_THEME || 'dark'
    setTheme(initial)
  }
  
  return { theme, setTheme, initTheme }
}
```

### 4. 应用入口

#### [MODIFY] main.js

```javascript
import { useTheme } from './composables/useTheme'
const { initTheme } = useTheme()
initTheme()
```

### 5. 亮色主题变量

| 变量类别 | Dark | Light |
|----------|------|-------|
| bg-primary | #0a0e17 | #f8fafc |
| bg-secondary | #0f1419 | #f1f5f9 |
| bg-tertiary | #151c25 | #e2e8f0 |
| bg-elevated | #1a2332 | #ffffff |
| text-primary | #e2e8f0 | #1e293b |
| text-secondary | #94a3b8 | #475569 |
| text-muted | #64748b | #94a3b8 |
| border-default | rgba(59,130,246,0.15) | rgba(59,130,246,0.2) |
| glass-bg | rgba(15,20,25,0.85) | rgba(255,255,255,0.9) |
| shadow-* | 黑色阴影 | 灰色阴影 |

## 实施步骤

1. 更新 `.env.example` 添加 `VITE_UI_THEME`
2. 创建 `useTheme.ts` composable
3. 更新 `main.css` 添加亮色变量
4. 更新 `main.js` 初始化主题
5. 测试验证所有组件
