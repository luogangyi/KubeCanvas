/**
 * Field Locking Composable
 * 
 * Provides reactive field editability checking for K8s resources in Edit Mode.
 * Integrates with the immutablePaths configuration.
 */

import { computed, type Ref, type ComputedRef } from 'vue'
import { isFieldEditable, type FieldEditability } from '../config/immutablePaths'

/**
 * Edit mode for the current resource
 */
export type EditMode = 'create' | 'edit'

/**
 * Mapping from UI field names to K8s spec paths
 * This maps the PropertyPanel field names to the actual K8s API paths
 */
export const FIELD_PATH_MAPPING: Record<string, Record<string, string>> = {
    // Common fields
    Common: {
        name: 'metadata.name',
        namespace: 'metadata.namespace',
        labels: 'metadata.labels',
        annotations: 'metadata.annotations',
    },

    // Deployment
    Deployment: {
        replicas: 'spec.replicas',
        strategyType: 'spec.strategy.type',
        selector: 'spec.selector',
        restartPolicy: 'spec.template.spec.restartPolicy',
        serviceAccountName: 'spec.template.spec.serviceAccountName',
        nodeSelector: 'spec.template.spec.nodeSelector',
        containers: 'spec.template.spec.containers',
        volumes: 'spec.template.spec.volumes',
    },

    // StatefulSet
    StatefulSet: {
        replicas: 'spec.replicas',
        serviceName: 'spec.serviceName',
        selector: 'spec.selector',
        restartPolicy: 'spec.template.spec.restartPolicy',
        serviceAccountName: 'spec.template.spec.serviceAccountName',
        containers: 'spec.template.spec.containers',
        volumes: 'spec.template.spec.volumes',
    },

    // Service
    Service: {
        serviceType: 'spec.type',
        selector: 'spec.selector',
        ports: 'spec.ports',
        clusterIP: 'spec.clusterIP',
        externalName: 'spec.externalName',
    },

    // PVC
    PersistentVolumeClaim: {
        storage: 'spec.resources.requests.storage',
        accessModes: 'spec.accessModes',
        storageClassName: 'spec.storageClassName',
        volumeName: 'spec.volumeName',
        localPVEnabled: 'spec.volumeName',
        localPVNode: 'spec.volumeName',
        localPVPath: 'spec.volumeName',
        localPVName: 'spec.volumeName',
        localPVReclaimPolicy: 'spec.volumeName',
    },

    // ConfigMap
    ConfigMap: {
        configData: 'data',
        immutable: 'immutable',
    },

    // Secret
    Secret: {
        secretType: 'type',
        secretData: 'data',
        immutable: 'immutable',
    },

    // Job
    Job: {
        completions: 'spec.completions',
        parallelism: 'spec.parallelism',
        backoffLimit: 'spec.backoffLimit',
        containers: 'spec.template.spec.containers',
        volumes: 'spec.template.spec.volumes',
    },

    // CronJob
    CronJob: {
        schedule: 'spec.schedule',
        concurrencyPolicy: 'spec.concurrencyPolicy',
        backoffLimit: 'spec.jobTemplate.spec.backoffLimit',
        containers: 'spec.jobTemplate.spec.template.spec.containers',
        volumes: 'spec.jobTemplate.spec.template.spec.volumes',
    },

    // Ingress
    Ingress: {
        ingressClassName: 'spec.ingressClassName',
        rules: 'spec.rules',
        tls: 'spec.tls',
    },
}

/**
 * Normalize resource kind to match IMMUTABLE_PATHS keys
 */
function normalizeKind(kind: string): string {
    const mapping: Record<string, string> = {
        deployment: 'Deployment',
        statefulset: 'StatefulSet',
        daemonset: 'DaemonSet',
        replicaset: 'ReplicaSet',
        service: 'Service',
        ingress: 'Ingress',
        configmap: 'ConfigMap',
        secret: 'Secret',
        pvc: 'PersistentVolumeClaim',
        persistentvolumeclaim: 'PersistentVolumeClaim',
        job: 'Job',
        cronjob: 'CronJob',
        namespace: 'Namespace',
        pod: 'Pod',
    }
    return mapping[kind.toLowerCase()] || kind
}

/**
 * Get the K8s API path for a UI field
 */
export function getFieldPath(kind: string, uiField: string): string {
    const normalizedKind = normalizeKind(kind)

    // Check kind-specific mapping first
    const kindMapping = FIELD_PATH_MAPPING[normalizedKind]
    if (kindMapping?.[uiField]) {
        return kindMapping[uiField]
    }

    // Check common mapping
    const commonMapping = FIELD_PATH_MAPPING.Common
    if (commonMapping?.[uiField]) {
        return commonMapping[uiField]
    }

    // Default: assume the uiField is the path
    return uiField
}

/**
 * Composable for field locking functionality
 */
export function useFieldLocking(
    resourceKind: Ref<string> | ComputedRef<string>,
    mode: Ref<EditMode> | ComputedRef<EditMode>
) {
    /**
     * Check if a field is editable
     */
    function checkField(uiField: string): FieldEditability {
        const kind = normalizeKind(resourceKind.value)
        const path = getFieldPath(kind, uiField)
        return isFieldEditable(kind, path, mode.value)
    }

    /**
     * Check if a field can be edited (simple boolean)
     */
    function canEdit(uiField: string): boolean {
        return checkField(uiField).editable
    }

    /**
     * Get tooltip message for a locked field
     */
    function getLockTooltip(uiField: string): string | null {
        const result = checkField(uiField)

        if (!result.editable) {
            return result.reason || '此字段不可变。如需修改，请删除并重建资源。'
        }

        if (result.note) {
            return result.note
        }

        return null
    }

    /**
     * Check if a field has a warning note (conditionally editable)
     */
    function hasWarning(uiField: string): boolean {
        const result = checkField(uiField)
        return result.editable && !!result.note
    }

    /**
     * Get computed editability for a specific field
     */
    function fieldEditability(uiField: string): ComputedRef<FieldEditability> {
        return computed(() => checkField(uiField))
    }

    return {
        checkField,
        canEdit,
        getLockTooltip,
        hasWarning,
        fieldEditability,
        mode,
    }
}

/**
 * Determine edit mode based on whether resource has a resourceVersion
 */
export function getEditMode(resource: { metadata?: { resourceVersion?: string } } | null): EditMode {
    if (!resource?.metadata?.resourceVersion) {
        return 'create'
    }
    return 'edit'
}
