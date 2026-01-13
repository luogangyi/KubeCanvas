# Redesigning Connection Brush Workflow

## New Flow
1. Click brush → Brush enters "activated" state
2. Click on a component → Source is selected
3. Click on another component → Connection created

## Tasks

### 1. Change brush activation
- [x] Replace @mousedown with @click for activateBrush
- [x] Toggle brush mode on click

### 2. Update source selection
- [x] Remove auto-detect source in onMouseMove
- [x] Click node to select as source when brush active

### 3. Update target selection
- [x] Click different node to create connection
- [x] Cancel source selection if clicking pane

### 4. Namespace compatibility
- [x] Add pointer-events: none to Namespace body
- [x] Prioritize non-namespace nodes in findNodeAtPosition

### 5. Update UI prompts
- [x] Update brush tooltip text
- [x] Update connection status messages
