/**
 * Secret Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateSecret, type SecretForm } from '../secret';
import { K8sSchemaValidator } from '../../test/validator';

describe('Secret Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('Secret');
    });

    describe('YAML Generation', () => {
        it('should generate Opaque secret', () => {
            const formData: SecretForm = {
                name: 'db-credentials',
                type: 'Opaque',
                stringData: {
                    username: 'admin',
                    password: 'supersecret',
                },
            };
            const yaml = generateSecret(formData);
            expect(yaml).toContain('type: Opaque');
            expect(yaml).toContain('username: admin');
        });

        it('should generate TLS secret', () => {
            const formData: SecretForm = {
                name: 'tls-cert',
                type: 'kubernetes.io/tls',
                data: {
                    'tls.crt': 'BASE64_ENCODED_CERT',
                    'tls.key': 'BASE64_ENCODED_KEY',
                },
            };
            const yaml = generateSecret(formData);
            expect(yaml).toContain('type: kubernetes.io/tls');
        });

        it('should generate docker registry secret', () => {
            const formData: SecretForm = {
                name: 'docker-registry',
                type: 'kubernetes.io/dockerconfigjson',
                data: {
                    '.dockerconfigjson': 'eyJhdXRocyI6e319',
                },
            };
            const yaml = generateSecret(formData);
            expect(yaml).toContain('type: kubernetes.io/dockerconfigjson');
        });

        it('should generate immutable secret', () => {
            const formData: SecretForm = {
                name: 'immutable-secret',
                stringData: { apiKey: 'key123' },
                immutable: true,
            };
            const yaml = generateSecret(formData);
            expect(yaml).toContain('immutable: true');
        });
    });

    describe('Schema Validation', () => {
        it('should validate Opaque secret', () => {
            if (!schemasAvailable) return;
            const yaml = generateSecret({
                name: 'api-keys',
                stringData: { key1: 'value1', key2: 'value2' },
            });
            const result = validator.validate(yaml, 'Secret');
            expect(result.valid).toBe(true);
        });

        it('should validate basic-auth secret', () => {
            if (!schemasAvailable) return;
            const yaml = generateSecret({
                name: 'basic-auth',
                type: 'kubernetes.io/basic-auth',
                stringData: { username: 'user', password: 'pass' },
            });
            const result = validator.validate(yaml, 'Secret');
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for TLS secret', () => {
            const yaml = generateSecret({
                name: 'production-tls',
                namespace: 'ingress-nginx',
                type: 'kubernetes.io/tls',
                labels: { 'cert-manager.io/managed': 'true' },
                data: { 'tls.crt': 'Y2VydA==', 'tls.key': 'a2V5' },
            });
            expect(yaml).toMatchSnapshot('tls-secret');
        });
    });
});
