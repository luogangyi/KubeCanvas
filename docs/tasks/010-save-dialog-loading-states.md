# Save Dialog and Loading States

## Tasks

### 1. Create Save Dialog Component
- [x] Create SaveDialog.vue with name input
- [x] Add show/hide logic in App.vue
- [x] Pass name to save flow

### 2. Update ConfigMap to store name
- [x] Add `name` field to registry entry
- [x] Update updateCompositionsRegistry signature
- [x] Update listCompositions to return custom name

### 3. Improve Loading Indicators
- [x] Create LoadingOverlay.vue with icon + progress
- [x] Show during save with "保存中..."
- [x] Show during restore with "恢复中..."
- [x] Success state with checkmark

### 4. Update Sidebar Display
- [x] Show custom composition name (already implemented via listCompositions)
