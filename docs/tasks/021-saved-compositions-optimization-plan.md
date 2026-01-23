---
title:      "Saved Compositions UI Optimization Plan"
created:    "2026-01-23"
author:     "Claude + Gangyi"
version:    1
status:     "active"
related:    []
tags:       [ui, optimization, sidebar, composition]
---

# Saved Compositions UI Optimization Plan

## Goal Description
Optimize the display of saved compositions in the sidebar. Currently, a long list of compositions clutters the interface. The goal is to:
1.  Show only a limited number of "Recent" compositions in the sidebar.
2.  Provide a "More..." button that opens a dedicated "Composition Library" modal.
3.  The Library modal should offer search, sorting, and better management (view details, delete) capabilities.

## User Review Required
> [!NOTE]
> The sidebar will now only show the top 5 most recently updated compositions. Users will need to click "View All" to access older items.

## Proposed Changes

### Components Setup

#### [NEW] [CompositionLibrary.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/CompositionLibrary.vue)
A new modal component for browsing all saved compositions.
-   **Features**:
    -   Search bar to filter by name.
    -   Sort options (Name, Updated Time, Resource Count).
    -   Grid layout for composition cards.
    -   Actions: Load, Delete.
-   **Style**: Reuses modal styles from `SaveDialog.vue`.

### Sidebar Update

#### [MODIFY] [Sidebar.vue](file:///Users/luogangyi/Code/KubeCanvas/src/components/Sidebar.vue)
-   Limit the `v-for` loop for compositions to show only the top 5 (sorted by `updatedAt` desc).
-   Add a "More / View All" button at the bottom of the list.
-   Emit an event `openLibrary` when the button is clicked.

### App Integration

#### [MODIFY] [App.vue](file:///Users/luogangyi/Code/KubeCanvas/src/App.vue)
-   Import and register `CompositionLibrary`.
-   Add state `showLibraryModal`.
-   Handle `openLibrary` event from `Sidebar` to open the modal.
-   Pass `compositions`, `loadComposition` and `deleteComposition` methods to the library.

## Verification Plan

### Manual Verification
1.  **Sidebar Limit**: Verify that only 5 items appear in the sidebar when >5 compositions exist.
2.  **Modal Open**: Click "More..." and verify the modal opens.
3.  **Search/Sort**: Test filtering and sorting in the modal.
4.  **Load**: Verify clicking a card loads the composition.
5.  **Delete**: Verify deleting a composition works and updates both the modal and sidebar list.
