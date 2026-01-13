/**
 * Kubernetes Immutable Fields Scanner Script
 * 
 * Scans K8s JSON Schema files to extract immutable fields based on description keywords.
 * Useful for implementing field locking in Edit Mode.
 * 
 * Usage: npx tsx scripts/scan-immutables.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// =========================================
// CONFIGURATION
// =========================================

/** Directory containing K8s JSON schemas */
const SCHEMAS_DIR = path.join(process.cwd(), 'src', 'test', 'schemas');

/** Output file for the immutables report */
const OUTPUT_FILE = path.join(SCHEMAS_DIR, 'immutables-report.json');

/** Keywords indicating immutability (case-insensitive) */
const IMMUTABLE_KEYWORDS = [
    'cannot be updated',
    'cannot be modified',
    'immutable',
    'replacement required',
];

/** System/read-only field paths to exclude (these are server-managed) */
const EXCLUDED_PATHS = [
    'status',
    'metadata.uid',
    'metadata.resourceVersion',
    'metadata.generation',
    'metadata.creationTimestamp',
    'metadata.deletionTimestamp',
    'metadata.deletionGracePeriodSeconds',
    'metadata.selfLink',
    'metadata.managedFields',
];

// =========================================
// TYPES
// =========================================

interface SchemaProperty {
    description?: string;
    properties?: Record<string, SchemaProperty>;
    items?: SchemaProperty;
    'x-kubernetes-immutable'?: boolean;
    [key: string]: unknown;
}

interface Schema {
    description?: string;
    properties?: Record<string, SchemaProperty>;
    [key: string]: unknown;
}

interface ImmutablesReport {
    [resourceType: string]: string[];
}

interface ScanResult {
    field: string;
    reason: string;
}

// =========================================
// SCANNING FUNCTIONS
// =========================================

/**
 * Checks if a description contains immutability keywords
 */
function containsImmutableKeyword(description: string | undefined): string | null {
    if (!description) return null;

    const lowerDesc = description.toLowerCase();
    for (const keyword of IMMUTABLE_KEYWORDS) {
        if (lowerDesc.includes(keyword)) {
            return keyword;
        }
    }
    return null;
}

/**
 * Checks if a path should be excluded (system/read-only fields)
 */
function shouldExcludePath(fieldPath: string): boolean {
    return EXCLUDED_PATHS.some(excluded =>
        fieldPath === excluded || fieldPath.startsWith(excluded + '.')
    );
}

/**
 * Recursively scans schema properties to find immutable fields
 */
function scanProperties(
    properties: Record<string, SchemaProperty>,
    parentPath: string = ''
): ScanResult[] {
    const results: ScanResult[] = [];

    for (const [propName, propSchema] of Object.entries(properties)) {
        const fieldPath = parentPath ? `${parentPath}.${propName}` : propName;

        // Skip excluded system fields
        if (shouldExcludePath(fieldPath)) {
            continue;
        }

        // Check for x-kubernetes-immutable attribute
        if (propSchema['x-kubernetes-immutable'] === true) {
            results.push({
                field: fieldPath,
                reason: 'x-kubernetes-immutable: true'
            });
        }

        // Check description for immutability keywords
        const keyword = containsImmutableKeyword(propSchema.description);
        if (keyword) {
            results.push({
                field: fieldPath,
                reason: `description contains "${keyword}"`
            });
        }

        // Recursively scan nested properties
        if (propSchema.properties) {
            results.push(...scanProperties(propSchema.properties, fieldPath));
        }

        // Handle array items with properties
        if (propSchema.items?.properties) {
            results.push(...scanProperties(propSchema.items.properties, `${fieldPath}[]`));
        }
    }

    return results;
}

/**
 * Scans a single schema file and returns immutable fields
 */
function scanSchemaFile(filePath: string): { resourceType: string; fields: string[] } | null {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const schema: Schema = JSON.parse(content);

        // Extract resource type from filename (e.g., "deployment.json" -> "Deployment")
        const filename = path.basename(filePath, '.json');
        const resourceType = filename.charAt(0).toUpperCase() + filename.slice(1);

        // Skip metadata.json
        if (filename === 'metadata') {
            return null;
        }

        if (!schema.properties) {
            console.log(`  ⚠️  ${resourceType}: No properties found`);
            return null;
        }

        const results = scanProperties(schema.properties);

        // Deduplicate fields (same field might be detected by multiple keywords)
        const uniqueFields = [...new Set(results.map(r => r.field))].sort();

        return {
            resourceType,
            fields: uniqueFields
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error scanning ${filePath}: ${message}`);
        return null;
    }
}

/**
 * Scans all schema files in the directory
 */
function scanAllSchemas(): ImmutablesReport {
    const report: ImmutablesReport = {};

    // Find all JSON files in schemas directory
    const files = fs.readdirSync(SCHEMAS_DIR)
        .filter(f => f.endsWith('.json') && f !== 'metadata.json')
        .sort();

    console.log(`\n📂 Scanning ${files.length} schema files in ${SCHEMAS_DIR}\n`);

    for (const file of files) {
        const filePath = path.join(SCHEMAS_DIR, file);
        const result = scanSchemaFile(filePath);

        if (result && result.fields.length > 0) {
            report[result.resourceType] = result.fields;
            console.log(`  ✅ ${result.resourceType}: ${result.fields.length} immutable fields`);
        } else if (result) {
            console.log(`  ⚪ ${result.resourceType}: No immutable fields found`);
        }
    }

    return report;
}

// =========================================
// MAIN EXECUTION
// =========================================

function main(): void {
    console.log('🔍 Kubernetes Immutable Fields Scanner');
    console.log('   Scanning for fields marked as immutable in K8s JSON Schemas\n');

    // Check if schemas directory exists
    if (!fs.existsSync(SCHEMAS_DIR)) {
        console.error(`❌ Schemas directory not found: ${SCHEMAS_DIR}`);
        console.error('   Run "npm run download-schemas" first.');
        process.exit(1);
    }

    const report = scanAllSchemas();

    // Summary
    const totalResources = Object.keys(report).length;
    const totalFields = Object.values(report).reduce((sum, fields) => sum + fields.length, 0);

    console.log('\n📊 Summary:');
    console.log(`   Resources scanned: ${totalResources}`);
    console.log(`   Total immutable fields: ${totalFields}`);

    // Save report
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${OUTPUT_FILE}`);

    // Also print JSON to stdout for convenience
    console.log('\n📋 Immutables Report:\n');
    console.log(JSON.stringify(report, null, 2));
}

main();
