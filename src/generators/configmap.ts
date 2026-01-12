/**
 * Kubernetes ConfigMap Generator
 * 
 * Generates Kubernetes ConfigMap YAML from form data.
 */

import * as yaml from 'js-yaml';

// =========================================
// TYPES
// =========================================

export interface ConfigMapForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    data?: Record<string, string>;
    binaryData?: Record<string, string>;
    immutable?: boolean;
}

// =========================================
// GENERATOR
// =========================================

export function generateConfigMap(formData: ConfigMapForm): string {
    const configMap: Record<string, unknown> = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        ...(formData.data && { data: formData.data }),
        ...(formData.binaryData && { binaryData: formData.binaryData }),
        ...(formData.immutable !== undefined && { immutable: formData.immutable }),
    };

    return yaml.dump(configMap, { indent: 2, lineWidth: -1, noRefs: true });
}
