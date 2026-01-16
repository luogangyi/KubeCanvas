/**
 * KubeCanvas Theme System
 * 
 * 支持暗色和亮色主题切换
 * 配置来源优先级: localStorage > 环境变量 > 默认值(light)
 */

import { ref, computed, watch } from 'vue'

// 主题类型
export type Theme = 'dark' | 'light'

// 当前主题
const currentTheme = ref<Theme>('dark')

// 是否已初始化
let initialized = false

/**
 * 获取初始主题
 */
function getInitialTheme(): Theme {
    // 1. 检查 localStorage
    const saved = localStorage.getItem('kubecanvas-theme')
    if (saved === 'dark' || saved === 'light') {
        return saved
    }

    // 2. 检查环境变量
    const envTheme = import.meta.env.VITE_UI_THEME
    if (envTheme === 'dark' || envTheme === 'light') {
        return envTheme
    }

    // 3. 默认亮色主题
    return 'light'
}

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme)

    // 更新 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0e17' : '#f8fafc')
    }
}

/**
 * 主题 Composable
 */
export function useTheme() {
    /**
     * 初始化主题 (应在 app 启动时调用一次)
     */
    function initTheme() {
        if (initialized) return

        const theme = getInitialTheme()
        currentTheme.value = theme
        applyTheme(theme)
        initialized = true

        // 监听系统主题变化
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // 只有当用户没有手动设置时才自动切换
                if (!localStorage.getItem('kubecanvas-theme')) {
                    setTheme(e.matches ? 'dark' : 'light', false)
                }
            })
        }
    }

    /**
     * 设置主题
     */
    function setTheme(theme: Theme, persist = true) {
        currentTheme.value = theme
        applyTheme(theme)

        if (persist) {
            localStorage.setItem('kubecanvas-theme', theme)
        }
    }

    /**
     * 切换主题
     */
    function toggleTheme() {
        const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
    }

    /**
     * 重置为系统/环境变量设置
     */
    function resetTheme() {
        localStorage.removeItem('kubecanvas-theme')
        const theme = getInitialTheme()
        currentTheme.value = theme
        applyTheme(theme)
    }

    // 计算属性
    const isDark = computed(() => currentTheme.value === 'dark')
    const isLight = computed(() => currentTheme.value === 'light')

    return {
        theme: currentTheme,
        isDark,
        isLight,
        initTheme,
        setTheme,
        toggleTheme,
        resetTheme
    }
}

// 导出单例函数供 main.js 使用
export function initTheme() {
    const { initTheme: init } = useTheme()
    init()
}

export default useTheme
