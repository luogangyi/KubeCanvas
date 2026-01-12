/**
 * Kubernetes Ingress Generator
 * 
 * Generates Kubernetes Ingress YAML from form data.
 */

import * as yaml from 'js-yaml';

// =========================================
// TYPES
// =========================================

export interface IngressBackend {
    service: {
        name: string;
        port: {
            number?: number;
            name?: string;
        };
    };
}

export interface HTTPIngressPath {
    path: string;
    pathType: 'Exact' | 'Prefix' | 'ImplementationSpecific';
    backend: IngressBackend;
}

export interface IngressRule {
    host?: string;
    http: {
        paths: HTTPIngressPath[];
    };
}

export interface IngressTLS {
    hosts?: string[];
    secretName?: string;
}

export interface IngressForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    ingressClassName?: string;
    defaultBackend?: IngressBackend;
    tls?: IngressTLS[];
    rules?: IngressRule[];
}

// =========================================
// GENERATOR
// =========================================

export function generateIngress(formData: IngressForm): string {
    const ingress: Record<string, unknown> = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        spec: {
            ...(formData.ingressClassName && { ingressClassName: formData.ingressClassName }),
            ...(formData.defaultBackend && { defaultBackend: formData.defaultBackend }),
            ...(formData.tls && { tls: formData.tls }),
            ...(formData.rules && { rules: formData.rules }),
        },
    };

    return yaml.dump(ingress, { indent: 2, lineWidth: -1, noRefs: true });
}
