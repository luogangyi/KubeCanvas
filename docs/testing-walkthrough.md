# K8s Testing Infrastructure - Walkthrough

## Overview

Kubernetes **v1.33.7** schema validation testing infrastructure for KubeCanvas.

## Test Results

```
✅ All 112 tests pass across 11 test files
   K8s Schema Version: v1.33.7
   Duration: ~3.1s
```

---

## Resource Types (9)

| Resource | Generator | Test Count |
|----------|-----------|------------|
| Deployment | [deployment.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/deployment.ts) | 11 |
| **StatefulSet** | [statefulset.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/statefulset.ts) | 8 |
| **Job** | [job.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/job.ts) | 9 |
| **CronJob** | [cronjob.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/cronjob.ts) | 12 |
| Service | [service.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/service.ts) | 8 |
| ConfigMap | [configmap.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/configmap.ts) | 6 |
| Secret | [secret.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/secret.ts) | 8 |
| Ingress | [ingress.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/ingress.ts) | 9 |
| PVC | [pvc.ts](file:///Users/luogangyi/Code/KubeCanvas/src/generators/pvc.ts) | 8 |

Plus:
- **Combinations.test.ts** (13 tests) - Full stack scenarios
- **ErrorValidation.test.ts** (26 tests) - Error handling

---

## NPM Scripts

```bash
npm run download-schemas  # Download K8s v1.33.7 schemas
npm run test:run          # Run all tests
npm test                  # Watch mode
```

---

## Usage

```typescript
import { K8sSchemaValidator } from '@/test/validator';
import { generateStatefulSet } from '@/generators/statefulset';

const yaml = generateStatefulSet({
  name: 'mongodb',
  serviceName: 'mongodb-headless',
  replicas: 3,
  containers: [{ name: 'mongo', image: 'mongo:6.0' }],
  volumeClaimTemplates: [{
    name: 'data',
    accessModes: ['ReadWriteOnce'],
    storage: '50Gi',
  }],
});

const validator = new K8sSchemaValidator();
const result = validator.validate(yaml, 'StatefulSet');
console.log(result.valid); // true
```
