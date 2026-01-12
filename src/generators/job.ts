/**
 * Kubernetes Job Generator
 * 
 * Generates Kubernetes Job YAML from form data.
 */

import * as yaml from 'js-yaml';
import type { ContainerConfig, Volume } from './deployment';

// =========================================
// TYPES
// =========================================

export interface JobForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    // Job-specific settings
    parallelism?: number;
    completions?: number;
    completionMode?: 'NonIndexed' | 'Indexed';
    backoffLimit?: number;
    activeDeadlineSeconds?: number;
    ttlSecondsAfterFinished?: number;
    suspend?: boolean;
    // Pod template
    restartPolicy?: 'Never' | 'OnFailure';
    containers: ContainerConfig[];
    initContainers?: ContainerConfig[];
    volumes?: Volume[];
    nodeSelector?: Record<string, string>;
    serviceAccountName?: string;
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
    if (config.command && config.command.length > 0) container.command = config.command;
    if (config.args && config.args.length > 0) container.args = config.args;

    return container;
}

export function generateJob(formData: JobForm): string {
    const job: Record<string, unknown> = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        spec: {
            ...(formData.parallelism !== undefined && { parallelism: formData.parallelism }),
            ...(formData.completions !== undefined && { completions: formData.completions }),
            ...(formData.completionMode && { completionMode: formData.completionMode }),
            ...(formData.backoffLimit !== undefined && { backoffLimit: formData.backoffLimit }),
            ...(formData.activeDeadlineSeconds !== undefined && { activeDeadlineSeconds: formData.activeDeadlineSeconds }),
            ...(formData.ttlSecondsAfterFinished !== undefined && { ttlSecondsAfterFinished: formData.ttlSecondsAfterFinished }),
            ...(formData.suspend !== undefined && { suspend: formData.suspend }),
            template: {
                metadata: {
                    labels: {
                        app: formData.name,
                        ...formData.labels,
                    },
                },
                spec: {
                    restartPolicy: formData.restartPolicy ?? 'Never',
                    containers: formData.containers.map(buildContainer),
                    ...(formData.initContainers && { initContainers: formData.initContainers.map(buildContainer) }),
                    ...(formData.volumes && { volumes: formData.volumes }),
                    ...(formData.nodeSelector && { nodeSelector: formData.nodeSelector }),
                    ...(formData.serviceAccountName && { serviceAccountName: formData.serviceAccountName }),
                },
            },
        },
    };

    return yaml.dump(job, { indent: 2, lineWidth: -1, noRefs: true });
}
