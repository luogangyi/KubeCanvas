/**
 * Kubernetes StatefulSet Generator
 * 
 * Generates Kubernetes StatefulSet YAML from form data.
 */

import * as yaml from 'js-yaml';
import type { ContainerConfig, Volume } from './deployment';

// =========================================
// TYPES
// =========================================

export interface StatefulSetForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    replicas?: number;
    serviceName: string;
    podManagementPolicy?: 'OrderedReady' | 'Parallel';
    updateStrategy?: {
        type: 'RollingUpdate' | 'OnDelete';
        rollingUpdate?: {
            partition?: number;
        };
    };
    containers: ContainerConfig[];
    initContainers?: ContainerConfig[];
    volumes?: Volume[];
    volumeClaimTemplates?: VolumeClaimTemplate[];
    nodeSelector?: Record<string, string>;
    serviceAccountName?: string;
}

export interface VolumeClaimTemplate {
    name: string;
    storageClassName?: string;
    accessModes: ('ReadWriteOnce' | 'ReadOnlyMany' | 'ReadWriteMany')[];
    storage: string;
}

// =========================================
// GENERATOR
// =========================================

function buildContainer(config: ContainerConfig): Record<string, unknown> {
    const container: Record<string, unknown> = {
        name: config.name,
        image: config.image,
    };

    if (config.imagePullPolicy) container.imagePullPolicy = config.imagePullPolicy;
    if (config.ports && config.ports.length > 0) container.ports = config.ports;
    if (config.resources) container.resources = config.resources;
    if (config.env && config.env.length > 0) container.env = config.env;
    if (config.volumeMounts && config.volumeMounts.length > 0) container.volumeMounts = config.volumeMounts;
    if (config.livenessProbe) container.livenessProbe = config.livenessProbe;
    if (config.readinessProbe) container.readinessProbe = config.readinessProbe;
    if (config.command && config.command.length > 0) container.command = config.command;
    if (config.args && config.args.length > 0) container.args = config.args;

    return container;
}

export function generateStatefulSet(formData: StatefulSetForm): string {
    const statefulset: Record<string, unknown> = {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        spec: {
            replicas: formData.replicas ?? 1,
            serviceName: formData.serviceName,
            selector: {
                matchLabels: {
                    app: formData.name,
                    ...formData.labels,
                },
            },
            ...(formData.podManagementPolicy && { podManagementPolicy: formData.podManagementPolicy }),
            ...(formData.updateStrategy && { updateStrategy: formData.updateStrategy }),
            template: {
                metadata: {
                    labels: {
                        app: formData.name,
                        ...formData.labels,
                    },
                },
                spec: {
                    containers: formData.containers.map(buildContainer),
                    ...(formData.initContainers && { initContainers: formData.initContainers.map(buildContainer) }),
                    ...(formData.volumes && { volumes: formData.volumes }),
                    ...(formData.nodeSelector && { nodeSelector: formData.nodeSelector }),
                    ...(formData.serviceAccountName && { serviceAccountName: formData.serviceAccountName }),
                },
            },
            ...(formData.volumeClaimTemplates && {
                volumeClaimTemplates: formData.volumeClaimTemplates.map((vct) => ({
                    metadata: { name: vct.name },
                    spec: {
                        accessModes: vct.accessModes,
                        resources: { requests: { storage: vct.storage } },
                        ...(vct.storageClassName && { storageClassName: vct.storageClassName }),
                    },
                })),
            }),
        },
    };

    return yaml.dump(statefulset, { indent: 2, lineWidth: -1, noRefs: true });
}
