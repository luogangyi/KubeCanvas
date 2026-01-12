/**
 * Service Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateService, type ServiceForm } from '../service';
import { K8sSchemaValidator } from '../../test/validator';

describe('Service Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('Service');
    });

    describe('YAML Generation', () => {
        it('should generate ClusterIP service', () => {
            const formData: ServiceForm = {
                name: 'my-service',
                namespace: 'default',
                type: 'ClusterIP',
                selector: { app: 'my-app' },
                ports: [{ port: 80, targetPort: 8080, protocol: 'TCP' }],
            };
            const yaml = generateService(formData);
            expect(yaml).toContain('type: ClusterIP');
            expect(yaml).toContain('port: 80');
        });

        it('should generate NodePort service', () => {
            const formData: ServiceForm = {
                name: 'nodeport-service',
                type: 'NodePort',
                selector: { app: 'web' },
                ports: [{ port: 80, targetPort: 8080, nodePort: 30080 }],
            };
            const yaml = generateService(formData);
            expect(yaml).toContain('type: NodePort');
            expect(yaml).toContain('nodePort: 30080');
        });

        it('should generate LoadBalancer service', () => {
            const formData: ServiceForm = {
                name: 'lb-service',
                type: 'LoadBalancer',
                selector: { app: 'api' },
                ports: [{ port: 443, targetPort: 8443, protocol: 'TCP' }],
                sessionAffinity: 'ClientIP',
            };
            const yaml = generateService(formData);
            expect(yaml).toContain('type: LoadBalancer');
            expect(yaml).toContain('sessionAffinity: ClientIP');
        });

        it('should generate headless service', () => {
            const formData: ServiceForm = {
                name: 'headless',
                type: 'ClusterIP',
                clusterIP: 'None',
                selector: { app: 'stateful' },
                ports: [{ port: 5432, name: 'postgres' }],
            };
            const yaml = generateService(formData);
            expect(yaml).toContain('clusterIP: None');
        });
    });

    describe('Schema Validation', () => {
        it('should validate ClusterIP service', () => {
            if (!schemasAvailable) return;
            const yaml = generateService({
                name: 'valid-svc',
                ports: [{ port: 80 }],
                selector: { app: 'test' },
            });
            const result = validator.validate(yaml, 'Service');
            expect(result.valid).toBe(true);
        });

        it('should validate multi-port service', () => {
            if (!schemasAvailable) return;
            const yaml = generateService({
                name: 'multi-port',
                ports: [
                    { name: 'http', port: 80, targetPort: 8080 },
                    { name: 'https', port: 443, targetPort: 8443 },
                    { name: 'grpc', port: 9090, protocol: 'TCP' },
                ],
                selector: { app: 'api' },
            });
            const result = validator.validate(yaml, 'Service');
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for LoadBalancer service', () => {
            const yaml = generateService({
                name: 'production-lb',
                namespace: 'production',
                type: 'LoadBalancer',
                labels: { tier: 'frontend' },
                ports: [{ port: 443, targetPort: 8443, name: 'https' }],
                selector: { app: 'web', tier: 'frontend' },
            });
            expect(yaml).toMatchSnapshot('loadbalancer-service');
        });
    });
});
