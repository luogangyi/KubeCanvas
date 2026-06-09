import { describe, it, expect } from 'vitest'
import { syncWorkloadIdentity } from '../resourceRelationships.js'

describe('syncWorkloadIdentity', () => {
  it('keeps a new workload selector and pod template labels aligned after rename', () => {
    const resource = {
      kind: 'Deployment',
      metadata: {
        name: 'old-name',
        labels: { app: 'old-name' },
      },
      spec: {
        selector: { matchLabels: { app: 'old-name' } },
        template: { metadata: { labels: { app: 'old-name' } }, spec: {} },
      },
    }

    syncWorkloadIdentity(resource, 'new-name')

    expect(resource.metadata.name).toBe('new-name')
    expect(resource.metadata.labels.app).toBe('new-name')
    expect(resource.spec.selector.matchLabels.app).toBe('new-name')
    expect(resource.spec.template.metadata.labels.app).toBe('new-name')
  })

  it('does not rewrite immutable selectors for resources already loaded from Kubernetes', () => {
    const resource = {
      kind: 'Deployment',
      metadata: {
        name: 'web',
        resourceVersion: '123',
        labels: { app: 'web' },
      },
      spec: {
        selector: { matchLabels: { app: 'web' } },
        template: { metadata: { labels: { app: 'web' } }, spec: {} },
      },
    }

    syncWorkloadIdentity(resource, 'api', { updateName: false })

    expect(resource.metadata.labels.app).toBe('api')
    expect(resource.spec.selector.matchLabels.app).toBe('web')
    expect(resource.spec.template.metadata.labels.app).toBe('web')
  })
})
