/**
 * Ingress Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateIngress, type IngressForm } from '../ingress';
import { K8sSchemaValidator } from '../../test/validator';

describe('Ingress Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('Ingress');
    });

    describe('YAML Generation', () => {
        it('should generate simple Ingress with host', () => {
            const formData: IngressForm = {
                name: 'web-ingress',
                ingressClassName: 'nginx',
                rules: [{
                    host: 'example.com',
                    http: {
                        paths: [{
                            path: '/',
                            pathType: 'Prefix',
                            backend: { service: { name: 'web-svc', port: { number: 80 } } },
                        }],
                    },
                }],
            };
            const yaml = generateIngress(formData);
            expect(yaml).toContain('host: example.com');
            expect(yaml).toContain('ingressClassName: nginx');
        });

        it('should generate Ingress with TLS', () => {
            const formData: IngressForm = {
                name: 'secure-ingress',
                tls: [{
                    hosts: ['secure.example.com'],
                    secretName: 'tls-secret',
                }],
                rules: [{
                    host: 'secure.example.com',
                    http: {
                        paths: [{
                            path: '/',
                            pathType: 'Prefix',
                            backend: { service: { name: 'app', port: { number: 443 } } },
                        }],
                    },
                }],
            };
            const yaml = generateIngress(formData);
            expect(yaml).toContain('secretName: tls-secret');
        });

        it('should generate Ingress with multiple paths', () => {
            const formData: IngressForm = {
                name: 'multi-path',
                rules: [{
                    host: 'api.example.com',
                    http: {
                        paths: [
                            { path: '/v1', pathType: 'Prefix', backend: { service: { name: 'api-v1', port: { number: 80 } } } },
                            { path: '/v2', pathType: 'Prefix', backend: { service: { name: 'api-v2', port: { number: 80 } } } },
                        ],
                    },
                }],
            };
            const yaml = generateIngress(formData);
            expect(yaml).toContain('path: /v1');
            expect(yaml).toContain('path: /v2');
        });

        it('should generate Ingress with default backend', () => {
            const formData: IngressForm = {
                name: 'default-backend-ingress',
                defaultBackend: {
                    service: { name: 'fallback-svc', port: { number: 80 } },
                },
            };
            const yaml = generateIngress(formData);
            expect(yaml).toContain('defaultBackend');
            expect(yaml).toContain('fallback-svc');
        });
    });

    describe('Schema Validation', () => {
        it('should validate Ingress with nginx annotations', () => {
            if (!schemasAvailable) return;
            const yaml = generateIngress({
                name: 'annotated-ingress',
                annotations: {
                    'nginx.ingress.kubernetes.io/rewrite-target': '/',
                    'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
                },
                ingressClassName: 'nginx',
                rules: [{
                    host: 'app.example.com',
                    http: {
                        paths: [{ path: '/app', pathType: 'Prefix', backend: { service: { name: 'app', port: { number: 80 } } } }],
                    },
                }],
            });
            const result = validator.validate(yaml, 'Ingress');
            expect(result.valid).toBe(true);
        });

        it('should validate Ingress with multiple hosts and TLS', () => {
            if (!schemasAvailable) return;
            const yaml = generateIngress({
                name: 'multi-host',
                tls: [
                    { hosts: ['a.example.com', 'b.example.com'], secretName: 'wildcard-cert' },
                ],
                rules: [
                    { host: 'a.example.com', http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'a-svc', port: { number: 80 } } } }] } },
                    { host: 'b.example.com', http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'b-svc', port: { number: 80 } } } }] } },
                ],
            });
            const result = validator.validate(yaml, 'Ingress');
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for production Ingress', () => {
            const yaml = generateIngress({
                name: 'production-ingress',
                namespace: 'production',
                ingressClassName: 'nginx',
                annotations: { 'nginx.ingress.kubernetes.io/proxy-body-size': '50m' },
                tls: [{ hosts: ['prod.example.com'], secretName: 'prod-tls' }],
                rules: [{
                    host: 'prod.example.com',
                    http: {
                        paths: [
                            { path: '/api', pathType: 'Prefix', backend: { service: { name: 'api-svc', port: { number: 8080 } } } },
                            { path: '/', pathType: 'Prefix', backend: { service: { name: 'web-svc', port: { number: 80 } } } },
                        ],
                    },
                }],
            });
            expect(yaml).toMatchSnapshot('production-ingress');
        });
    });
});
