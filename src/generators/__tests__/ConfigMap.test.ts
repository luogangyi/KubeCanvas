/**
 * ConfigMap Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateConfigMap, type ConfigMapForm } from '../configmap';
import { K8sSchemaValidator } from '../../test/validator';

describe('ConfigMap Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('ConfigMap');
    });

    describe('YAML Generation', () => {
        it('should generate ConfigMap with data', () => {
            const formData: ConfigMapForm = {
                name: 'app-config',
                namespace: 'default',
                data: {
                    'config.yaml': 'key: value\nother: data',
                    'settings.json': '{"debug": true}',
                },
            };
            const yaml = generateConfigMap(formData);
            expect(yaml).toContain('kind: ConfigMap');
            expect(yaml).toContain('config.yaml');
        });

        it('should generate immutable ConfigMap', () => {
            const formData: ConfigMapForm = {
                name: 'immutable-config',
                data: { key: 'value' },
                immutable: true,
            };
            const yaml = generateConfigMap(formData);
            expect(yaml).toContain('immutable: true');
        });

        it('should generate ConfigMap with labels and annotations', () => {
            const formData: ConfigMapForm = {
                name: 'labeled-config',
                labels: { app: 'myapp', version: 'v1' },
                annotations: { 'description': 'Application configuration' },
                data: { 'app.conf': 'settings here' },
            };
            const yaml = generateConfigMap(formData);
            expect(yaml).toContain('app: myapp');
            expect(yaml).toContain('version: v1');
        });
    });

    describe('Schema Validation', () => {
        it('should validate ConfigMap with multiple entries', () => {
            if (!schemasAvailable) return;
            const yaml = generateConfigMap({
                name: 'multi-config',
                namespace: 'production',
                data: {
                    'database.url': 'postgres://localhost:5432/db',
                    'cache.url': 'redis://localhost:6379',
                    'log.level': 'info',
                },
            });
            const result = validator.validate(yaml, 'ConfigMap');
            expect(result.valid).toBe(true);
        });

        it('should validate empty ConfigMap', () => {
            if (!schemasAvailable) return;
            const yaml = generateConfigMap({ name: 'empty-config' });
            const result = validator.validate(yaml, 'ConfigMap');
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for full ConfigMap', () => {
            const yaml = generateConfigMap({
                name: 'nginx-config',
                namespace: 'web',
                labels: { app: 'nginx' },
                data: {
                    'nginx.conf': 'server { listen 80; }',
                    'mime.types': 'text/html html;',
                },
                immutable: false,
            });
            expect(yaml).toMatchSnapshot('nginx-configmap');
        });
    });
});
