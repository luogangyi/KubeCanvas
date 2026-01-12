/**
 * Kubernetes Deployment Generator
 * 
 * Generates Kubernetes Deployment YAML from form data.
 * 
 * @module DeploymentGenerator
 */

import * as yaml from 'js-yaml';

// =========================================
// TYPES
// =========================================

/** Container port configuration */
export interface ContainerPort {
    name?: string;
    containerPort: number;
    protocol?: 'TCP' | 'UDP' | 'SCTP';
}

/** Resource requirements */
export interface ResourceRequirements {
    limits?: {
        cpu?: string;
        memory?: string;
    };
    requests?: {
        cpu?: string;
        memory?: string;
    };
}

/** HTTP get action for probes */
export interface HTTPGetAction {
    path: string;
    port: number | string;
    scheme?: 'HTTP' | 'HTTPS';
}

/** Exec action for probes */
export interface ExecAction {
    command: string[];
}

/** TCP socket action for probes */
export interface TCPSocketAction {
    port: number | string;
}

/** Probe configuration */
export interface Probe {
    httpGet?: HTTPGetAction;
    exec?: ExecAction;
    tcpSocket?: TCPSocketAction;
    initialDelaySeconds?: number;
    periodSeconds?: number;
    timeoutSeconds?: number;
    successThreshold?: number;
    failureThreshold?: number;
}

/** Environment variable */
export interface EnvVar {
    name: string;
    value?: string;
    valueFrom?: {
        configMapKeyRef?: {
            name: string;
            key: string;
        };
        secretKeyRef?: {
            name: string;
            key: string;
        };
    };
}

/** Volume mount */
export interface VolumeMount {
    name: string;
    mountPath: string;
    readOnly?: boolean;
}

/** Volume configuration */
export interface Volume {
    name: string;
    configMap?: {
        name: string;
    };
    secret?: {
        secretName: string;
    };
    emptyDir?: Record<string, never>;
    persistentVolumeClaim?: {
        claimName: string;
    };
}

/** Container configuration */
export interface ContainerConfig {
    name: string;
    image: string;
    imagePullPolicy?: 'Always' | 'Never' | 'IfNotPresent';
    ports?: ContainerPort[];
    resources?: ResourceRequirements;
    env?: EnvVar[];
    volumeMounts?: VolumeMount[];
    livenessProbe?: Probe;
    readinessProbe?: Probe;
    command?: string[];
    args?: string[];
}

/** Form data for Deployment generation */
export interface DeploymentForm {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    replicas?: number;
    strategy?: {
        type: 'RollingUpdate' | 'Recreate';
        rollingUpdate?: {
            maxUnavailable?: string | number;
            maxSurge?: string | number;
        };
    };
    containers: ContainerConfig[];
    initContainers?: ContainerConfig[];
    volumes?: Volume[];
    nodeSelector?: Record<string, string>;
    serviceAccountName?: string;
    restartPolicy?: 'Always' | 'OnFailure' | 'Never';
}

// =========================================
// GENERATOR
// =========================================

/**
 * Generates a Kubernetes Deployment manifest from form data.
 * 
 * @param formData - The deployment configuration form data
 * @returns YAML string of the Deployment manifest
 * 
 * @example
 * ```typescript
 * const yaml = generateDeployment({
 *   name: 'my-app',
 *   namespace: 'default',
 *   replicas: 3,
 *   containers: [{
 *     name: 'app',
 *     image: 'nginx:latest',
 *     ports: [{ containerPort: 80 }],
 *   }],
 * });
 * ```
 */
export function generateDeployment(formData: DeploymentForm): string {
    // Build the deployment object
    const deployment: Record<string, unknown> = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
            name: formData.name,
            ...(formData.namespace && { namespace: formData.namespace }),
            ...(formData.labels && { labels: formData.labels }),
            ...(formData.annotations && { annotations: formData.annotations }),
        },
        spec: {
            replicas: formData.replicas ?? 1,
            selector: {
                matchLabels: {
                    app: formData.name,
                    ...formData.labels,
                },
            },
            ...(formData.strategy && { strategy: formData.strategy }),
            template: {
                metadata: {
                    labels: {
                        app: formData.name,
                        ...formData.labels,
                    },
                },
                spec: {
                    containers: formData.containers.map(buildContainer),
                    ...(formData.initContainers && {
                        initContainers: formData.initContainers.map(buildContainer)
                    }),
                    ...(formData.volumes && { volumes: formData.volumes }),
                    ...(formData.nodeSelector && { nodeSelector: formData.nodeSelector }),
                    ...(formData.serviceAccountName && {
                        serviceAccountName: formData.serviceAccountName
                    }),
                    ...(formData.restartPolicy && { restartPolicy: formData.restartPolicy }),
                },
            },
        },
    };

    // Convert to YAML
    return yaml.dump(deployment, {
        indent: 2,
        lineWidth: -1, // No line wrapping
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
    });
}

/**
 * Builds a container specification from config.
 */
function buildContainer(config: ContainerConfig): Record<string, unknown> {
    const container: Record<string, unknown> = {
        name: config.name,
        image: config.image,
    };

    if (config.imagePullPolicy) {
        container.imagePullPolicy = config.imagePullPolicy;
    }

    if (config.ports && config.ports.length > 0) {
        container.ports = config.ports;
    }

    if (config.resources) {
        container.resources = config.resources;
    }

    if (config.env && config.env.length > 0) {
        container.env = config.env;
    }

    if (config.volumeMounts && config.volumeMounts.length > 0) {
        container.volumeMounts = config.volumeMounts;
    }

    if (config.livenessProbe) {
        container.livenessProbe = config.livenessProbe;
    }

    if (config.readinessProbe) {
        container.readinessProbe = config.readinessProbe;
    }

    if (config.command && config.command.length > 0) {
        container.command = config.command;
    }

    if (config.args && config.args.length > 0) {
        container.args = config.args;
    }

    return container;
}

/**
 * Generates a deployment as a JavaScript object (not YAML).
 * Useful for direct manipulation before serialization.
 */
export function generateDeploymentObject(formData: DeploymentForm): Record<string, unknown> {
    const yamlStr = generateDeployment(formData);
    return yaml.load(yamlStr) as Record<string, unknown>;
}
