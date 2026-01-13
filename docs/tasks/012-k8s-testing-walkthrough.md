# K8s Testing Infrastructure - Walkthrough

## Overview

Successfully implemented a robust unit testing strategy for KubeCanvas with Kubernetes JSON schema validation.

## What Was Implemented

### 1. Dependencies Installed

```bash
npm install --save-dev vitest ajv ajv-formats js-yaml @types/js-yaml typescript @types/node tsx
```

### 2. Files Created

| File | Purpose |
|------|---------|
| tsconfig.json | TypeScript configuration for test infrastructure |
| scripts/download-schemas.ts | Downloads K8s JSON schemas from GitHub |
| src/test/validator.ts | `K8sSchemaValidator` class using Ajv |
| src/generators/deployment.ts | Sample Deployment YAML generator |
| src/generators/__tests__/Deployment.test.ts | Vitest tests with snapshot + schema validation |

### 3. Files Modified

- vite.config.js - Added Vitest configuration
- package.json - Added test scripts

---

## NPM Scripts

```bash
# Download K8s schemas (run before tests)
npm run download-schemas

# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# TypeScript type checking
npm run typecheck
```

---

## Verification Results

### Schema Download

Downloaded schemas for 6 resource types to `src/test/schemas/`:
- Deployment, Service, ConfigMap, Secret, Ingress, PersistentVolumeClaim

> **Note:** K8s v1.33.0 schemas were not yet published. Fallback to `master` branch was used successfully.

### Test Execution

```
✓ src/generators/__tests__/Deployment.test.ts (11 tests)
  ✓ YAML Generation (5)
  ✓ Snapshot Testing (2) - 2 snapshots written
  ✓ Schema Validation (4)

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  1.12s
```

---

## Usage Example

```typescript
import { K8sSchemaValidator } from '@/test/validator';
import { generateDeployment } from '@/generators/deployment';

// Generate YAML
const yaml = generateDeployment({
  name: 'my-app',
  replicas: 3,
  containers: [{
    name: 'app',
    image: 'nginx:latest',
    ports: [{ containerPort: 80 }],
  }],
});

// Validate against K8s schema
const validator = new K8sSchemaValidator();
const result = validator.validate(yaml, 'Deployment');

console.log(result.valid);   // true
console.log(result.errors);  // []
```
