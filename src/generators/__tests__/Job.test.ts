/**
 * Job Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateJob, type JobForm } from '../job';
import { K8sSchemaValidator } from '../../test/validator';

describe('Job Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('Job');
    });

    describe('YAML Generation', () => {
        it('should generate simple Job', () => {
            const formData: JobForm = {
                name: 'pi-calculator',
                containers: [{
                    name: 'pi',
                    image: 'perl:5.34',
                    command: ['perl', '-Mbignum=bpi', '-wle', 'print bpi(2000)'],
                }],
            };
            const yaml = generateJob(formData);
            expect(yaml).toContain('apiVersion: batch/v1');
            expect(yaml).toContain('kind: Job');
            expect(yaml).toContain('restartPolicy: Never');
        });

        it('should generate Job with parallelism and completions', () => {
            const formData: JobForm = {
                name: 'parallel-job',
                parallelism: 3,
                completions: 10,
                containers: [{ name: 'worker', image: 'busybox', command: ['echo', 'working'] }],
            };
            const yaml = generateJob(formData);
            expect(yaml).toContain('parallelism: 3');
            expect(yaml).toContain('completions: 10');
        });

        it('should generate Job with backoff limit', () => {
            const formData: JobForm = {
                name: 'retry-job',
                backoffLimit: 4,
                containers: [{ name: 'task', image: 'alpine', command: ['sh', '-c', 'exit 0'] }],
            };
            const yaml = generateJob(formData);
            expect(yaml).toContain('backoffLimit: 4');
        });

        it('should generate Job with TTL', () => {
            const formData: JobForm = {
                name: 'ttl-job',
                ttlSecondsAfterFinished: 3600,
                containers: [{ name: 'cleanup', image: 'busybox' }],
            };
            const yaml = generateJob(formData);
            expect(yaml).toContain('ttlSecondsAfterFinished: 3600');
        });

        it('should generate Job with OnFailure restart policy', () => {
            const formData: JobForm = {
                name: 'restart-job',
                restartPolicy: 'OnFailure',
                containers: [{ name: 'retry', image: 'busybox' }],
            };
            const yaml = generateJob(formData);
            expect(yaml).toContain('restartPolicy: OnFailure');
        });

        it('should generate indexed Job', () => {
            const formData: JobForm = {
                name: 'indexed-job',
                completions: 5,
                completionMode: 'Indexed',
                parallelism: 5,
                containers: [{
                    name: 'worker',
                    image: 'busybox',
                    command: ['sh', '-c', 'echo "Processing index $JOB_COMPLETION_INDEX"'],
                }],
            };
            const yaml = generateJob(formData);
            expect(yaml).toContain('completionMode: Indexed');
        });
    });

    describe('Schema Validation', () => {
        it('should validate simple Job', () => {
            if (!schemasAvailable) return;
            const yaml = generateJob({
                name: 'simple-job',
                containers: [{ name: 'task', image: 'busybox' }],
            });
            const result = validator.validate(yaml, 'Job');
            if (!result.valid) console.error('Errors:', result.errors);
            expect(result.valid).toBe(true);
        });

        it('should validate Job with all features', () => {
            if (!schemasAvailable) return;
            const yaml = generateJob({
                name: 'full-job',
                namespace: 'batch',
                parallelism: 2,
                completions: 6,
                backoffLimit: 3,
                activeDeadlineSeconds: 600,
                ttlSecondsAfterFinished: 3600,
                restartPolicy: 'OnFailure',
                containers: [{
                    name: 'processor',
                    image: 'myapp:v1',
                    resources: { limits: { cpu: '500m', memory: '256Mi' } },
                    env: [{ name: 'BATCH_SIZE', value: '100' }],
                }],
            });
            const result = validator.validate(yaml, 'Job');
            if (!result.valid) console.error('Errors:', result.errors);
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for data processing Job', () => {
            const yaml = generateJob({
                name: 'etl-job',
                namespace: 'data-pipeline',
                labels: { pipeline: 'etl', stage: 'transform' },
                parallelism: 4,
                completions: 100,
                backoffLimit: 6,
                ttlSecondsAfterFinished: 86400,
                containers: [{
                    name: 'etl',
                    image: 'myorg/etl-processor:v2.0',
                    resources: { limits: { cpu: '1000m', memory: '2Gi' } },
                    env: [
                        { name: 'SOURCE_BUCKET', value: 's3://data-lake/raw' },
                        { name: 'DEST_BUCKET', value: 's3://data-lake/processed' },
                    ],
                }],
            });
            expect(yaml).toMatchSnapshot('etl-job');
        });
    });
});
