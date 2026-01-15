/**
 * K8s 资源连线验证规则
 * 
 * 基于 Kubernetes 语义定义合法的资源连接关系，
 * 防止用户创建无效的拓扑结构。
 */

// =============================================
// 合法连接白名单 (Allowlist)
// key: 源资源类型, value: 允许连接的目标资源类型数组
// =============================================
const CONNECTION_ALLOWLIST = {
    // Ingress 只能连接 Service (路由转发)
    ingress: ['service'],

    // Service 连接工作负载 (标签选择器)
    service: ['deployment', 'daemonset', 'statefulset', 'pod'],

    // Deployment 连接存储/配置资源 (挂载/环境变量)
    deployment: ['pvc', 'configmap', 'secret'],

    // DaemonSet 连接存储/配置资源
    daemonset: ['pvc', 'configmap', 'secret'],

    // StatefulSet 连接存储/配置资源，还可连接 Service (Headless)
    statefulset: ['pvc', 'configmap', 'secret', 'service'],

    // Job 连接存储/配置资源
    job: ['pvc', 'configmap', 'secret'],

    // CronJob 连接存储/配置资源
    cronjob: ['pvc', 'configmap', 'secret'],

    // Pod 连接存储/配置资源
    pod: ['pvc', 'configmap', 'secret'],
}

// =============================================
// 资源类型分类
// =============================================
const RESOURCE_CATEGORIES = {
    // 网络入口层
    networking: ['ingress', 'service'],
    // 工作负载层
    workloads: ['deployment', 'daemonset', 'statefulset', 'pod', 'job', 'cronjob'],
    // 配置层
    config: ['configmap', 'secret'],
    // 存储层
    storage: ['pvc'],
    // 集群级资源
    cluster: ['namespace']
}

// =============================================
// 中文资源名称映射
// =============================================
const RESOURCE_NAMES = {
    ingress: 'Ingress',
    service: 'Service',
    deployment: 'Deployment',
    daemonset: 'DaemonSet',
    statefulset: 'StatefulSet',
    pod: 'Pod',
    job: 'Job',
    cronjob: 'CronJob',
    configmap: 'ConfigMap',
    secret: 'Secret',
    pvc: 'PVC',
    namespace: 'Namespace'
}

// =============================================
// 错误原因生成
// =============================================
function getInvalidReason(sourceType, targetType) {
    const sourceName = RESOURCE_NAMES[sourceType] || sourceType
    const targetName = RESOURCE_NAMES[targetType] || targetType

    // 配置类资源互连
    const configTypes = ['configmap', 'secret', 'pvc']
    if (configTypes.includes(sourceType) && configTypes.includes(targetType)) {
        return `配置/存储资源 (${sourceName}, ${targetName}) 之间不能互相连接`
    }

    // 反向依赖检查
    if (sourceType === 'pod' && targetType === 'service') {
        return `Pod 是被 Service 选择的，请从 Service 连接到 Pod`
    }
    if (configTypes.includes(sourceType) && RESOURCE_CATEGORIES.workloads.includes(targetType)) {
        return `${sourceName} 是被工作负载挂载的，请从 ${targetName} 连接到 ${sourceName}`
    }

    // 跨层级连接
    if (sourceType === 'ingress' && targetType !== 'service') {
        return `Ingress 必须连接到 Service，不能直接连接 ${targetName}`
    }

    // Service 只能选择工作负载
    if (sourceType === 'service' && configTypes.includes(targetType)) {
        return `Service 只能选择工作负载 (Deployment/Pod 等)，不能选择 ${targetName}`
    }

    // 通用提示
    return `${sourceName} 不能连接到 ${targetName}，这在 Kubernetes 中没有对应的语义关系`
}

/**
 * 验证两个资源之间是否可以创建连接 (双向检查)
 * 连接是无方向的 - 只要两种资源类型之间存在有效关系即可
 * @param {string} sourceType - 源资源类型 (如 'deployment')
 * @param {string} targetType - 目标资源类型 (如 'service')
 * @param {string} sourceId - 源资源 ID (用于检查自环)
 * @param {string} targetId - 目标资源 ID (用于检查自环)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateConnection(sourceType, targetType, sourceId = null, targetId = null) {
    // 1. 自环检查
    if (sourceId && targetId && sourceId === targetId) {
        return {
            valid: false,
            reason: '不能连接到自己'
        }
    }

    // 2. Namespace 不参与连线
    if (sourceType === 'namespace' || targetType === 'namespace') {
        return {
            valid: false,
            reason: 'Namespace 是容器组件，不能作为连线的起点或终点'
        }
    }

    // 3. 双向白名单检查 - 只要任意方向合法即可
    const forwardAllowed = CONNECTION_ALLOWLIST[sourceType]?.includes(targetType)
    const reverseAllowed = CONNECTION_ALLOWLIST[targetType]?.includes(sourceType)

    if (!forwardAllowed && !reverseAllowed) {
        return {
            valid: false,
            reason: getInvalidReason(sourceType, targetType)
        }
    }

    return { valid: true }
}

/**
 * 获取指定资源类型可以连接的目标类型列表
 * @param {string} sourceType - 源资源类型
 * @returns {string[]} - 允许的目标类型数组
 */
export function getAllowedTargets(sourceType) {
    return CONNECTION_ALLOWLIST[sourceType] || []
}

/**
 * 检查资源类型是否可以作为连线起点
 * @param {string} type - 资源类型
 * @returns {boolean}
 */
export function canBeSource(type) {
    return type !== 'namespace' && CONNECTION_ALLOWLIST.hasOwnProperty(type)
}

/**
 * 检查资源类型是否可以作为连线终点
 * @param {string} type - 资源类型
 * @returns {boolean}
 */
export function canBeTarget(type) {
    if (type === 'namespace') return false
    // 检查是否在任何白名单中作为目标
    return Object.values(CONNECTION_ALLOWLIST).some(targets => targets.includes(type))
}

export default {
    validateConnection,
    getAllowedTargets,
    canBeSource,
    canBeTarget,
    CONNECTION_ALLOWLIST,
    RESOURCE_NAMES
}
