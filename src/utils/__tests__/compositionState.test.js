import { describe, it, expect } from 'vitest'
import { createSavedCompositionState } from '../compositionState.js'

describe('createSavedCompositionState', () => {
  it('marks a newly saved composition as editable with an isolated original snapshot', () => {
    const resources = [
      {
        kind: 'Deployment',
        metadata: { name: 'web', namespace: 'default' },
        spec: { replicas: 1 },
      },
    ]

    const state = createSavedCompositionState('My App', resources)

    expect(state.currentCompositionName).toBe('My App')
    expect(state.originalResources).toEqual(resources)

    resources[0].spec.replicas = 3
    expect(state.originalResources[0].spec.replicas).toBe(1)
  })
})
