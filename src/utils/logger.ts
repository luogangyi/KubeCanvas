/**
 * KubeCanvas Logger Service
 * 
 * 统一的日志服务，支持：
 * - 日志级别过滤 (debug/info/warn/error)
 * - 模块标签
 * - 时间戳格式化
 * - 可选的远程持久化
 */

// 日志级别定义
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// 日志级别优先级
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
}

// 日志配置接口
export interface LoggerConfig {
    level: LogLevel
    enableConsole: boolean
    enablePersist: boolean
    persistEndpoint?: string
    appName?: string
}

// 日志条目接口
export interface LogEntry {
    timestamp: string
    level: LogLevel
    module: string
    message: string
    data?: unknown
    stack?: string
}

// 默认配置 (从环境变量读取)
const defaultConfig: LoggerConfig = {
    level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
    enableConsole: import.meta.env.VITE_LOG_CONSOLE !== 'false',
    enablePersist: import.meta.env.VITE_LOG_PERSIST === 'true',
    persistEndpoint: import.meta.env.VITE_LOG_ENDPOINT || '',
    appName: 'KubeCanvas'
}

// 日志缓冲区 (用于持久化)
const logBuffer: LogEntry[] = []
const MAX_BUFFER_SIZE = 100
const FLUSH_INTERVAL = 10000 // 10秒

/**
 * Logger 类
 */
class Logger {
    private config: LoggerConfig
    private flushTimer: ReturnType<typeof setInterval> | null = null

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...defaultConfig, ...config }

        // 如果启用持久化，启动定时刷新
        if (this.config.enablePersist && this.config.persistEndpoint) {
            this.startFlushTimer()
        }
    }

    /**
     * 检查是否应该记录该级别的日志
     */
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level]
    }

    /**
     * 格式化时间戳
     */
    private formatTimestamp(): string {
        return new Date().toISOString()
    }

    /**
     * 格式化日志消息
     */
    private formatMessage(level: LogLevel, module: string, message: string): string {
        const timestamp = this.formatTimestamp()
        const levelStr = level.toUpperCase().padEnd(5)
        return `[${timestamp}] [${levelStr}] [${module}] ${message}`
    }

    /**
     * 输出到控制台
     */
    private logToConsole(level: LogLevel, formattedMessage: string, data?: unknown): void {
        if (!this.config.enableConsole) return

        const styles = {
            debug: 'color: #9ca3af',
            info: 'color: #3b82f6',
            warn: 'color: #f59e0b',
            error: 'color: #ef4444; font-weight: bold'
        }

        const consoleMethods = {
            debug: console.debug,
            info: console.info,
            warn: console.warn,
            error: console.error
        }

        const method = consoleMethods[level]

        if (data !== undefined) {
            method(`%c${formattedMessage}`, styles[level], data)
        } else {
            method(`%c${formattedMessage}`, styles[level])
        }
    }

    /**
     * 添加到持久化缓冲区
     */
    private addToBuffer(entry: LogEntry): void {
        if (!this.config.enablePersist) return

        logBuffer.push(entry)

        // 如果缓冲区满了，立即刷新
        if (logBuffer.length >= MAX_BUFFER_SIZE) {
            this.flush()
        }
    }

    /**
     * 刷新缓冲区到远程
     */
    async flush(): Promise<void> {
        if (logBuffer.length === 0 || !this.config.persistEndpoint) return

        const entries = logBuffer.splice(0, logBuffer.length)

        try {
            await fetch(this.config.persistEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: entries })
            })
        } catch (error) {
            // 持久化失败，放回缓冲区
            logBuffer.unshift(...entries)
            console.error('[Logger] Failed to persist logs:', error)
        }
    }

    /**
     * 启动定时刷新
     */
    private startFlushTimer(): void {
        if (this.flushTimer) return
        this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL)
    }

    /**
     * 停止定时刷新
     */
    stopFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer)
            this.flushTimer = null
        }
    }

    /**
     * 核心日志方法
     */
    private log(level: LogLevel, module: string, message: string, data?: unknown): void {
        if (!this.shouldLog(level)) return

        const formattedMessage = this.formatMessage(level, module, message)

        // 输出到控制台
        this.logToConsole(level, formattedMessage, data)

        // 添加到持久化缓冲区
        const entry: LogEntry = {
            timestamp: this.formatTimestamp(),
            level,
            module,
            message,
            data,
            stack: level === 'error' ? new Error().stack : undefined
        }
        this.addToBuffer(entry)
    }

    /**
     * Debug 日志
     */
    debug(module: string, message: string, data?: unknown): void {
        this.log('debug', module, message, data)
    }

    /**
     * Info 日志
     */
    info(module: string, message: string, data?: unknown): void {
        this.log('info', module, message, data)
    }

    /**
     * Warn 日志
     */
    warn(module: string, message: string, data?: unknown): void {
        this.log('warn', module, message, data)
    }

    /**
     * Error 日志
     */
    error(module: string, message: string, data?: unknown): void {
        this.log('error', module, message, data)
    }

    /**
     * 更新配置
     */
    setConfig(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config }
    }

    /**
     * 获取当前配置
     */
    getConfig(): LoggerConfig {
        return { ...this.config }
    }
}

// 创建全局单例
export const logger = new Logger()

// 导出模块常量，便于使用
export const LOG_MODULES = {
    APP: 'App',
    API: 'API',
    CANVAS: 'Canvas',
    UI: 'UI',
    K8S: 'K8s',
    SAVE: 'Save',
    LOAD: 'Load',
    DELETE: 'Delete',
    PATCH: 'Patch'
} as const

// 默认导出
export default logger
