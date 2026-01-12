/**
 * Kubernetes JSON Schema Download Script
 * 
 * Downloads official Kubernetes JSON schemas for validating generated YAML.
 * Uses the yannh/kubernetes-json-schema repository which provides standalone schemas.
 * 
 * Usage: npx tsx scripts/download-schemas.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';

// =========================================
// CONFIGURATION - Modify these as needed
// =========================================

/** Target Kubernetes version */
const K8S_VERSION = 'v1.33.7';

/** Base URL for kubernetes-json-schema repository */
const SCHEMA_BASE_URL = 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master';

/** Output directory for downloaded schemas */
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'test', 'schemas');

/** Resource types to download with their API groups */
interface ResourceSchema {
    name: string;
    filename: string;
    apiGroup: string;
}

const RESOURCES: ResourceSchema[] = [
    // Apps API group
    { name: 'Deployment', filename: 'deployment', apiGroup: 'apps' },
    { name: 'StatefulSet', filename: 'statefulset', apiGroup: 'apps' },
    // Batch API group
    { name: 'Job', filename: 'job', apiGroup: 'batch' },
    { name: 'CronJob', filename: 'cronjob', apiGroup: 'batch' },
    // Core API (no group)
    { name: 'Service', filename: 'service', apiGroup: '' },
    { name: 'ConfigMap', filename: 'configmap', apiGroup: '' },
    { name: 'Secret', filename: 'secret', apiGroup: '' },
    { name: 'PersistentVolumeClaim', filename: 'persistentvolumeclaim', apiGroup: '' },
    // Networking API group
    { name: 'Ingress', filename: 'ingress', apiGroup: 'networking.k8s.io' },
];

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Makes an HTTPS GET request and returns the response body
 */
function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                // Follow redirects
                const redirectUrl = res.headers.location;
                if (redirectUrl) {
                    httpsGet(redirectUrl).then(resolve).catch(reject);
                    return;
                }
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: Failed to fetch ${url}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Checks if a schema URL exists by attempting to fetch it
 */
async function schemaExists(url: string): Promise<boolean> {
    try {
        await httpsGet(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Constructs the schema URL for a given resource and version
 */
function getSchemaUrl(version: string, resource: ResourceSchema): string {
    // Keep the version as-is for directory name (e.g., v1.33.7 -> v1.33.7-standalone-strict)
    // The repo uses v1.33.7-standalone-strict as the directory name
    const schemaVariant = `${version}-standalone-strict`;

    // For core API resources (no apiGroup), use just the name
    // For other resources, include the API group version
    let schemaFilename: string;
    if (resource.apiGroup === '') {
        schemaFilename = `${resource.filename}.json`;
    } else if (resource.apiGroup === 'apps') {
        schemaFilename = `${resource.filename}-apps-v1.json`;
    } else if (resource.apiGroup === 'batch') {
        schemaFilename = `${resource.filename}-batch-v1.json`;
    } else if (resource.apiGroup === 'networking.k8s.io') {
        schemaFilename = `${resource.filename}-networking-v1.json`;
    } else {
        schemaFilename = `${resource.filename}.json`;
    }

    return `${SCHEMA_BASE_URL}/${schemaVariant}/${schemaFilename}`;
}

/**
 * Ensures the output directory exists
 */
function ensureOutputDir(): void {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
    }
}

/**
 * Downloads a schema and saves it to the output directory
 */
async function downloadSchema(
    version: string,
    resource: ResourceSchema
): Promise<{ success: boolean; version: string }> {
    const url = getSchemaUrl(version, resource);

    try {
        console.log(`  ⏳ Downloading ${resource.name}...`);
        const schemaContent = await httpsGet(url);

        // Validate it's valid JSON
        JSON.parse(schemaContent);

        // Save to file
        const outputPath = path.join(OUTPUT_DIR, `${resource.filename}.json`);
        fs.writeFileSync(outputPath, schemaContent);

        console.log(`  ✅ Downloaded ${resource.name}`);
        return { success: true, version };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ Failed to download ${resource.name}: ${message}`);
        return { success: false, version: '' };
    }
}

/**
 * Creates a metadata file with version information
 */
function createMetadataFile(results: Map<string, string>): void {
    const metadata = {
        downloadedAt: new Date().toISOString(),
        targetVersion: K8S_VERSION,
        schemas: Object.fromEntries(results),
    };

    const metadataPath = path.join(OUTPUT_DIR, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`\n📋 Created metadata file: ${metadataPath}`);
}

// =========================================
// MAIN EXECUTION
// =========================================

async function main(): Promise<void> {
    console.log('🚀 Kubernetes Schema Downloader');
    console.log(`   Target version: ${K8S_VERSION}`);
    console.log(`   Output directory: ${OUTPUT_DIR}\n`);

    ensureOutputDir();

    const results = new Map<string, string>();
    let successCount = 0;
    let failCount = 0;

    for (const resource of RESOURCES) {
        const result = await downloadSchema(K8S_VERSION, resource);
        if (result.success) {
            results.set(resource.name, result.version);
            successCount++;
        } else {
            results.set(resource.name, 'FAILED');
            failCount++;
        }
    }

    createMetadataFile(results);

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully downloaded: ${successCount}/${RESOURCES.length}`);
    if (failCount > 0) {
        console.log(`   ❌ Failed: ${failCount}/${RESOURCES.length}`);
        process.exit(1);
    }

    console.log('\n✨ Schema download complete!\n');
}

main().catch((error) => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
