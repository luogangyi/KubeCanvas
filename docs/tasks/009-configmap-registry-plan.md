# ConfigMap Registry for Compositions - Implementation Plan

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
    {"comp-uuid-1": "namespace-a", "comp-uuid-2": "default", "comp-uuid-3": "namespace-b"}
```

## Proposed Changes

### [MODIFY] useK8sApi.js

#### 1. Add ConfigMap operations
- `getCompositionsRegistry()` - Read the ConfigMap
- `updateCompositionsRegistry(compositionId, namespace)` - Add entry when saving
- `removeFromRegistry(compositionId)` - Remove entry when deleting

#### 2. Update `listCompositions()`
- Read from ConfigMap instead of querying by label
- Return list with namespace info

#### 3. Update `getCompositionResources(compositionId)`
- Look up namespace from registry first
- Query only that specific namespace

### [MODIFY] App.vue
- After successful save, update ConfigMap registry

## Data Flow

```
Save Composition:
  1. Create resources in target namespace(s)
  2. Update ConfigMap with {compositionId: namespace} entry

List Compositions:
  1. Read ConfigMap → instant list of all compositions

Load Composition:
  1. Look up namespace from ConfigMap
  2. Query that specific namespace for resources
```

## Verification
1. Save composition in new namespace → appears in list
2. Click composition → loads resources from correct namespace
3. Delete composition → removed from registry
