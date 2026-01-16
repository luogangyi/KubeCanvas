// K8s 资源模板生成器
import { v4 as uuidv4 } from 'uuid'

// 生成资源组合标签
export function generateCompositionLabel() {
    return `composition-${uuidv4().slice(0, 8)}`
}

// 基础标签
export function getBaseLabels(compositionId, resourceName) {
    return {
        'kubecanvas.io/composition': compositionId,
        'kubecanvas.io/managed-by': 'kubecanvas',
        'app.kubernetes.io/name': resourceName
    }
}

// Deployment 模板
export function createDeploymentTemplate(name, options = {}) {
    const {
        replicas = 1,
        image = 'nginx:latest',
        containerPort = 80,
        labels = {},
        namespace = 'default'
    } = options

    const appLabels = {
        app: name,
        ...labels
    }

    return {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
            name,
            namespace,
            labels: appLabels
        },
        spec: {
            replicas,
            selector: {
                matchLabels: {
                    app: name
                }
            },
            template: {
                metadata: {
                    labels: {
                        app: name
                    }
                },
                spec: {
                    containers: [
                        {
                            name: name,
                            image,
                            ports: [
                                {
                                    containerPort
                                }
                            ]
                        }
                    ]
                }
            }
        }
    }
}

// DaemonSet 模板
export function createDaemonSetTemplate(name, options = {}) {
    const {
        image = 'nginx:latest',
        containerPort = 80,
        labels = {},
        namespace = 'default'
    } = options

    const appLabels = {
        app: name,
        ...labels
    }

    return {
        apiVersion: 'apps/v1',
        kind: 'DaemonSet',
        metadata: {
            name,
            namespace,
            labels: appLabels
        },
        spec: {
            selector: {
                matchLabels: {
                    app: name
                }
            },
            template: {
                metadata: {
                    labels: {
                        app: name
                    }
                },
                spec: {
                    containers: [
                        {
                            name: name,
                            image,
                            ports: [
                                {
                                    containerPort
                                }
                            ]
                        }
                    ]
                }
            }
        }
    }
}

// StatefulSet 模板
export function createStatefulSetTemplate(name, options = {}) {
    const {
        replicas = 1,
        image = 'nginx:latest',
        containerPort = 80,
        serviceName = name,
        labels = {},
        namespace = 'default'
    } = options

    const appLabels = {
        app: name,
        ...labels
    }

    return {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: {
            name,
            namespace,
            labels: appLabels
        },
        spec: {
            serviceName,
            replicas,
            selector: {
                matchLabels: {
                    app: name
                }
            },
            template: {
                metadata: {
                    labels: {
                        app: name
                    }
                },
                spec: {
                    containers: [
                        {
                            name: name,
                            image,
                            ports: [
                                {
                                    containerPort
                                }
                            ]
                        }
                    ]
                }
            }
        }
    }
}

// Service 模板
export function createServiceTemplate(name, options = {}) {
    const {
        type = 'ClusterIP',
        port = 80,
        targetPort = 80,
        nodePort = null,
        selector = {},
        labels = {},
        namespace = 'default'
    } = options

    const serviceLabels = {
        app: name,
        ...labels
    }

    const spec = {
        type,
        ports: [
            {
                port,
                targetPort,
                protocol: 'TCP'
            }
        ],
        selector
    }

    if (type === 'NodePort' && nodePort) {
        spec.ports[0].nodePort = nodePort
    }

    return {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
            name,
            namespace,
            labels: serviceLabels
        },
        spec
    }
}

// Pod 模板
export function createPodTemplate(name, options = {}) {
    const {
        image = 'nginx:latest',
        containerPort = 80,
        labels = {},
        namespace = 'default'
    } = options

    const podLabels = {
        app: name,
        ...labels
    }

    return {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name,
            namespace,
            labels: podLabels
        },
        spec: {
            containers: [
                {
                    name: name,
                    image,
                    ports: [
                        {
                            containerPort
                        }
                    ]
                }
            ]
        }
    }
}

// Ingress 模板
export function createIngressTemplate(name, options = {}) {
    const {
        host = 'example.com',
        path = '/',
        serviceName = '',
        servicePort = 80,
        labels = {},
        namespace = 'default'
    } = options

    return {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
            name,
            namespace,
            labels: {
                app: name,
                ...labels
            }
        },
        spec: {
            rules: [
                {
                    host,
                    http: {
                        paths: [
                            {
                                path,
                                pathType: 'Prefix',
                                backend: {
                                    service: {
                                        name: serviceName,
                                        port: {
                                            number: servicePort
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }
}

// ConfigMap 模板
export function createConfigMapTemplate(name, options = {}) {
    const {
        data = {},
        labels = {},
        namespace = 'default'
    } = options

    return {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
            name,
            namespace,
            labels: {
                app: name,
                ...labels
            }
        },
        data
    }
}

// Secret 模板
export function createSecretTemplate(name, options = {}) {
    const {
        type = 'Opaque',
        data = {},
        stringData = {},
        labels = {},
        namespace = 'default'
    } = options

    return {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name,
            namespace,
            labels: {
                app: name,
                ...labels
            }
        },
        type,
        data,
        stringData
    }
}

// PVC 模板
export function createPVCTemplate(name, options = {}) {
    const {
        storageClassName = '',
        accessModes = ['ReadWriteOnce'],
        storage = '1Gi',
        labels = {},
        namespace = 'default'
    } = options

    return {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
            name,
            namespace,
            labels: {
                app: name,
                ...labels
            }
        },
        spec: {
            storageClassName: storageClassName || undefined,
            accessModes,
            resources: {
                requests: {
                    storage
                }
            }
        }
    }
}

// Job 模板
export function createJobTemplate(name, options = {}) {
    const {
        image = 'busybox',
        command = ['echo', 'Hello, World!'],
        restartPolicy = 'Never',
        backoffLimit = 4,
        labels = {},
        namespace = 'default'
    } = options

    return {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
            name,
            namespace,
            labels: {
                app: name,
                ...labels
            }
        },
        spec: {
            backoffLimit,
            template: {
                metadata: {
                    labels: {
                        app: name
                    }
                },
                spec: {
                    containers: [
                        {
                            name: name,
                            image,
                            command
                        }
                    ],
                    restartPolicy
                }
            }
        }
    }
}

// CronJob 模板
export function createCronJobTemplate(name, options = {}) {
    const {
        schedule = '*/5 * * * *',
        image = 'busybox',
        command = ['echo', 'Hello, World!'],
        restartPolicy = 'OnFailure',
        labels = {},
        namespace = 'default'
    } = options

    return {
        apiVersion: 'batch/v1',
        kind: 'CronJob',
        metadata: {
            name,
            namespace,
            labels: {
                app: name,
                ...labels
            }
        },
        spec: {
            schedule,
            jobTemplate: {
                spec: {
                    template: {
                        metadata: {
                            labels: {
                                app: name
                            }
                        },
                        spec: {
                            containers: [
                                {
                                    name: name,
                                    image,
                                    command
                                }
                            ],
                            restartPolicy
                        }
                    }
                }
            }
        }
    }
}

// Namespace 模板
export function createNamespaceTemplate(name, options = {}) {
    const {
        labels = {}
    } = options

    return {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
            name,
            labels: {
                'kubernetes.io/metadata.name': name,
                ...labels
            }
        }
    }
}

// 根据类型创建资源模板
export function createResourceTemplate(type, name, options = {}) {
    const templateCreators = {
        deployment: createDeploymentTemplate,
        daemonset: createDaemonSetTemplate,
        statefulset: createStatefulSetTemplate,
        service: createServiceTemplate,
        pod: createPodTemplate,
        ingress: createIngressTemplate,
        configmap: createConfigMapTemplate,
        secret: createSecretTemplate,
        pvc: createPVCTemplate,
        job: createJobTemplate,
        cronjob: createCronJobTemplate,
        namespace: createNamespaceTemplate
    }

    const creator = templateCreators[type.toLowerCase()]
    if (!creator) {
        throw new Error(`Unknown resource type: ${type}`)
    }

    return creator(name, options)
}

// 资源类型配置 - Namespace 放在最前面
export const resourceTypes = [
    {
        type: 'namespace',
        name: 'Namespace',
        description: '命名空间容器',
        icon: 'ns',
        color: '#6b7280',
        category: 'namespace'
    },
    {
        type: 'deployment',
        name: 'Deployment',
        description: '无状态应用部署',
        icon: 'deploy',
        color: '#3b82f6',
        category: 'workloads'
    },
    {
        type: 'daemonset',
        name: 'DaemonSet',
        description: '每节点运行一个Pod',
        icon: 'ds',
        color: '#7c3aed',
        category: 'workloads'
    },
    {
        type: 'statefulset',
        name: 'StatefulSet',
        description: '有状态应用部署',
        icon: 'sts',
        color: '#a855f7',
        category: 'workloads'
    },
    {
        type: 'pod',
        name: 'Pod',
        description: '单个容器组',
        icon: 'pod',
        color: '#0891b2',
        category: 'workloads'
    },
    {
        type: 'job',
        name: 'Job',
        description: '一次性任务',
        icon: 'job',
        color: '#059669',
        category: 'workloads'
    },
    {
        type: 'cronjob',
        name: 'CronJob',
        description: '定时任务',
        icon: 'cronjob',
        color: '#db2777',
        category: 'workloads'
    },
    {
        type: 'service',
        name: 'Service',
        description: '服务发现与负载均衡',
        icon: 'svc',
        color: '#16a34a',
        category: 'networking'
    },
    {
        type: 'ingress',
        name: 'Ingress',
        description: 'HTTP/HTTPS 路由',
        icon: 'ing',
        color: '#ea580c',
        category: 'networking'
    },
    {
        type: 'configmap',
        name: 'ConfigMap',
        description: '配置数据',
        icon: 'cm',
        color: '#d97706',
        category: 'config'
    },
    {
        type: 'secret',
        name: 'Secret',
        description: '敏感数据',
        icon: 'secret',
        color: '#dc2626',
        category: 'config'
    },
    {
        type: 'pvc',
        name: 'PVC',
        description: '持久化存储',
        icon: 'pvc',
        color: '#4f46e5',
        category: 'storage'
    }
]

// 获取资源类型配置
export function getResourceTypeConfig(type) {
    return resourceTypes.find(r => r.type === type.toLowerCase())
}
