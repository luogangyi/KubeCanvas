/**
 * Kubernetes CronJob Generator
 * 
 * Generates Kubernetes CronJob YAML from form data.
 */

import * as yaml from 'js-yaml';
import type { ContainerConfig, Volume } from './deployment';

// =========================================
// TYPES
// =========================================

export interface CronJobForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    // CronJob-specific settings
    schedule: string; // Cron expression
    timeZone?: string;
    concurrencyPolicy?: 'Allow' | 'Forbid' | 'Replace';
    suspend?: boolean;
    successfulJobsHistoryLimit?: number;
    failedJobsHistoryLimit?: number;
    startingDeadlineSeconds?: number;
    // Job template settings
    parallelism?: number;
    completions?: number;
    backoffLimit?: number;
    activeDeadlineSeconds?: number;
    ttlSecondsAfterFinished?: number;
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

export function generateCronJob(formData: CronJobForm): string {
    const cronjob: Record<string, unknown> = {
        apiVersion: 'batch/v1',
        kind: 'CronJob',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        spec: {
            schedule: formData.schedule,
            ...(formData.timeZone && { timeZone: formData.timeZone }),
            ...(formData.concurrencyPolicy && { concurrencyPolicy: formData.concurrencyPolicy }),
            ...(formData.suspend !== undefined && { suspend: formData.suspend }),
            ...(formData.successfulJobsHistoryLimit !== undefined && { successfulJobsHistoryLimit: formData.successfulJobsHistoryLimit }),
            ...(formData.failedJobsHistoryLimit !== undefined && { failedJobsHistoryLimit: formData.failedJobsHistoryLimit }),
            ...(formData.startingDeadlineSeconds !== undefined && { startingDeadlineSeconds: formData.startingDeadlineSeconds }),
            jobTemplate: {
                spec: {
                    ...(formData.parallelism !== undefined && { parallelism: formData.parallelism }),
                    ...(formData.completions !== undefined && { completions: formData.completions }),
                    ...(formData.backoffLimit !== undefined && { backoffLimit: formData.backoffLimit }),
                    ...(formData.activeDeadlineSeconds !== undefined && { activeDeadlineSeconds: formData.activeDeadlineSeconds }),
                    ...(formData.ttlSecondsAfterFinished !== undefined && { ttlSecondsAfterFinished: formData.ttlSecondsAfterFinished }),
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
            },
        },
    };

    return yaml.dump(cronjob, { indent: 2, lineWidth: -1, noRefs: true });
}
