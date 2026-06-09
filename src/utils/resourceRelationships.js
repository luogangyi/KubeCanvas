const SELECTOR_WORKLOAD_KINDS = new Set(['Deployment', 'StatefulSet', 'DaemonSet'])
const TEMPLATE_WORKLOAD_KINDS = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'Job'])

function ensureMetadata(resource) {
    if (!resource.metadata) resource.metadata = {}
    if (!resource.metadata.labels) resource.metadata.labels = {}
    return resource.metadata
}

function getPodTemplateMetadata(resource) {
    if (TEMPLATE_WORKLOAD_KINDS.has(resource.kind)) {
        if (!resource.spec) resource.spec = {}
        if (!resource.spec.template) {
            resource.spec.template = { metadata: { labels: {} }, spec: {} }
        }
        if (!resource.spec.template.metadata) {
            resource.spec.template.metadata = { labels: {} }
        }
        if (!resource.spec.template.metadata.labels) {
            resource.spec.template.metadata.labels = {}
        }
        return resource.spec.template.metadata
    }

    if (resource.kind === 'CronJob') {
        if (!resource.spec) resource.spec = {}
        if (!resource.spec.jobTemplate) {
            resource.spec.jobTemplate = { spec: { template: { metadata: { labels: {} }, spec: {} } } }
        }
        if (!resource.spec.jobTemplate.spec) {
            resource.spec.jobTemplate.spec = { template: { metadata: { labels: {} }, spec: {} } }
        }
        if (!resource.spec.jobTemplate.spec.template) {
            resource.spec.jobTemplate.spec.template = { metadata: { labels: {} }, spec: {} }
        }
        if (!resource.spec.jobTemplate.spec.template.metadata) {
            resource.spec.jobTemplate.spec.template.metadata = { labels: {} }
        }
        if (!resource.spec.jobTemplate.spec.template.metadata.labels) {
            resource.spec.jobTemplate.spec.template.metadata.labels = {}
        }
        return resource.spec.jobTemplate.spec.template.metadata
    }

    return null
}

function syncMutableSelector(resource, appLabel) {
    if (!SELECTOR_WORKLOAD_KINDS.has(resource.kind)) return
    if (resource.metadata?.resourceVersion) return

    if (!resource.spec) resource.spec = {}
    if (!resource.spec.selector) resource.spec.selector = { matchLabels: {} }
    if (!resource.spec.selector.matchLabels) resource.spec.selector.matchLabels = {}

    resource.spec.selector.matchLabels.app = appLabel
}

function syncMutablePodTemplateLabels(resource, appLabel) {
    if (resource.metadata?.resourceVersion) return

    const templateMetadata = getPodTemplateMetadata(resource)
    if (templateMetadata?.labels) {
        templateMetadata.labels.app = appLabel
    }
}

export function syncWorkloadIdentity(resource, appLabel, options = {}) {
    const { updateName = true } = options
    const metadata = ensureMetadata(resource)

    if (updateName) {
        metadata.name = appLabel
    }

    metadata.labels.app = appLabel
    syncMutableSelector(resource, appLabel)
    syncMutablePodTemplateLabels(resource, appLabel)
}
