---
id: 026-namespace-refactor
title: "Refactor Namespace Logic"
status: "active"
owner: "Claude"
created: "2026-01-26"
---

# Refactor Namespace Logic

**Goal**: Change Namespace from a graph node to a global context.

## Tasks
- [ ] **API Updates** (`useK8sApi.js`)
    - [ ] Add `listNamespaces` function.
- [ ] **UI Components**
    - [ ] Create `NamespaceSelector.vue` (Modal for select/create).
- [ ] **App Logic** (`App.vue`)
    - [ ] Add `currentNamespace` state.
    - [ ] Show Selector on mount.
    - [ ] Enforce namespace on startup.
- [ ] **Sidebar** (`resourceTemplates.js`)
    - [ ] Remove "Namespace" from sidebar list.
- [ ] **Canvas** (`Canvas.vue`)
    - [ ] Display current namespace.
    - [ ] Inject namespace into dropped nodes.
- [ ] **Cleanup**
    - [ ] Remove legacy namespace node handling.

## Verification
- [ ] Verify Sidebar no longer has Namespace.
- [ ] Verify startup modal appears.
- [ ] Verify creating new namespace works.
- [ ] Verify selecting existing namespace works.
- [ ] Verify new resources get the correct namespace.
