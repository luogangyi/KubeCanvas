/**
 * Deployment Generator Tests
 * 
 * Tests the deployment generator for correctness and K8s schema compliance.
 * 
 * @module Deployment.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateDeployment, type DeploymentForm } from '../deployment';
import { K8sSchemaValidator } from '../../test/validator';

// =========================================
// TEST FIXTURES
// =========================================

/** Full deployment with all features */
const fullDeploymentFormData: DeploymentForm = {
    name: 'my-web-app',
    namespace: 'production',
    labels: {
        team: 'backend',
        environment: 'production',
    },
    annotations: {
        'description': 'Main web application deployment',
    },
    replicas: 3,
    strategy: {
        type: 'RollingUpdate',
        rollingUpdate: {
            maxUnavailable: '25%',
            maxSurge: '25%',
        },
    },
    containers: [
        {
            name: 'web',
            image: 'nginx:1.24-alpine',
            imagePullPolicy: 'IfNotPresent',
            ports: [
                { name: 'http', containerPort: 80, protocol: 'TCP' },
                { name: 'https', containerPort: 443, protocol: 'TCP' },
            ],
            resources: {
                limits: {
                    cpu: '500m',
                    memory: '512Mi',
                },
                requests: {
                    cpu: '100m',
                    memory: '128Mi',
                },
            },
            env: [
                { name: 'NODE_ENV', value: 'production' },
                {
                    name: 'DB_PASSWORD',
                    valueFrom: {
                        secretKeyRef: {
                            name: 'db-secrets',
                            key: 'password'
                        }
                    }
                },
            ],
            volumeMounts: [
                { name: 'config', mountPath: '/etc/nginx/conf.d', readOnly: true },
                { name: 'data', mountPath: '/var/www/html' },
            ],
            livenessProbe: {
                httpGet: {
                    path: '/healthz',
                    port: 80,
                    scheme: 'HTTP',
                },
                initialDelaySeconds: 30,
                periodSeconds: 10,
                timeoutSeconds: 5,
                successThreshold: 1,
                failureThreshold: 3,
            },
            readinessProbe: {
                httpGet: {
                    path: '/ready',
                    port: 80,
                },
                initialDelaySeconds: 5,
                periodSeconds: 5,
            },
        },
    ],
    initContainers: [
        {
            name: 'init-db',
            image: 'busybox:latest',
            command: ['sh', '-c', 'echo Waiting for DB...'],
        },
    ],
    volumes: [
        { name: 'config', configMap: { name: 'nginx-config' } },
        { name: 'data', persistentVolumeClaim: { claimName: 'web-data-pvc' } },
    ],
    nodeSelector: {
        'kubernetes.io/os': 'linux',
    },
    serviceAccountName: 'web-app-sa',
};

/** Minimal deployment with only required fields */
const minimalDeploymentFormData: DeploymentForm = {
    name: 'simple-app',
    containers: [
        {
            name: 'app',
            image: 'busybox:latest',
        },
    ],
};

// =========================================
// TEST SUITES
// =========================================

describe('Deployment Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('Deployment');

        if (!schemasAvailable) {
            console.warn(
                '⚠️  Deployment schema not found. Run "npm run download-schemas" first.\n' +
                '   Schema validation tests will be skipped.'
            );
        }
    });

    describe('YAML Generation', () => {
        it('should generate valid YAML for a full deployment', () => {
            const yaml = generateDeployment(fullDeploymentFormData);

            // Verify YAML is a non-empty string
            expect(yaml).toBeDefined();
            expect(typeof yaml).toBe('string');
            expect(yaml.length).toBeGreaterThan(0);

            // Verify key elements are present
            expect(yaml).toContain('apiVersion: apps/v1');
            expect(yaml).toContain('kind: Deployment');
            expect(yaml).toContain('name: my-web-app');
            expect(yaml).toContain('namespace: production');
            expect(yaml).toContain('replicas: 3');
        });

        it('should generate valid YAML for a minimal deployment', () => {
            const yaml = generateDeployment(minimalDeploymentFormData);

            expect(yaml).toContain('apiVersion: apps/v1');
            expect(yaml).toContain('kind: Deployment');
            expect(yaml).toContain('name: simple-app');
            expect(yaml).toContain('replicas: 1'); // Default value
        });

        it('should include all container configurations', () => {
            const yaml = generateDeployment(fullDeploymentFormData);

            // Container basics
            expect(yaml).toContain('name: web');
            expect(yaml).toContain('image: nginx:1.24-alpine');
            expect(yaml).toContain('imagePullPolicy: IfNotPresent');

            // Ports
            expect(yaml).toContain('containerPort: 80');
            expect(yaml).toContain('containerPort: 443');

            // Resources
            expect(yaml).toContain('cpu: 500m');
            expect(yaml).toContain('memory: 512Mi');

            // Probes
            expect(yaml).toContain('livenessProbe:');
            expect(yaml).toContain('readinessProbe:');
            expect(yaml).toContain('path: /healthz');
        });

        it('should include init containers when specified', () => {
            const yaml = generateDeployment(fullDeploymentFormData);

            expect(yaml).toContain('initContainers:');
            expect(yaml).toContain('name: init-db');
        });

        it('should include volumes and volume mounts', () => {
            const yaml = generateDeployment(fullDeploymentFormData);

            expect(yaml).toContain('volumes:');
            expect(yaml).toContain('volumeMounts:');
            expect(yaml).toContain('mountPath: /etc/nginx/conf.d');
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for full deployment', () => {
            const yaml = generateDeployment(fullDeploymentFormData);
            expect(yaml).toMatchSnapshot('full-deployment');
        });

        it('should match snapshot for minimal deployment', () => {
            const yaml = generateDeployment(minimalDeploymentFormData);
            expect(yaml).toMatchSnapshot('minimal-deployment');
        });
    });

    describe('Schema Validation', () => {
        it('should generate K8s-compliant YAML for full deployment', () => {
            // Skip if schemas not downloaded
            if (!schemasAvailable) {
                console.log('Skipping: Deployment schema not available');
                return;
            }

            const yaml = generateDeployment(fullDeploymentFormData);
            const result = validator.validate(yaml, 'Deployment');

            if (!result.valid) {
                console.error('Validation errors:', result.errors);
            }

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should generate K8s-compliant YAML for minimal deployment', () => {
            if (!schemasAvailable) {
                console.log('Skipping: Deployment schema not available');
                return;
            }

            const yaml = generateDeployment(minimalDeploymentFormData);
            const result = validator.validate(yaml, 'Deployment');

            if (!result.valid) {
                console.error('Validation errors:', result.errors);
            }

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle deployment with environment variables from secrets', () => {
            if (!schemasAvailable) {
                console.log('Skipping: Deployment schema not available');
                return;
            }

            const formData: DeploymentForm = {
                name: 'secret-app',
                containers: [{
                    name: 'app',
                    image: 'myapp:latest',
                    env: [
                        { name: 'API_KEY', valueFrom: { secretKeyRef: { name: 'api-secrets', key: 'key' } } },
                        { name: 'CONFIG', valueFrom: { configMapKeyRef: { name: 'app-config', key: 'config' } } },
                    ],
                }],
            };

            const yaml = generateDeployment(formData);
            const result = validator.validate(yaml, 'Deployment');

            expect(result.valid).toBe(true);
        });

        it('should handle deployment with exec probe', () => {
            if (!schemasAvailable) {
                console.log('Skipping: Deployment schema not available');
                return;
            }

            const formData: DeploymentForm = {
                name: 'exec-probe-app',
                containers: [{
                    name: 'app',
                    image: 'myapp:latest',
                    livenessProbe: {
                        exec: {
                            command: ['/bin/sh', '-c', 'cat /tmp/healthy'],
                        },
                        initialDelaySeconds: 5,
                        periodSeconds: 5,
                    },
                }],
            };

            const yaml = generateDeployment(formData);
            const result = validator.validate(yaml, 'Deployment');

            expect(result.valid).toBe(true);
        });
    });
});
