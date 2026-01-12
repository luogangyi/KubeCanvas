/**
 * Kubernetes Schema Validator
 * 
 * A reusable helper for validating YAML/JSON against Kubernetes JSON schemas.
 * Uses Ajv for high-performance JSON Schema validation.
 * 
 * @module K8sSchemaValidator
 */

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import * as path from 'node:path';

// =========================================
// TYPES
// =========================================

/** Result returned by the validate method */
export interface ValidationResult {
    /** Whether the document is valid according to the schema */
    valid: boolean;
    /** Array of human-readable error messages (empty if valid) */
    errors: string[];
    /** Raw Ajv error objects for advanced error handling */
    rawErrors?: ErrorObject[];
}

/** Supported Kubernetes resource types */
export type K8sResourceType =
    | 'Deployment'
    | 'StatefulSet'
    | 'Job'
    | 'CronJob'
    | 'Service'
    | 'ConfigMap'
    | 'Secret'
    | 'Ingress'
    | 'PersistentVolumeClaim';

/** Map from resource type to schema filename (without .json extension) */
const RESOURCE_TO_SCHEMA: Record<K8sResourceType, string> = {
    Deployment: 'deployment',
    StatefulSet: 'statefulset',
    Job: 'job',
    CronJob: 'cronjob',
    Service: 'service',
    ConfigMap: 'configmap',
    Secret: 'secret',
    Ingress: 'ingress',
    PersistentVolumeClaim: 'persistentvolumeclaim',
};

// =========================================
// VALIDATOR CLASS
// =========================================

/**
 * K8sSchemaValidator
 * 
 * A class for validating Kubernetes manifests against JSON schemas.
 * 
 * @example
 * ```typescript
 * const validator = new K8sSchemaValidator();
 * const result = validator.validate(yamlString, 'Deployment');
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export class K8sSchemaValidator {
    private ajv: Ajv;
    private schemaDir: string;
    private validators: Map<K8sResourceType, ValidateFunction> = new Map();

    /**
     * Creates a new K8sSchemaValidator instance.
     * 
     * @param schemaDir - Path to the directory containing schema JSON files.
     *                    Defaults to 'src/test/schemas' relative to cwd.
     */
    constructor(schemaDir?: string) {
        this.schemaDir = schemaDir ?? path.join(process.cwd(), 'src', 'test', 'schemas');

        // Initialize Ajv with K8s-compatible settings
        this.ajv = new Ajv({
            // Kubernetes schemas have some non-standard constructs
            strict: false,
            // Return all errors, not just the first one
            allErrors: true,
            // Allow additional properties by default (K8s schemas are permissive)
            allowUnionTypes: true,
            // Verbose error messages
            verbose: true,
        });

        // Add format validators (email, ipv4, uri, etc.)
        addFormats(this.ajv);
    }

    /**
     * Loads and compiles a schema for the given resource type.
     * Caches compiled validators for reuse.
     * 
     * @param resourceType - The Kubernetes resource type to load schema for
     * @returns Compiled Ajv validator function
     * @throws Error if schema file cannot be read or parsed
     */
    private getValidator(resourceType: K8sResourceType): ValidateFunction {
        // Check cache first
        const cached = this.validators.get(resourceType);
        if (cached) {
            return cached;
        }

        // Load schema from file
        const schemaFilename = RESOURCE_TO_SCHEMA[resourceType];
        if (!schemaFilename) {
            throw new Error(`Unknown resource type: ${resourceType}`);
        }

        const schemaPath = path.join(this.schemaDir, `${schemaFilename}.json`);

        if (!fs.existsSync(schemaPath)) {
            throw new Error(
                `Schema not found for ${resourceType}. ` +
                `Expected file: ${schemaPath}. ` +
                `Run 'npm run download-schemas' to download schemas.`
            );
        }

        try {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            const schema = JSON.parse(schemaContent);

            // Compile the schema
            const validator = this.ajv.compile(schema);

            // Cache for reuse
            this.validators.set(resourceType, validator);

            return validator;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to load schema for ${resourceType}: ${message}`);
        }
    }

    /**
     * Formats Ajv errors into human-readable strings.
     * 
     * @param errors - Array of Ajv error objects
     * @returns Array of formatted error messages
     */
    private formatErrors(errors: ErrorObject[] | null | undefined): string[] {
        if (!errors || errors.length === 0) {
            return [];
        }

        return errors.map((error) => {
            const path = error.instancePath || '/';
            const message = error.message || 'Unknown error';

            // Include additional info for specific error types
            if (error.keyword === 'enum' && error.params?.allowedValues) {
                return `${path}: ${message}. Allowed: ${error.params.allowedValues.join(', ')}`;
            }

            if (error.keyword === 'additionalProperties' && error.params?.additionalProperty) {
                return `${path}: ${message} ('${error.params.additionalProperty}')`;
            }

            return `${path}: ${message}`;
        });
    }

    /**
     * Validates a YAML or JSON string against a Kubernetes schema.
     * 
     * @param yamlString - The YAML (or JSON) string to validate
     * @param resourceType - The Kubernetes resource type to validate against
     * @returns Validation result with valid flag and error messages
     * 
     * @example
     * ```typescript
     * const result = validator.validate(`
     *   apiVersion: apps/v1
     *   kind: Deployment
     *   metadata:
     *     name: my-app
     *   spec:
     *     replicas: 3
     * `, 'Deployment');
     * 
     * console.log(result.valid); // true or false
     * console.log(result.errors); // [] or ['error messages...']
     * ```
     */
    validate(yamlString: string, resourceType: K8sResourceType): ValidationResult {
        // Parse YAML to JSON
        let document: unknown;
        try {
            document = yaml.load(yamlString);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                valid: false,
                errors: [`YAML parsing error: ${message}`],
            };
        }

        // Validate document is an object
        if (document === null || typeof document !== 'object') {
            return {
                valid: false,
                errors: ['Document must be a non-null object'],
            };
        }

        // Get validator for resource type
        let validator: ValidateFunction;
        try {
            validator = this.getValidator(resourceType);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                valid: false,
                errors: [message],
            };
        }

        // Run validation
        const isValid = validator(document);

        if (isValid) {
            return {
                valid: true,
                errors: [],
            };
        }

        return {
            valid: false,
            errors: this.formatErrors(validator.errors),
            rawErrors: validator.errors ?? undefined,
        };
    }

    /**
     * Validates a JSON object directly (no YAML parsing needed).
     * 
     * @param document - The JSON object to validate
     * @param resourceType - The Kubernetes resource type to validate against
     * @returns Validation result with valid flag and error messages
     */
    validateObject(document: unknown, resourceType: K8sResourceType): ValidationResult {
        if (document === null || typeof document !== 'object') {
            return {
                valid: false,
                errors: ['Document must be a non-null object'],
            };
        }

        let validator: ValidateFunction;
        try {
            validator = this.getValidator(resourceType);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                valid: false,
                errors: [message],
            };
        }

        const isValid = validator(document);

        if (isValid) {
            return {
                valid: true,
                errors: [],
            };
        }

        return {
            valid: false,
            errors: this.formatErrors(validator.errors),
            rawErrors: validator.errors ?? undefined,
        };
    }

    /**
     * Lists available schema files in the schema directory.
     * 
     * @returns Array of schema filenames (without .json extension)
     */
    listAvailableSchemas(): string[] {
        if (!fs.existsSync(this.schemaDir)) {
            return [];
        }

        return fs.readdirSync(this.schemaDir)
            .filter((file) => file.endsWith('.json') && file !== 'metadata.json')
            .map((file) => file.replace('.json', ''));
    }

    /**
     * Checks if a schema is available for the given resource type.
     * 
     * @param resourceType - The Kubernetes resource type to check
     * @returns True if the schema file exists
     */
    hasSchema(resourceType: K8sResourceType): boolean {
        const schemaFilename = RESOURCE_TO_SCHEMA[resourceType];
        if (!schemaFilename) {
            return false;
        }

        const schemaPath = path.join(this.schemaDir, `${schemaFilename}.json`);
        return fs.existsSync(schemaPath);
    }
}

// Export a factory function for convenience
export function createValidator(schemaDir?: string): K8sSchemaValidator {
    return new K8sSchemaValidator(schemaDir);
}
