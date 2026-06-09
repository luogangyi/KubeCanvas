import { describe, expect, it } from 'vitest'
import {
  LOCAL_PV_STORAGE_BACKEND,
  createLocalPersistentVolumeForClaim,
  normalizeLocalPVClaim,
  sortResourcesForCreate,
  sortResourcesForDelete,
  withGeneratedLocalPVResources
} from '../localPvResources.js'

const localPVC = {
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  metadata: {
    name: 'data',
    namespace: 'default',
    labels: {
      app: 'data',
      'kubecanvas.io/composition': 'composition-test'
    },
    annotations: {
      'kubecanvas.io/pvc-storage-backend': LOCAL_PV_STORAGE_BACKEND,
      'kubecanvas.io/local-pv-node': 'lgy-test-gpu',
      'kubecanvas.io/local-pv-path': '/mnt/kubecanvas-localpv/default/data',
      'kubecanvas.io/local-pv-name': 'pv-data',
      'kubecanvas.io/local-pv-reclaim-policy': 'Delete'
    }
  },
  spec: {
    storageClassName: 'rootpv-local',
    accessModes: ['ReadWriteOnce'],
    resources: {
      requests: {
        storage: '1Gi'
      }
    }
  }
}

describe('local PV resources', () => {
  it('generates a hostPath PV that a local PVC can bind directly', () => {
    const pvc = normalizeLocalPVClaim(localPVC)
    const pv = createLocalPersistentVolumeForClaim(pvc)

    expect(pvc.spec.volumeName).toBe('pv-data')
    expect(pv).toMatchObject({
      apiVersion: 'v1',
      kind: 'PersistentVolume',
      metadata: {
        name: 'pv-data',
        labels: {
          app: 'data',
          'kubecanvas.io/composition': 'composition-test',
          'kubecanvas.io/generated-for-pvc': 'data',
          'kubecanvas.io/managed-by': 'kubecanvas'
        }
      },
      spec: {
        capacity: {
          storage: '1Gi'
        },
        accessModes: ['ReadWriteOnce'],
        persistentVolumeReclaimPolicy: 'Delete',
        storageClassName: 'rootpv-local',
        hostPath: {
          path: '/mnt/kubecanvas-localpv/default/data',
          type: 'DirectoryOrCreate'
        },
        nodeAffinity: {
          required: {
            nodeSelectorTerms: [
              {
                matchExpressions: [
                  {
                    key: 'kubernetes.io/hostname',
                    operator: 'In',
                    values: ['lgy-test-gpu']
                  }
                ]
              }
            ]
          }
        }
      }
    })
  })

  it('injects generated PVs for local PVCs and leaves normal PVCs unchanged', () => {
    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: 'web', namespace: 'default' },
      spec: {}
    }
    const normalPVC = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: { name: 'cache', namespace: 'default' },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: { requests: { storage: '1Gi' } }
      }
    }

    const resources = withGeneratedLocalPVResources([deployment, localPVC, normalPVC])

    expect(resources.map(resource => `${resource.kind}/${resource.metadata.name}`)).toEqual([
      'Deployment/web',
      'PersistentVolume/pv-data',
      'PersistentVolumeClaim/data',
      'PersistentVolumeClaim/cache'
    ])
  })

  it('sorts resources so storage dependencies are created before workloads and deleted after workloads', () => {
    const namespace = { kind: 'Namespace', metadata: { name: 'demo' } }
    const pv = { kind: 'PersistentVolume', metadata: { name: 'pv-data' } }
    const pvc = { kind: 'PersistentVolumeClaim', metadata: { name: 'data', namespace: 'demo' } }
    const deployment = { kind: 'Deployment', metadata: { name: 'web', namespace: 'demo' } }

    expect(sortResourcesForCreate([deployment, pvc, namespace, pv]).map(r => r.kind)).toEqual([
      'Namespace',
      'PersistentVolume',
      'PersistentVolumeClaim',
      'Deployment'
    ])
    expect(sortResourcesForDelete([namespace, pv, pvc, deployment]).map(r => r.kind)).toEqual([
      'Deployment',
      'PersistentVolumeClaim',
      'PersistentVolume',
      'Namespace'
    ])
  })
})
