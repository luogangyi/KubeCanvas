// K8s API 调用封装
import axios from 'axios'
import k8sConfig from '../config/k8s.config.js'

// 创建 axios 实例
const apiClient = axios.create({
    baseURL: k8sConfig.apiServer,
    timeout: k8sConfig.timeout,
    headers: {
        'Authorization': `Bearer ${k8sConfig.token}`,
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
apiClient.interceptors.request.use(
    config => {
        // 如果配置为跳过 TLS 验证，可以在这里处理
        // 注意：在浏览器环境中无法直接跳过 TLS 验证
        // 需要通过 Vite 代理来处理
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 响应拦截器
apiClient.interceptors.response.use(
    response => response,
    error => {
        console.error('K8s API Error:', error)
        return Promise.reject(error)
    }
)

// 获取 API 路径
function getApiPath(kind, namespace = k8sConfig.namespace) {
    const paths = {
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

// K8s API 组合函数
export function useK8sApi() {
    // 创建资源
    async function createResource(resource) {
        const kind = resource.kind
        const namespace = resource.metadata?.namespace || k8sConfig.namespace
        const path = getApiPath(kind, namespace)

        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await apiClient.post(path, resource)
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
    async function getResource(kind, name, namespace = k8sConfig.namespace) {
        const path = getApiPath(kind, namespace)
        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await apiClient.get(`${path}/${name}`)
        return response.data
    }

    // 按标签查询资源
    async function getResourcesByLabel(kind, labelSelector, namespace = k8sConfig.namespace) {
        const path = getApiPath(kind, namespace)
        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await apiClient.get(path, {
            params: { labelSelector }
        })
        return response.data.items
    }

    // 查询所有资源组合
    async function getCompositionResources(compositionId, namespace = k8sConfig.namespace) {
        const labelSelector = `kubecanvas.io/composition=${compositionId}`
        const kinds = ['Deployment', 'StatefulSet', 'Service', 'Pod', 'Ingress', 'ConfigMap', 'Secret', 'PersistentVolumeClaim', 'Job', 'CronJob']

        const allResources = []

        for (const kind of kinds) {
            try {
                const resources = await getResourcesByLabel(kind, labelSelector, namespace)
                allResources.push(...resources)
            } catch (error) {
                // 忽略不存在的资源类型错误
                console.warn(`Failed to get ${kind}:`, error.message)
            }
        }

        return allResources
    }

    // 获取所有资源组合列表
    async function listCompositions(namespace = k8sConfig.namespace) {
        const labelSelector = 'kubecanvas.io/managed-by=kubecanvas'
        const compositions = new Map()

        const kinds = ['Deployment', 'StatefulSet', 'Service']

        for (const kind of kinds) {
            try {
                const resources = await getResourcesByLabel(kind, labelSelector, namespace)
                for (const resource of resources) {
                    const compositionId = resource.metadata.labels?.['kubecanvas.io/composition']
                    if (compositionId && !compositions.has(compositionId)) {
                        compositions.set(compositionId, {
                            id: compositionId,
                            name: compositionId,
                            createdAt: resource.metadata.creationTimestamp,
                            resourceCount: 0
                        })
                    }
                    if (compositionId) {
                        compositions.get(compositionId).resourceCount++
                    }
                }
            } catch (error) {
                console.warn(`Failed to list ${kind}:`, error.message)
            }
        }

        return Array.from(compositions.values())
    }

    // 更新资源
    async function updateResource(resource) {
        const kind = resource.kind
        const name = resource.metadata.name
        const namespace = resource.metadata?.namespace || k8sConfig.namespace
        const path = getApiPath(kind, namespace)

        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await apiClient.put(`${path}/${name}`, resource)
        return response.data
    }

    // 删除资源
    async function deleteResource(kind, name, namespace = k8sConfig.namespace) {
        const path = getApiPath(kind, namespace)
        if (!path) {
            throw new Error(`Unsupported resource kind: ${kind}`)
        }

        const response = await apiClient.delete(`${path}/${name}`)
        return response.data
    }

    // 删除整个资源组合
    async function deleteComposition(compositionId, namespace = k8sConfig.namespace) {
        const resources = await getCompositionResources(compositionId, namespace)
        const errors = []

        for (const resource of resources) {
            try {
                await deleteResource(resource.kind, resource.metadata.name, namespace)
            } catch (error) {
                errors.push({
                    resource: resource.metadata.name,
                    error: error.message
                })
            }
        }

        return { deleted: resources.length - errors.length, errors }
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
        config: k8sConfig
    }
}
