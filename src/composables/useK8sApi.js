// K8s API 调用封装 - 支持 in-cluster 和 custom 模式
import axios from 'axios'

// =========================================
// 配置 - 全部通过环境变量设置
// =========================================
// 创建 .env.local 文件配置以下变量（参考 .env.example）:
// - VITE_K8S_MODE: 运行模式 ('in-cluster' | 'custom')
// - VITE_K8S_API_SERVER: K8s API 地址
// - VITE_K8S_TOKEN: 认证 Token
// - VITE_K8S_NAMESPACE: 默认命名空间
// - VITE_K8S_TIMEOUT: 请求超时（毫秒）
// - VITE_K8S_SKIP_TLS: 是否跳过 TLS 验证

const k8sConfig = {
    mode: import.meta.env.VITE_K8S_MODE || 'in-cluster',
    apiServer: import.meta.env.VITE_K8S_API_SERVER || 'https://kubernetes.default.svc',
    token: import.meta.env.VITE_K8S_TOKEN || '',
    namespace: import.meta.env.VITE_K8S_NAMESPACE || 'default',
    timeout: parseInt(import.meta.env.VITE_K8S_TIMEOUT) || 30000,
    skipTLSVerify: import.meta.env.VITE_K8S_SKIP_TLS === 'true',
    // In-Cluster 模式路径配置
    inCluster: {
        tokenPath: '/var/run/secrets/kubernetes.io/serviceaccount/token',
        caPath: '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
        namespacePath: '/var/run/secrets/kubernetes.io/serviceaccount/namespace',
    }
}

/**
 * 获取默认命名空间（从环境变量配置）
 */
export function getDefaultNamespace() {
    return k8sConfig.namespace
}

// =========================================
// 运行模式检测
// =========================================

/**
 * 检测是否在 K8s Pod 内运行
 * 通过检查环境变量和 ServiceAccount 挂载目录判断
 */
function isRunningInCluster() {
    // 检查 K8s 环境变量
    const k8sHost = typeof process !== 'undefined' && process.env?.KUBERNETES_SERVICE_HOST
    const k8sPort = typeof process !== 'undefined' && process.env?.KUBERNETES_SERVICE_PORT
    return !!(k8sHost && k8sPort)
}

/**
 * 从 Pod 内获取 in-cluster 配置
 */
async function getInClusterConfig() {
    // 在浏览器环境中，优先使用环境变量
    const apiServer = import.meta.env.VITE_K8S_API_SERVER
    const token = import.meta.env.VITE_K8S_TOKEN
    const namespace = import.meta.env.VITE_K8S_NAMESPACE

    if (apiServer && token) {
        return {
            apiServer,
            token,
            namespace: namespace || 'default'
        }
    }

    // 如果是 SSR 或 Node.js 环境，从文件系统读取
    if (typeof process !== 'undefined' && process.env?.KUBERNETES_SERVICE_HOST) {
        const fs = await import('fs').catch(() => null)
        if (fs) {
            const host = process.env.KUBERNETES_SERVICE_HOST
            const port = process.env.KUBERNETES_SERVICE_PORT || '443'
            const tokenPath = k8sConfig.inCluster.tokenPath
            const namespacePath = k8sConfig.inCluster.namespacePath

            try {
                const tokenContent = fs.readFileSync(tokenPath, 'utf-8').trim()
                const namespaceContent = fs.readFileSync(namespacePath, 'utf-8').trim()

                return {
                    apiServer: `https://${host}:${port}`,
                    token: tokenContent,
                    namespace: namespaceContent
                }
            } catch (err) {
                console.error('Failed to read in-cluster credentials:', err.message)
            }
        }
    }

    return null
}

/**
 * 获取当前有效的 K8s 配置
 */
async function getEffectiveConfig() {
    const mode = k8sConfig.mode

    if (mode === 'in-cluster') {
        const inClusterCreds = await getInClusterConfig()
        if (inClusterCreds) {
            return {
                apiServer: inClusterCreds.apiServer,
                token: inClusterCreds.token,
                namespace: inClusterCreds.namespace,
                timeout: k8sConfig.timeout,
                skipTLSVerify: k8sConfig.skipTLSVerify
            }
        }
        console.warn('In-cluster mode failed, falling back to custom config')
    }

    // Custom 模式或回退
    return {
        apiServer: k8sConfig.apiServer,
        token: k8sConfig.token,
        namespace: k8sConfig.namespace,
        timeout: k8sConfig.timeout,
        skipTLSVerify: k8sConfig.skipTLSVerify
    }
}

// 初始化配置
let effectiveConfig = null

// =========================================
// 创建 API 客户端
// =========================================

let apiClient = null

async function initApiClient() {
    if (apiClient) return apiClient

    effectiveConfig = await getEffectiveConfig()

    // 开发环境使用 Vite 代理来绕过 CORS
    // 生产环境（in-cluster）直接使用 API Server 地址
    const isDev = import.meta.env.DEV
    const baseURL = isDev ? '/k8s-api' : effectiveConfig.apiServer

    apiClient = axios.create({
        baseURL: baseURL,
        timeout: effectiveConfig.timeout,
        headers: {
            'Authorization': `Bearer ${effectiveConfig.token}`,
            'Content-Type': 'application/json'
        }
    })

    // 请求拦截器
    apiClient.interceptors.request.use(
        config => config,
        error => Promise.reject(error)
    )

    // 响应拦截器
    apiClient.interceptors.response.use(
        response => response,
        error => {
            console.error('K8s API Error:', error)
            return Promise.reject(error)
        }
    )

    return apiClient
}

// 获取 API 路径
function getApiPath(kind, namespace) {
    const paths = {
        // 集群级资源（不需要 namespace）
        Namespace: `/api/v1/namespaces`,
        // 命名空间级资源
        Deployment: `/apis/apps/v1/namespaces/${namespace}/deployments`,
        StatefulSet: `/apis/apps/v1/namespaces/${namespace}/statefulsets`,
        Service: `/api/v1/namespaces/${namespace}/services`,
        Pod: `/api/v1/namespaces/${namespace}/pods`,
        Ingress: `/apis/networking.k8s.io/v1/namespaces/${namespace}/ingresses`,
        ConfigMap: `/api/v1/namespaces/${namespace}/configmaps`,
        Secret: `/api/v1/namespaces/${namespace}/secrets`,
        PersistentVolumeClaim: `/api/v1/namespaces/${namespace}/persistentvolumeclaims`,
        Job: `/apis/batch/v1/namespaces/${namespace}/jobs`,
        CronJob: `/apis/batch/v1/namespaces/${namespace}/cronjobs`
    }
    return paths[kind] || null
}

// =========================================
// ConfigMap 注册表配置
// =========================================
const REGISTRY_CONFIGMAP_NAME = 'kubecanvas-compositions'
const REGISTRY_CONFIGMAP_NAMESPACE = 'default' // 固定在 default 命名空间

// =========================================
// K8s API 组合函数
// =========================================

export function useK8sApi() {
    // 获取当前命名空间
    function getNamespace() {
        return effectiveConfig?.namespace || k8sConfig.namespace || 'default'
    }

    // =========================================
    // ConfigMap 注册表操作
    // =========================================

    // 读取 compositions 注册表
    async function getCompositionsRegistry() {
        const client = await initApiClient()
        const path = `/api/v1/namespaces/${REGISTRY_CONFIGMAP_NAMESPACE}/configmaps/${REGISTRY_CONFIGMAP_NAME}`

        try {
            const response = await client.get(path)
            const data = response.data.data?.compositions
            return data ? JSON.parse(data) : {}
        } catch (error) {
            if (error.response?.status === 404) {
                // ConfigMap 不存在，返回空对象
                return {}
            }
            throw error
        }
    }

    // 更新 compositions 注册表（添加或更新条目）
    async function updateCompositionsRegistry(compositionId, namespace, resourceCount = 0, name = '') {
        const client = await initApiClient()
        const path = `/api/v1/namespaces/${REGISTRY_CONFIGMAP_NAMESPACE}/configmaps/${REGISTRY_CONFIGMAP_NAME}`

        // 先读取现有数据
        let registry = {}
        let exists = false

        try {
            const response = await client.get(path)
            exists = true
            const data = response.data.data?.compositions
            registry = data ? JSON.parse(data) : {}
        } catch (error) {
            if (error.response?.status !== 404) {
                throw error
            }
        }

        // 添加/更新条目（包含自定义名称）
        registry[compositionId] = {
            namespace,
            resourceCount,
            name: name || compositionId,
            updatedAt: new Date().toISOString()
        }

        const configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
                name: REGISTRY_CONFIGMAP_NAME,
                namespace: REGISTRY_CONFIGMAP_NAMESPACE
            },
            data: {
                compositions: JSON.stringify(registry)
            }
        }

        if (exists) {
            await client.put(path, configMap)
        } else {
            await client.post(`/api/v1/namespaces/${REGISTRY_CONFIGMAP_NAMESPACE}/configmaps`, configMap)
        }

        return registry
    }

    // 从注册表中移除条目
    async function removeFromRegistry(compositionId) {
        const client = await initApiClient()
        const path = `/api/v1/namespaces/${REGISTRY_CONFIGMAP_NAMESPACE}/configmaps/${REGISTRY_CONFIGMAP_NAME}`

        try {
            const response = await client.get(path)
            const data = response.data.data?.compositions
            const registry = data ? JSON.parse(data) : {}

            delete registry[compositionId]

            const configMap = {
                ...response.data,
                data: {
                    compositions: JSON.stringify(registry)
                }
            }

            await client.put(path, configMap)
            return registry
        } catch (error) {
            if (error.response?.status === 404) {
                return {}
            }
            throw error
        }
    }

    // 创建资源
    async function createResource(resource) {
        const client = await initApiClient()
        const kind = resource.kind
        const namespace = resource.metadata?.namespace || getNamespace()
        const path = getApiPath(kind, namespace)

        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await client.post(path, resource)
        return response.data
    }

    // 批量创建资源
    async function createResources(resources) {
        const results = []
        const errors = []

        for (const resource of resources) {
            try {
                const result = await createResource(resource)
                results.push({ success: true, resource: result })
            } catch (error) {
                errors.push({
                    success: false,
                    resource: resource,
                    error: error.response?.data || error.message
                })
            }
        }

        return { results, errors }
    }

    // 获取资源
    async function getResource(kind, name, namespace) {
        const client = await initApiClient()
        const ns = namespace || getNamespace()
        const path = getApiPath(kind, ns)
        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await client.get(`${path}/${name}`)
        return response.data
    }

    // 按标签查询资源
    async function getResourcesByLabel(kind, labelSelector, namespace) {
        const client = await initApiClient()
        const ns = namespace || getNamespace()
        const path = getApiPath(kind, ns)
        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await client.get(path, {
            params: { labelSelector }
        })
        return response.data.items
    }

    // 查询指定组合的所有资源
    async function getCompositionResources(compositionId, namespace) {
        // 如果未提供 namespace，从注册表查询
        let ns = namespace
        if (!ns) {
            const registry = await getCompositionsRegistry()
            ns = registry[compositionId]?.namespace || getNamespace()
        }

        const labelSelector = `kubecanvas.io/composition=${compositionId}`
        const kinds = ['Namespace', 'Deployment', 'StatefulSet', 'Service', 'Pod', 'Ingress', 'ConfigMap', 'Secret', 'PersistentVolumeClaim', 'Job', 'CronJob']

        const allResources = []

        for (const kind of kinds) {
            try {
                const resources = await getResourcesByLabel(kind, labelSelector, ns)
                // K8s List API 返回的 items 不包含 kind 字段，需要手动添加
                resources.forEach(r => {
                    r.kind = kind
                    // 同时添加 apiVersion
                    if (['Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet'].includes(kind)) {
                        r.apiVersion = 'apps/v1'
                    } else if (['Job', 'CronJob'].includes(kind)) {
                        r.apiVersion = 'batch/v1'
                    } else if (kind === 'Ingress') {
                        r.apiVersion = 'networking.k8s.io/v1'
                    } else {
                        r.apiVersion = 'v1'
                    }
                })
                allResources.push(...resources)
            } catch (error) {
                console.warn(`Failed to get ${kind}:`, error.message)
            }
        }

        return allResources
    }

    // 获取所有资源组合列表（从 ConfigMap 注册表读取）
    async function listCompositions() {
        const registry = await getCompositionsRegistry()

        return Object.entries(registry).map(([id, info]) => ({
            id,
            name: info.name || id, // 使用自定义名称
            namespace: info.namespace,
            resourceCount: info.resourceCount || 0,
            updatedAt: info.updatedAt
        }))
    }

    // 更新资源
    async function updateResource(resource) {
        const client = await initApiClient()
        const kind = resource.kind
        const name = resource.metadata.name
        const namespace = resource.metadata?.namespace || getNamespace()
        const path = getApiPath(kind, namespace)

        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await client.put(`${path}/${name}`, resource)
        return response.data
    }

    // 删除资源
    async function deleteResource(kind, name, namespace) {
        const client = await initApiClient()
        const ns = namespace || getNamespace()
        const path = getApiPath(kind, ns)
        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await client.delete(`${path}/${name}`)
        return response.data
    }

    // 删除整个资源组合
    async function deleteComposition(compositionId, namespace) {
        const ns = namespace || getNamespace()
        const resources = await getCompositionResources(compositionId, ns)
        const errors = []

        for (const resource of resources) {
            try {
                await deleteResource(resource.kind, resource.metadata.name, ns)
            } catch (error) {
                errors.push({
                    resource: resource.metadata.name,
                    error: error.message
                })
            }
        }

        return { deleted: resources.length - errors.length, errors }
    }

    // 获取当前配置信息（用于调试）
    async function getConfigInfo() {
        await initApiClient()
        return {
            mode: k8sConfig.mode,
            apiServer: effectiveConfig?.apiServer?.replace(/\/\/.*@/, '//***@'),
            namespace: effectiveConfig?.namespace,
            isInCluster: isRunningInCluster()
        }
    }

    return {
        createResource,
        createResources,
        getResource,
        getResourcesByLabel,
        getCompositionResources,
        listCompositions,
        updateResource,
        deleteResource,
        deleteComposition,
        getConfigInfo,
        getNamespace,
        // ConfigMap 注册表操作
        getCompositionsRegistry,
        updateCompositionsRegistry,
        removeFromRegistry,
        config: k8sConfig
    }
}
