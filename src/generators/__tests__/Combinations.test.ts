/**
 * Resource Combination Tests
 * 
 * Tests that verify Kubernetes resources work together correctly
 * when combined in realistic deployment scenarios.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateDeployment, type DeploymentForm } from '../deployment';
import { generateService, type ServiceForm } from '../service';
import { generateConfigMap, type ConfigMapForm } from '../configmap';
import { generateSecret, type SecretForm } from '../secret';
import { generateIngress, type IngressForm } from '../ingress';
import { generatePVC, type PVCForm } from '../pvc';
import { K8sSchemaValidator } from '../../test/validator';

describe('Resource Combinations', () => {
    let validator: K8sSchemaValidator;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
    });

    describe('Deployment + ConfigMap + Secret', () => {
        const configMapData: ConfigMapForm = {
            name: 'app-config',
            namespace: 'production',
            data: {
                'config.yaml': 'database:\n  host: localhost\n  port: 5432',
                'logging.yaml': 'level: info\nformat: json',
            },
        };

        const secretData: SecretForm = {
            name: 'app-secrets',
            namespace: 'production',
            type: 'Opaque',
            stringData: {
                DB_PASSWORD: 'supersecret123',
                API_KEY: 'key-abc-123',
            },
        };

        const deploymentData: DeploymentForm = {
            name: 'web-app',
            namespace: 'production',
            replicas: 3,
            containers: [{
                name: 'app',
                image: 'myapp:v1.2.3',
                ports: [{ containerPort: 8080 }],
                env: [
                    { name: 'DB_PASSWORD', valueFrom: { secretKeyRef: { name: 'app-secrets', key: 'DB_PASSWORD' } } },
                    { name: 'API_KEY', valueFrom: { secretKeyRef: { name: 'app-secrets', key: 'API_KEY' } } },
                ],
                volumeMounts: [
                    { name: 'config-volume', mountPath: '/etc/app/config', readOnly: true },
                ],
            }],
            volumes: [
                { name: 'config-volume', configMap: { name: 'app-config' } },
            ],
        };

        it('should generate valid ConfigMap', () => {
            const yaml = generateConfigMap(configMapData);
            if (validator.hasSchema('ConfigMap')) {
                const result = validator.validate(yaml, 'ConfigMap');
                expect(result.valid).toBe(true);
            }
            expect(yaml).toContain('name: app-config');
        });

        it('should generate valid Secret', () => {
            const yaml = generateSecret(secretData);
            if (validator.hasSchema('Secret')) {
                const result = validator.validate(yaml, 'Secret');
                expect(result.valid).toBe(true);
            }
            expect(yaml).toContain('name: app-secrets');
        });

        it('should generate valid Deployment referencing ConfigMap and Secret', () => {
            const yaml = generateDeployment(deploymentData);
            if (validator.hasSchema('Deployment')) {
                const result = validator.validate(yaml, 'Deployment');
                expect(result.valid).toBe(true);
            }
            // Verify references
            expect(yaml).toContain('secretKeyRef');
            expect(yaml).toContain('name: app-secrets');
            expect(yaml).toContain('configMap');
            expect(yaml).toContain('name: app-config');
        });

        it('should match snapshot for complete stack', () => {
            const fullStack = [
                generateConfigMap(configMapData),
                generateSecret(secretData),
                generateDeployment(deploymentData),
            ].join('---\n');
            expect(fullStack).toMatchSnapshot('deployment-configmap-secret-stack');
        });
    });

    describe('Deployment + PVC (Stateful Application)', () => {
        const pvcData: PVCForm = {
            name: 'mysql-data',
            namespace: 'database',
            storageClassName: 'fast-ssd',
            accessModes: ['ReadWriteOnce'],
            storage: '50Gi',
        };

        const deploymentData: DeploymentForm = {
            name: 'mysql',
            namespace: 'database',
            replicas: 1,
            containers: [{
                name: 'mysql',
                image: 'mysql:8.0',
                ports: [{ containerPort: 3306 }],
                env: [
                    { name: 'MYSQL_ROOT_PASSWORD', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'root-password' } } },
                ],
                resources: {
                    limits: { cpu: '2000m', memory: '4Gi' },
                    requests: { cpu: '500m', memory: '1Gi' },
                },
                volumeMounts: [
                    { name: 'data', mountPath: '/var/lib/mysql' },
                ],
                livenessProbe: {
                    exec: { command: ['mysqladmin', 'ping', '-h', 'localhost'] },
                    initialDelaySeconds: 30,
                    periodSeconds: 10,
                },
                readinessProbe: {
                    exec: { command: ['mysql', '-e', 'SELECT 1'] },
                    initialDelaySeconds: 5,
                    periodSeconds: 5,
                },
            }],
            volumes: [
                { name: 'data', persistentVolumeClaim: { claimName: 'mysql-data' } },
            ],
        };

        it('should generate valid PVC', () => {
            const yaml = generatePVC(pvcData);
            if (validator.hasSchema('PersistentVolumeClaim')) {
                const result = validator.validate(yaml, 'PersistentVolumeClaim');
                expect(result.valid).toBe(true);
            }
        });

        it('should generate valid Deployment with PVC reference', () => {
            const yaml = generateDeployment(deploymentData);
            if (validator.hasSchema('Deployment')) {
                const result = validator.validate(yaml, 'Deployment');
                expect(result.valid).toBe(true);
            }
            expect(yaml).toContain('persistentVolumeClaim');
            expect(yaml).toContain('claimName: mysql-data');
        });

        it('should match snapshot for MySQL stack', () => {
            const stack = [
                generatePVC(pvcData),
                generateDeployment(deploymentData),
            ].join('---\n');
            expect(stack).toMatchSnapshot('mysql-deployment-pvc-stack');
        });
    });

    describe('Full Web Application Stack', () => {
        // Complete web app: Deployment + Service + Ingress + ConfigMap + Secret + PVC

        const configMap: ConfigMapForm = {
            name: 'nginx-config',
            namespace: 'web',
            data: { 'nginx.conf': 'server { listen 80; location / { proxy_pass http://backend:8080; } }' },
        };

        const secret: SecretForm = {
            name: 'tls-cert',
            namespace: 'web',
            type: 'kubernetes.io/tls',
            data: { 'tls.crt': 'Y2VydGlmaWNhdGU=', 'tls.key': 'cHJpdmF0ZWtleQ==' },
        };

        const pvc: PVCForm = {
            name: 'static-files',
            namespace: 'web',
            accessModes: ['ReadWriteOnce'],
            storage: '5Gi',
        };

        const deployment: DeploymentForm = {
            name: 'web-frontend',
            namespace: 'web',
            replicas: 3,
            strategy: { type: 'RollingUpdate', rollingUpdate: { maxUnavailable: 1, maxSurge: 1 } },
            containers: [{
                name: 'nginx',
                image: 'nginx:1.24',
                ports: [{ containerPort: 80, name: 'http' }],
                volumeMounts: [
                    { name: 'config', mountPath: '/etc/nginx/conf.d', readOnly: true },
                    { name: 'static', mountPath: '/usr/share/nginx/html' },
                ],
                livenessProbe: { httpGet: { path: '/healthz', port: 80 }, periodSeconds: 10 },
                readinessProbe: { httpGet: { path: '/ready', port: 80 }, periodSeconds: 5 },
            }],
            volumes: [
                { name: 'config', configMap: { name: 'nginx-config' } },
                { name: 'static', persistentVolumeClaim: { claimName: 'static-files' } },
            ],
        };

        const service: ServiceForm = {
            name: 'web-frontend',
            namespace: 'web',
            type: 'ClusterIP',
            selector: { app: 'web-frontend' },
            ports: [{ port: 80, targetPort: 80, name: 'http' }],
        };

        const ingress: IngressForm = {
            name: 'web-ingress',
            namespace: 'web',
            ingressClassName: 'nginx',
            tls: [{ hosts: ['www.example.com'], secretName: 'tls-cert' }],
            rules: [{
                host: 'www.example.com',
                http: {
                    paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'web-frontend', port: { number: 80 } } } }],
                },
            }],
        };

        it('should validate entire stack', () => {
            const resources = [
                { yaml: generateConfigMap(configMap), type: 'ConfigMap' as const },
                { yaml: generateSecret(secret), type: 'Secret' as const },
                { yaml: generatePVC(pvc), type: 'PersistentVolumeClaim' as const },
                { yaml: generateDeployment(deployment), type: 'Deployment' as const },
                { yaml: generateService(service), type: 'Service' as const },
                { yaml: generateIngress(ingress), type: 'Ingress' as const },
            ];

            for (const { yaml, type } of resources) {
                if (validator.hasSchema(type)) {
                    const result = validator.validate(yaml, type);
                    if (!result.valid) {
                        console.error(`${type} validation failed:`, result.errors);
                    }
                    expect(result.valid, `${type} should be valid`).toBe(true);
                }
            }
        });

        it('should match snapshot for complete web stack', () => {
            const fullStack = [
                generateConfigMap(configMap),
                generateSecret(secret),
                generatePVC(pvc),
                generateDeployment(deployment),
                generateService(service),
                generateIngress(ingress),
            ].join('---\n');
            expect(fullStack).toMatchSnapshot('full-web-application-stack');
        });
    });

    describe('Microservices Architecture', () => {
        // API Gateway + Backend Services + Database

        const apiGateway: DeploymentForm = {
            name: 'api-gateway',
            namespace: 'microservices',
            replicas: 2,
            containers: [{
                name: 'gateway',
                image: 'kong:3.0',
                ports: [{ containerPort: 8000 }, { containerPort: 8443 }],
                env: [{ name: 'KONG_DATABASE', value: 'off' }],
            }],
        };

        const userService: DeploymentForm = {
            name: 'user-service',
            namespace: 'microservices',
            replicas: 3,
            containers: [{
                name: 'users',
                image: 'user-service:v1',
                ports: [{ containerPort: 8080 }],
                env: [
                    { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'db-config', key: 'host' } } },
                    { name: 'DB_PASSWORD', valueFrom: { secretKeyRef: { name: 'db-secrets', key: 'password' } } },
                ],
            }],
        };

        const orderService: DeploymentForm = {
            name: 'order-service',
            namespace: 'microservices',
            replicas: 3,
            containers: [{
                name: 'orders',
                image: 'order-service:v1',
                ports: [{ containerPort: 8080 }],
                env: [
                    { name: 'USER_SERVICE_URL', value: 'http://user-service:8080' },
                    { name: 'DB_PASSWORD', valueFrom: { secretKeyRef: { name: 'db-secrets', key: 'password' } } },
                ],
            }],
        };

        it('should validate API Gateway deployment', () => {
            const yaml = generateDeployment(apiGateway);
            if (validator.hasSchema('Deployment')) {
                expect(validator.validate(yaml, 'Deployment').valid).toBe(true);
            }
        });

        it('should validate User Service deployment with configMapKeyRef', () => {
            const yaml = generateDeployment(userService);
            if (validator.hasSchema('Deployment')) {
                expect(validator.validate(yaml, 'Deployment').valid).toBe(true);
            }
            expect(yaml).toContain('configMapKeyRef');
        });

        it('should validate Order Service with service discovery', () => {
            const yaml = generateDeployment(orderService);
            if (validator.hasSchema('Deployment')) {
                expect(validator.validate(yaml, 'Deployment').valid).toBe(true);
            }
            expect(yaml).toContain('USER_SERVICE_URL');
        });

        it('should match snapshot for microservices architecture', () => {
            const stack = [
                generateDeployment(apiGateway),
                generateDeployment(userService),
                generateDeployment(orderService),
            ].join('---\n');
            expect(stack).toMatchSnapshot('microservices-architecture');
        });
    });
});
