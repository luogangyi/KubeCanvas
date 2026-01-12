/**
 * Kubernetes Secret Generator
 * 
 * Generates Kubernetes Secret YAML from form data.
 */

import * as yaml from 'js-yaml';

// =========================================
// TYPES
// =========================================

export interface SecretForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    type?: 'Opaque' | 'kubernetes.io/tls' | 'kubernetes.io/dockerconfigjson' | 'kubernetes.io/basic-auth' | 'kubernetes.io/ssh-auth' | 'kubernetes.io/service-account-token';
    data?: Record<string, string>;
    stringData?: Record<string, string>;
    immutable?: boolean;
}

// =========================================
// GENERATOR
// =========================================

export function generateSecret(formData: SecretForm): string {
    const secret: Record<string, unknown> = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        type: formData.type ?? 'Opaque',
        ...(formData.data && { data: formData.data }),
        ...(formData.stringData && { stringData: formData.stringData }),
        ...(formData.immutable !== undefined && { immutable: formData.immutable }),
    };

    return yaml.dump(secret, { indent: 2, lineWidth: -1, noRefs: true });
}
