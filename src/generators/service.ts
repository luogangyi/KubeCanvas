/**
 * Kubernetes Service Generator
 * 
 * Generates Kubernetes Service YAML from form data.
 */

import * as yaml from 'js-yaml';

// =========================================
// TYPES
// =========================================

export interface ServicePort {
    name?: string;
    port: number;
    targetPort?: number | string;
    nodePort?: number;
    protocol?: 'TCP' | 'UDP' | 'SCTP';
}

export interface ServiceForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
    selector?: Record<string, string>;
    ports: ServicePort[];
    clusterIP?: string;
    externalName?: string;
    sessionAffinity?: 'ClientIP' | 'None';
}

// =========================================
// GENERATOR
// =========================================

export function generateService(formData: ServiceForm): string {
    const service: Record<string, unknown> = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        spec: {
            type: formData.type ?? 'ClusterIP',
            ports: formData.ports,
            ...(formData.selector && { selector: formData.selector }),
            ...(formData.clusterIP && { clusterIP: formData.clusterIP }),
            ...(formData.externalName && { externalName: formData.externalName }),
            ...(formData.sessionAffinity && { sessionAffinity: formData.sessionAffinity }),
        },
    };

    return yaml.dump(service, { indent: 2, lineWidth: -1, noRefs: true });
}
