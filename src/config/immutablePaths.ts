/**
 * Kubernetes Immutable Field Paths Configuration
 * 
 * This file defines fields that cannot be updated after resource creation.
 * Used for field locking in Edit Mode.
 * 
 * Sources:
 * 1. Auto-generated from K8s JSON Schema scan (immutables-report.json)
 * 2. Kubernetes API conventions and official documentation
 * 
 * Path format: lodash-style dot notation (e.g., "spec.selector.matchLabels")
 */

/**
 * Common immutable fields shared by all resources
 */
export const COMMON_IMMUTABLE_PATHS = [
    'apiVersion',
    'kind',
    'metadata.name',
    'metadata.namespace',
] as const;

/**
 * Immutable field paths organized by resource Kind
 * Includes both auto-detected fields and manually verified K8s constraints
 */
export const IMMUTABLE_PATHS: Record<string, readonly string[]> = {
    // =========================================
    // Workload Resources
    // =========================================

    Deployment: [
        ...COMMON_IMMUTABLE_PATHS,
        // CRITICAL: selector is immutable after creation
        'spec.selector',
        'spec.selector.matchLabels',
        'spec.selector.matchExpressions',
    ],

    StatefulSet: [
        ...COMMON_IMMUTABLE_PATHS,
        // CRITICAL: These are immutable for StatefulSet
        'spec.selector',
        'spec.selector.matchLabels',
        'spec.selector.matchExpressions',
        'spec.serviceName',
        'spec.podManagementPolicy',
        // volumeClaimTemplates cannot be modified after creation
        'spec.volumeClaimTemplates',
        'spec.volumeClaimTemplates[].metadata.name',
        'spec.volumeClaimTemplates[].spec.storageClassName',
        'spec.volumeClaimTemplates[].spec.volumeMode',
        'spec.volumeClaimTemplates[].spec.accessModes',
    ],

    DaemonSet: [
        ...COMMON_IMMUTABLE_PATHS,
        'spec.selector',
        'spec.selector.matchLabels',
        'spec.selector.matchExpressions',
    ],

    ReplicaSet: [
        ...COMMON_IMMUTABLE_PATHS,
        'spec.selector',
        'spec.selector.matchLabels',
        'spec.selector.matchExpressions',
    ],

    Job: [
        ...COMMON_IMMUTABLE_PATHS,
        'spec.selector',
        'spec.selector.matchLabels',
        'spec.completionMode',
        'spec.backoffLimitPerIndex',
        'spec.managedBy',
        // Most Job spec fields are immutable after creation
        'spec.template',
    ],

    CronJob: [
        ...COMMON_IMMUTABLE_PATHS,
        // CronJob itself is more flexible, but job template has constraints
        'spec.jobTemplate.spec.selector',
        'spec.jobTemplate.spec.completionMode',
        'spec.jobTemplate.spec.backoffLimitPerIndex',
        'spec.jobTemplate.spec.managedBy',
    ],

    // =========================================
    // Service & Networking Resources
    // =========================================

    Service: [
        ...COMMON_IMMUTABLE_PATHS,
        // ClusterIP is immutable once assigned
        'spec.clusterIP',
        'spec.clusterIPs',
        // IP family settings are immutable
        'spec.ipFamilies',
        'spec.ipFamilyPolicy',
        // healthCheckNodePort is immutable once set
        'spec.healthCheckNodePort',
    ],

    Ingress: [
        ...COMMON_IMMUTABLE_PATHS,
        // Ingress is relatively flexible, main immutables are common fields
    ],

    // =========================================
    // Storage Resources
    // =========================================

    PersistentVolumeClaim: [
        ...COMMON_IMMUTABLE_PATHS,
        // PVC spec is largely immutable after creation
        'spec.storageClassName',
        'spec.volumeMode',
        'spec.accessModes',
        'spec.volumeName',  // Immutable once bound
        'spec.dataSource',
        'spec.dataSourceRef',
    ],

    PersistentVolume: [
        ...COMMON_IMMUTABLE_PATHS,
        'spec.storageClassName',
        'spec.volumeMode',
        'spec.accessModes',
        'spec.capacity',
        'spec.persistentVolumeReclaimPolicy',
        // Volume source is immutable
        'spec.hostPath',
        'spec.nfs',
        'spec.csi',
        'spec.local',
    ],

    StorageClass: [
        ...COMMON_IMMUTABLE_PATHS,
        // StorageClass is almost entirely immutable
        'provisioner',
        'reclaimPolicy',
        'volumeBindingMode',
        'allowVolumeExpansion',
        'parameters',
    ],

    // =========================================
    // Config Resources
    // =========================================

    ConfigMap: [
        ...COMMON_IMMUTABLE_PATHS,
        // When immutable is set to true, data becomes immutable
        'immutable',
    ],

    Secret: [
        ...COMMON_IMMUTABLE_PATHS,
        'type',  // Secret type cannot be changed
        'immutable',
    ],

    // =========================================
    // RBAC Resources
    // =========================================

    ServiceAccount: [
        ...COMMON_IMMUTABLE_PATHS,
    ],

    Role: [
        ...COMMON_IMMUTABLE_PATHS,
    ],

    ClusterRole: [
        ...COMMON_IMMUTABLE_PATHS,
    ],

    RoleBinding: [
        ...COMMON_IMMUTABLE_PATHS,
        'roleRef',  // roleRef is immutable
        'roleRef.apiGroup',
        'roleRef.kind',
        'roleRef.name',
    ],

    ClusterRoleBinding: [
        ...COMMON_IMMUTABLE_PATHS,
        'roleRef',
        'roleRef.apiGroup',
        'roleRef.kind',
        'roleRef.name',
    ],

    // =========================================
    // Namespace & Quota Resources
    // =========================================

    Namespace: [
        ...COMMON_IMMUTABLE_PATHS,
    ],

    ResourceQuota: [
        ...COMMON_IMMUTABLE_PATHS,
    ],

    LimitRange: [
        ...COMMON_IMMUTABLE_PATHS,
    ],
} as const;

/**
 * Fields that are immutable for ALL container specs
 * (applies to containers, initContainers, ephemeralContainers)
 */
export const CONTAINER_IMMUTABLE_FIELDS = [
    'name',           // Container name cannot be changed
    'ports',          // Ports cannot be updated
    'volumeMounts',   // Volume mounts cannot be updated
] as const;

/**
 * Type helpers for strict typing
 */
export type ResourceKind = keyof typeof IMMUTABLE_PATHS;
export type ImmutablePath = typeof IMMUTABLE_PATHS[ResourceKind][number];

/**
 * Helper function to check if a field path is immutable for a given resource
 */
export function isImmutableField(kind: string, fieldPath: string): boolean {
    const paths = IMMUTABLE_PATHS[kind];
    if (!paths) return false;

    // Check exact match
    if (paths.includes(fieldPath)) return true;

    // Check if any parent path is immutable (e.g., spec.selector is immutable means spec.selector.matchLabels is too)
    for (const immutablePath of paths) {
        if (fieldPath.startsWith(immutablePath + '.') || fieldPath.startsWith(immutablePath + '[')) {
            return true;
        }
    }

    return false;
}

/**
 * Get all immutable paths for a resource, including common paths
 */
export function getImmutablePaths(kind: string): readonly string[] {
    return IMMUTABLE_PATHS[kind] ?? COMMON_IMMUTABLE_PATHS;
}

// =========================================
// Field Editability API
// =========================================

/**
 * Special fields that have conditional editability rules
 */
export const CONDITIONAL_EDITABLE_FIELDS: Record<string, Record<string, string>> = {
    PersistentVolumeClaim: {
        'spec.resources.requests.storage': 'Only expansion allowed',
    },
    Service: {
        'spec.type': 'Some type transitions are not allowed',
    },
} as const;

/**
 * Result of field editability check
 */
export interface FieldEditability {
    /** Whether the field can be edited */
    editable: boolean;
    /** Reason why the field cannot be edited (only when editable is false) */
    reason?: string;
    /** Additional note for conditionally editable fields */
    note?: string;
}

/**
 * Check if a field is editable for a given resource kind and mode
 * 
 * @param kind - Resource kind (e.g., 'Deployment', 'Service')
 * @param path - Field path in lodash dot notation (e.g., 'spec.replicas')
 * @param mode - 'create' for new resources, 'edit' for existing resources
 * @returns FieldEditability object with editable status and optional notes
 * 
 * @example
 * ```ts
 * isFieldEditable('Deployment', 'spec.selector', 'edit')
 * // => { editable: false, reason: 'Field is immutable after creation' }
 * 
 * isFieldEditable('PersistentVolumeClaim', 'spec.resources.requests.storage', 'edit')
 * // => { editable: true, note: 'Only expansion allowed' }
 * ```
 */
export function isFieldEditable(
    kind: string,
    path: string,
    mode: 'create' | 'edit'
): FieldEditability {
    // In create mode, all fields are editable
    if (mode === 'create') {
        return { editable: true };
    }

    // In edit mode, check for immutable fields
    const immutablePaths = IMMUTABLE_PATHS[kind] ?? [];

    // Check if the path is immutable
    const isImmutable = checkPathImmutable(path, immutablePaths);

    if (isImmutable) {
        return {
            editable: false,
            reason: 'Field is immutable after creation',
        };
    }

    // Check for conditionally editable fields
    const conditionalFields = CONDITIONAL_EDITABLE_FIELDS[kind];
    if (conditionalFields && conditionalFields[path]) {
        return {
            editable: true,
            note: conditionalFields[path],
        };
    }

    // Field is fully editable
    return { editable: true };
}

/**
 * Check if a path matches any immutable path pattern
 */
function checkPathImmutable(path: string, immutablePaths: readonly string[]): boolean {
    for (const immutablePath of immutablePaths) {
        // Exact match
        if (path === immutablePath) {
            return true;
        }

        // Path is a child of an immutable path
        // e.g., 'spec.selector.matchLabels.app' is immutable if 'spec.selector' is immutable
        if (path.startsWith(immutablePath + '.') || path.startsWith(immutablePath + '[')) {
            return true;
        }

        // Handle array notation matching
        // e.g., 'spec.volumeClaimTemplates[0].metadata.name' matches 'spec.volumeClaimTemplates[].metadata.name'
        const normalizedPath = path.replace(/\[\d+\]/g, '[]');
        if (normalizedPath === immutablePath) {
            return true;
        }
        if (normalizedPath.startsWith(immutablePath + '.') || normalizedPath.startsWith(immutablePath + '[')) {
            return true;
        }
    }

    return false;
}

/**
 * Simple boolean version for quick checks
 * Returns true if the field can be edited
 */
export function canEditField(kind: string, path: string, mode: 'create' | 'edit'): boolean {
    return isFieldEditable(kind, path, mode).editable;
}

