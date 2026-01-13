# Namespace Container Optimization

## Tasks

### 1. Sidebar Display
- [x] Add Namespace resource to sidebar under "集群" (Cluster) section
- [x] Add CNCF-style icon for Namespace (ns.svg)

### 2. Default Size
- [x] Increase default Namespace container size to 600x450 pixels

### 3. Selection Priority
- [x] Use zIndex to layer Namespace below internal resources
- [x] Skip selecting Namespace on single click
- [x] Allow double-click to select Namespace for editing
- [x] Deselect Namespace after drag

### 4. Group Movement
- [x] Track child nodes when Namespace drag starts
- [x] Move child nodes together with Namespace

### 5. API and Save Fixes
- [x] Sort resources to create Namespace first
- [x] Add correct API path for Namespace (cluster-scoped)
- [x] Hide namespace field in PropertyPanel for Namespace resources

### 6. UX Improvements
- [x] Add custom tooltip "双击选中" on hover
