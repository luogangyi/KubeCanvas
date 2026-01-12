/**
 * StatefulSet Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateStatefulSet, type StatefulSetForm } from '../statefulset';
import { K8sSchemaValidator } from '../../test/validator';

describe('StatefulSet Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('StatefulSet');
    });

    describe('YAML Generation', () => {
        it('should generate basic StatefulSet', () => {
            const formData: StatefulSetForm = {
                name: 'mysql',
                serviceName: 'mysql-headless',
                replicas: 3,
                containers: [{
                    name: 'mysql',
                    image: 'mysql:8.0',
                    ports: [{ containerPort: 3306 }],
                }],
            };
            const yaml = generateStatefulSet(formData);
            expect(yaml).toContain('kind: StatefulSet');
            expect(yaml).toContain('serviceName: mysql-headless');
            expect(yaml).toContain('replicas: 3');
        });

        it('should generate StatefulSet with volumeClaimTemplates', () => {
            const formData: StatefulSetForm = {
                name: 'postgres',
                serviceName: 'postgres-headless',
                containers: [{
                    name: 'postgres',
                    image: 'postgres:15',
                    volumeMounts: [{ name: 'data', mountPath: '/var/lib/postgresql/data' }],
                }],
                volumeClaimTemplates: [{
                    name: 'data',
                    storageClassName: 'fast-ssd',
                    accessModes: ['ReadWriteOnce'],
                    storage: '100Gi',
                }],
            };
            const yaml = generateStatefulSet(formData);
            expect(yaml).toContain('volumeClaimTemplates');
            expect(yaml).toContain('storage: 100Gi');
        });

        it('should generate StatefulSet with Parallel pod management', () => {
            const formData: StatefulSetForm = {
                name: 'redis',
                serviceName: 'redis-headless',
                podManagementPolicy: 'Parallel',
                replicas: 6,
                containers: [{ name: 'redis', image: 'redis:7' }],
            };
            const yaml = generateStatefulSet(formData);
            expect(yaml).toContain('podManagementPolicy: Parallel');
        });

        it('should generate StatefulSet with update strategy', () => {
            const formData: StatefulSetForm = {
                name: 'zookeeper',
                serviceName: 'zk-headless',
                updateStrategy: {
                    type: 'RollingUpdate',
                    rollingUpdate: { partition: 2 },
                },
                containers: [{ name: 'zk', image: 'zookeeper:3.8' }],
            };
            const yaml = generateStatefulSet(formData);
            expect(yaml).toContain('updateStrategy');
            expect(yaml).toContain('partition: 2');
        });
    });

    describe('Schema Validation', () => {
        it('should validate basic StatefulSet', () => {
            if (!schemasAvailable) return;
            const yaml = generateStatefulSet({
                name: 'test-sts',
                serviceName: 'test-headless',
                containers: [{ name: 'app', image: 'nginx' }],
            });
            const result = validator.validate(yaml, 'StatefulSet');
            if (!result.valid) console.error('Errors:', result.errors);
            expect(result.valid).toBe(true);
        });

        it('should validate StatefulSet with all features', () => {
            if (!schemasAvailable) return;
            const yaml = generateStatefulSet({
                name: 'cassandra',
                namespace: 'database',
                serviceName: 'cassandra-headless',
                replicas: 3,
                podManagementPolicy: 'Parallel',
                containers: [{
                    name: 'cassandra',
                    image: 'cassandra:4.0',
                    ports: [{ containerPort: 9042 }],
                    resources: {
                        limits: { cpu: '2000m', memory: '4Gi' },
                        requests: { cpu: '500m', memory: '2Gi' },
                    },
                    volumeMounts: [
                        { name: 'data', mountPath: '/var/lib/cassandra' },
                    ],
                }],
                volumeClaimTemplates: [{
                    name: 'data',
                    storageClassName: 'local-storage',
                    accessModes: ['ReadWriteOnce'],
                    storage: '500Gi',
                }],
            });
            const result = validator.validate(yaml, 'StatefulSet');
            if (!result.valid) console.error('Errors:', result.errors);
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for database StatefulSet', () => {
            const yaml = generateStatefulSet({
                name: 'mongodb',
                namespace: 'database',
                serviceName: 'mongodb-headless',
                replicas: 3,
                labels: { 'app.kubernetes.io/name': 'mongodb' },
                containers: [{
                    name: 'mongodb',
                    image: 'mongo:6.0',
                    ports: [{ containerPort: 27017 }],
                    volumeMounts: [{ name: 'data', mountPath: '/data/db' }],
                }],
                volumeClaimTemplates: [{
                    name: 'data',
                    accessModes: ['ReadWriteOnce'],
                    storage: '50Gi',
                }],
            });
            expect(yaml).toMatchSnapshot('mongodb-statefulset');
        });
    });
});
