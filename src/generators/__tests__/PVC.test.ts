/**
 * PVC Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generatePVC, type PVCForm } from '../pvc';
import { K8sSchemaValidator } from '../../test/validator';

describe('PVC Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('PersistentVolumeClaim');
    });

    describe('YAML Generation', () => {
        it('should generate ReadWriteOnce PVC', () => {
            const formData: PVCForm = {
                name: 'data-pvc',
                accessModes: ['ReadWriteOnce'],
                storage: '10Gi',
            };
            const yaml = generatePVC(formData);
            expect(yaml).toContain('ReadWriteOnce');
            expect(yaml).toContain('storage: 10Gi');
        });

        it('should generate PVC with storage class', () => {
            const formData: PVCForm = {
                name: 'ssd-pvc',
                storageClassName: 'fast-ssd',
                accessModes: ['ReadWriteOnce'],
                storage: '50Gi',
            };
            const yaml = generatePVC(formData);
            expect(yaml).toContain('storageClassName: fast-ssd');
        });

        it('should generate ReadWriteMany PVC', () => {
            const formData: PVCForm = {
                name: 'shared-pvc',
                accessModes: ['ReadWriteMany'],
                storage: '100Gi',
                storageClassName: 'nfs',
            };
            const yaml = generatePVC(formData);
            expect(yaml).toContain('ReadWriteMany');
        });

        it('should generate PVC with Block volume mode', () => {
            const formData: PVCForm = {
                name: 'block-pvc',
                accessModes: ['ReadWriteOnce'],
                storage: '20Gi',
                volumeMode: 'Block',
            };
            const yaml = generatePVC(formData);
            expect(yaml).toContain('volumeMode: Block');
        });

        it('should generate PVC with selector', () => {
            const formData: PVCForm = {
                name: 'selected-pvc',
                accessModes: ['ReadWriteOnce'],
                storage: '5Gi',
                selector: { matchLabels: { release: 'stable' } },
            };
            const yaml = generatePVC(formData);
            expect(yaml).toContain('matchLabels');
            expect(yaml).toContain('release: stable');
        });
    });

    describe('Schema Validation', () => {
        it('should validate standard PVC', () => {
            if (!schemasAvailable) return;
            const yaml = generatePVC({
                name: 'mysql-data',
                namespace: 'database',
                accessModes: ['ReadWriteOnce'],
                storage: '20Gi',
                storageClassName: 'standard',
            });
            const result = validator.validate(yaml, 'PersistentVolumeClaim');
            expect(result.valid).toBe(true);
        });

        it('should validate PVC with multiple access modes', () => {
            if (!schemasAvailable) return;
            const yaml = generatePVC({
                name: 'multi-access',
                accessModes: ['ReadWriteOnce', 'ReadOnlyMany'],
                storage: '10Gi',
            });
            const result = validator.validate(yaml, 'PersistentVolumeClaim');
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for production PVC', () => {
            const yaml = generatePVC({
                name: 'postgres-data',
                namespace: 'database',
                labels: { app: 'postgres', tier: 'database' },
                storageClassName: 'premium-ssd',
                accessModes: ['ReadWriteOnce'],
                storage: '100Gi',
                volumeMode: 'Filesystem',
            });
            expect(yaml).toMatchSnapshot('postgres-pvc');
        });
    });
});
