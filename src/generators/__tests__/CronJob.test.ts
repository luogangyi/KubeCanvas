/**
 * CronJob Generator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateCronJob, type CronJobForm } from '../cronjob';
import { K8sSchemaValidator } from '../../test/validator';

describe('CronJob Generator', () => {
    let validator: K8sSchemaValidator;
    let schemasAvailable: boolean;

    beforeAll(() => {
        validator = new K8sSchemaValidator();
        schemasAvailable = validator.hasSchema('CronJob');
    });

    describe('YAML Generation', () => {
        it('should generate basic CronJob', () => {
            const formData: CronJobForm = {
                name: 'hello-cron',
                schedule: '*/5 * * * *',
                containers: [{
                    name: 'hello',
                    image: 'busybox',
                    command: ['echo', 'Hello from CronJob'],
                }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('apiVersion: batch/v1');
            expect(yaml).toContain('kind: CronJob');
            expect(yaml).toContain("schedule: '*/5 * * * *'");
        });

        it('should generate CronJob with timezone', () => {
            const formData: CronJobForm = {
                name: 'daily-backup',
                schedule: '0 2 * * *',
                timeZone: 'America/New_York',
                containers: [{ name: 'backup', image: 'backup-tool:v1' }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('timeZone: America/New_York');
        });

        it('should generate CronJob with Forbid concurrency policy', () => {
            const formData: CronJobForm = {
                name: 'single-run',
                schedule: '0 * * * *',
                concurrencyPolicy: 'Forbid',
                containers: [{ name: 'task', image: 'task-runner:v1' }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('concurrencyPolicy: Forbid');
        });

        it('should generate CronJob with Replace concurrency policy', () => {
            const formData: CronJobForm = {
                name: 'replace-run',
                schedule: '0 * * * *',
                concurrencyPolicy: 'Replace',
                containers: [{ name: 'task', image: 'task-runner:v1' }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('concurrencyPolicy: Replace');
        });

        it('should generate CronJob with history limits', () => {
            const formData: CronJobForm = {
                name: 'cleanup-cron',
                schedule: '0 3 * * *',
                successfulJobsHistoryLimit: 3,
                failedJobsHistoryLimit: 1,
                containers: [{ name: 'cleanup', image: 'cleanup:v1' }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('successfulJobsHistoryLimit: 3');
            expect(yaml).toContain('failedJobsHistoryLimit: 1');
        });

        it('should generate suspended CronJob', () => {
            const formData: CronJobForm = {
                name: 'suspended-job',
                schedule: '0 0 * * *',
                suspend: true,
                containers: [{ name: 'task', image: 'task:v1' }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('suspend: true');
        });

        it('should generate CronJob with starting deadline', () => {
            const formData: CronJobForm = {
                name: 'deadline-job',
                schedule: '0 0 * * *',
                startingDeadlineSeconds: 200,
                containers: [{ name: 'task', image: 'task:v1' }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('startingDeadlineSeconds: 200');
        });

        it('should generate CronJob with job template settings', () => {
            const formData: CronJobForm = {
                name: 'batch-cron',
                schedule: '0 */6 * * *',
                parallelism: 2,
                completions: 4,
                backoffLimit: 3,
                ttlSecondsAfterFinished: 3600,
                containers: [{ name: 'batch', image: 'batch:v1' }],
            };
            const yaml = generateCronJob(formData);
            expect(yaml).toContain('parallelism: 2');
            expect(yaml).toContain('completions: 4');
            expect(yaml).toContain('backoffLimit: 3');
        });
    });

    describe('Schema Validation', () => {
        it('should validate simple CronJob', () => {
            if (!schemasAvailable) return;
            const yaml = generateCronJob({
                name: 'simple-cron',
                schedule: '0 0 * * *',
                containers: [{ name: 'task', image: 'busybox' }],
            });
            const result = validator.validate(yaml, 'CronJob');
            if (!result.valid) console.error('Errors:', result.errors);
            expect(result.valid).toBe(true);
        });

        it('should validate CronJob with all features', () => {
            if (!schemasAvailable) return;
            const yaml = generateCronJob({
                name: 'full-cron',
                namespace: 'scheduled-tasks',
                schedule: '30 4 * * 1-5',
                timeZone: 'Europe/London',
                concurrencyPolicy: 'Forbid',
                successfulJobsHistoryLimit: 5,
                failedJobsHistoryLimit: 2,
                startingDeadlineSeconds: 300,
                parallelism: 1,
                backoffLimit: 2,
                activeDeadlineSeconds: 1800,
                ttlSecondsAfterFinished: 86400,
                restartPolicy: 'OnFailure',
                containers: [{
                    name: 'report-generator',
                    image: 'reports:v2',
                    resources: { limits: { cpu: '500m', memory: '512Mi' } },
                    env: [
                        { name: 'REPORT_TYPE', value: 'daily' },
                        { name: 'OUTPUT_FORMAT', value: 'pdf' },
                    ],
                }],
            });
            const result = validator.validate(yaml, 'CronJob');
            if (!result.valid) console.error('Errors:', result.errors);
            expect(result.valid).toBe(true);
        });
    });

    describe('Snapshot Testing', () => {
        it('should match snapshot for backup CronJob', () => {
            const yaml = generateCronJob({
                name: 'database-backup',
                namespace: 'backup',
                schedule: '0 1 * * *',
                timeZone: 'UTC',
                concurrencyPolicy: 'Forbid',
                successfulJobsHistoryLimit: 7,
                failedJobsHistoryLimit: 3,
                labels: { backup: 'database', frequency: 'daily' },
                containers: [{
                    name: 'backup',
                    image: 'backup-tools:v3',
                    env: [
                        { name: 'DB_HOST', value: 'postgres.database.svc' },
                        { name: 'BACKUP_BUCKET', value: 's3://backups/database' },
                    ],
                    volumeMounts: [{ name: 'secrets', mountPath: '/etc/secrets', readOnly: true }],
                }],
                volumes: [{ name: 'secrets', secret: { secretName: 'backup-credentials' } }],
            });
            expect(yaml).toMatchSnapshot('database-backup-cronjob');
        });
    });
});
