export function createSavedCompositionState(compositionName, resources) {
    return {
        currentCompositionName: compositionName,
        originalResources: resources.map(resource => JSON.parse(JSON.stringify(resource)))
    }
}
