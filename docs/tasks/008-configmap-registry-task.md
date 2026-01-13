# ConfigMap Registry for Compositions

## Problem
Compositions saved in non-default namespaces cannot be listed. Cross-namespace query is too expensive for large clusters.

## Solution: ConfigMap Registry
Store namespace + compositionId pairs in a ConfigMap for fast listing.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubecanvas-compositions
  namespace: default  # Fixed location
data:
  compositions: |
    {"comp-uuid-1": {"namespace": "namespace-a", "name": "My App"}}
```

## Tasks

### 1. Add ConfigMap operations to useK8sApi.js
- [x] Add `REGISTRY_CONFIGMAP_NAME` constant
- [x] Add `getCompositionsRegistry()` function
- [x] Add `updateCompositionsRegistry(compositionId, namespace, resourceCount, name)` function
- [x] Add `removeFromRegistry(compositionId)` function

### 2. Update listCompositions
- [x] Read from ConfigMap for fast listing
- [x] Return custom name from registry

### 3. Update getCompositionResources
- [x] Look up namespace from registry
- [x] Query specific namespace only
- [x] Add Namespace to queried kinds

### 4. Update App.vue save flow
- [x] After save, call updateCompositionsRegistry()
