# Optimize Composition Save Flow

When a composition is restored from K8s and modified, the save should:
1. Reuse the existing name (skip dialog)
2. Only submit changes: create new resources, patch modified ones

## Proposed Changes

### App.vue

#### [MODIFY] [App.vue](file:///Users/luogangyi/Code/KubeCanvas/src/App.vue)

1. **Track composition state**:
   - Add `currentCompositionName` ref to store loaded composition name
   - Add `originalResources` ref to store snapshot of resources at load time
   - Set both when calling `loadComposition()`

2. **Modify save button logic**:
   - If `currentCompositionName` exists (restored composition), call `handleIncrementalSave()` directly
   - Otherwise, show `SaveDialog` for new composition

3. **Add `handleIncrementalSave()` function**:
   - Diff current resources vs `originalResources`
   - New resources → `createResource()`
   - Modified resources → `patchResource()` (strategic merge patch)
   - Unchanged → skip
   - Update registry with current count

---

### useK8sApi.js

#### [MODIFY] [useK8sApi.js](file:///Users/luogangyi/Code/KubeCanvas/src/composables/useK8sApi.js)

Add `patchResource()` function using K8s strategic merge patch:

```js
async function patchResource(resource) {
    const client = await initApiClient()
    const kind = resource.kind
    const name = resource.metadata.name
    const namespace = resource.metadata?.namespace || getNamespace()
    const path = getApiPath(kind, namespace)
    
    // Use strategic merge patch
    const response = await client.patch(`${path}/${name}`, resource, {
        headers: { 'Content-Type': 'application/strategic-merge-patch+json' }
    })
    return response.data
}
```

---

### SaveDialog.vue

#### [MODIFY] [SaveDialog.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/SaveDialog.vue)

Add `initialName` prop to pre-fill for existing compositions (optional enhancement).

---

## Resource Diff Logic

```js
function diffResources(original, current) {
    const originalMap = new Map(original.map(r => [resourceKey(r), r]))
    const currentMap = new Map(current.map(r => [resourceKey(r), r]))
    
    const toCreate = []
    const toPatch = []
    const unchanged = []
    
    for (const [key, resource] of currentMap) {
        if (!originalMap.has(key)) {
            toCreate.push(resource)
        } else if (hasChanged(originalMap.get(key), resource)) {
            toPatch.push(resource)
        } else {
            unchanged.push(resource)
        }
    }
    
    return { toCreate, toPatch, unchanged }
}

function resourceKey(r) {
    return `${r.kind}/${r.metadata.namespace}/${r.metadata.name}`
}

function hasChanged(original, current) {
    // Compare spec (ignore metadata changes like resourceVersion)
    return JSON.stringify(original.spec) !== JSON.stringify(current.spec)
}
```

## Verification Plan

### Manual Verification
1. Create composition with 2 resources → Save → Note name
2. Add 1 new resource → Save → Should NOT prompt for name
3. Modify existing resource → Save → Should use PATCH
4. Check K8s: new resource created, existing updated
