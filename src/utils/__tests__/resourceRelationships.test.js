import { describe, it, expect } from 'vitest'
import { syncConnectedServiceSelectors, syncWorkloadIdentity } from '../resourceRelationships.js'

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

  it('keeps connected service selectors aligned when a new workload is renamed', () => {
    const deploymentNode = {
      id: 'deployment-1',
      type: 'deployment',
      data: {
        name: 'deployment-6363',
        resource: {
          kind: 'Deployment',
          metadata: {
            name: 'deployment-6363',
            labels: { app: 'deployment-6363' },
          },
          spec: {
            selector: { matchLabels: { app: 'deployment-6363' } },
            template: { metadata: { labels: { app: 'deployment-6363' } }, spec: {} },
          },
        },
      },
    }
    const serviceNode = {
      id: 'service-1',
      type: 'service',
      data: {
        name: 'service-4240',
        resource: {
          kind: 'Service',
          metadata: { name: 'service-4240' },
          spec: { selector: { app: 'deployment-6363' } },
        },
      },
    }
    const nodes = [deploymentNode, serviceNode]
    const edges = [{ source: serviceNode.id, target: deploymentNode.id }]

    syncWorkloadIdentity(deploymentNode.data.resource, 'zsy-test')
    deploymentNode.data.name = 'zsy-test'
    syncConnectedServiceSelectors(nodes, edges, deploymentNode)

    expect(serviceNode.data.resource.spec.selector).toEqual({ app: 'zsy-test' })
  })
})
