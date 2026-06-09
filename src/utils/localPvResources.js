export const LOCAL_PV_STORAGE_BACKEND = 'local-pv'

export const LOCAL_PV_ANNOTATIONS = {
  storageBackend: 'kubecanvas.io/pvc-storage-backend',
  node: 'kubecanvas.io/local-pv-node',
  path: 'kubecanvas.io/local-pv-path',
  name: 'kubecanvas.io/local-pv-name',
  reclaimPolicy: 'kubecanvas.io/local-pv-reclaim-policy'
}

const DEFAULT_LOCAL_PV_STORAGE_CLASS = 'rootpv-local'
const DEFAULT_RECLAIM_POLICY = 'Delete'

function cloneResource(resource) {
  return JSON.parse(JSON.stringify(resource))
}

function sanitizeNamePart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getPVCNamespace(pvc) {
  return pvc.metadata?.namespace || 'default'
}

function getPVCName(pvc) {
  return pvc.metadata?.name || 'pvc'
}

function getDefaultPVName(pvc) {
  const namespace = sanitizeNamePart(getPVCNamespace(pvc))
  const pvcName = sanitizeNamePart(getPVCName(pvc))
  return `pv-${namespace}-${pvcName}`.slice(0, 253)
}

function getDefaultLocalPVPath(pvc) {
  return `/mnt/kubecanvas-localpv/${getPVCNamespace(pvc)}/${getPVCName(pvc)}`
}

export function isLocalPVClaim(resource) {
  return resource?.kind === 'PersistentVolumeClaim'
    && resource.metadata?.annotations?.[LOCAL_PV_ANNOTATIONS.storageBackend] === LOCAL_PV_STORAGE_BACKEND
}

export function isGeneratedLocalPersistentVolume(resource) {
  return resource?.kind === 'PersistentVolume'
    && resource.metadata?.labels?.['kubecanvas.io/managed-by'] === 'kubecanvas'
    && !!resource.metadata?.labels?.['kubecanvas.io/generated-for-pvc']
}

export function getLocalPVConfig(pvc, options = {}) {
  const annotations = pvc.metadata?.annotations || {}
  return {
    pvName: annotations[LOCAL_PV_ANNOTATIONS.name] || pvc.spec?.volumeName || getDefaultPVName(pvc),
    nodeName: annotations[LOCAL_PV_ANNOTATIONS.node] || options.fallbackNodeName || '',
    path: annotations[LOCAL_PV_ANNOTATIONS.path] || getDefaultLocalPVPath(pvc),
    reclaimPolicy: annotations[LOCAL_PV_ANNOTATIONS.reclaimPolicy] || DEFAULT_RECLAIM_POLICY,
    storageClassName: pvc.spec?.storageClassName ?? DEFAULT_LOCAL_PV_STORAGE_CLASS
  }
}

export function normalizeLocalPVClaim(resource, options = {}) {
  const pvc = cloneResource(resource)

  if (!isLocalPVClaim(pvc)) return pvc

  const config = getLocalPVConfig(pvc, options)
  pvc.metadata.annotations = {
    ...(pvc.metadata.annotations || {}),
    [LOCAL_PV_ANNOTATIONS.storageBackend]: LOCAL_PV_STORAGE_BACKEND,
    [LOCAL_PV_ANNOTATIONS.name]: config.pvName,
    [LOCAL_PV_ANNOTATIONS.path]: config.path,
    [LOCAL_PV_ANNOTATIONS.reclaimPolicy]: config.reclaimPolicy
  }

  if (config.nodeName) {
    pvc.metadata.annotations[LOCAL_PV_ANNOTATIONS.node] = config.nodeName
  }

  pvc.spec = {
    ...(pvc.spec || {}),
    storageClassName: config.storageClassName,
    volumeName: config.pvName
  }

  return pvc
}

export function createLocalPersistentVolumeForClaim(resource, options = {}) {
  const pvc = normalizeLocalPVClaim(resource, options)
  if (!isLocalPVClaim(pvc)) return null

  const config = getLocalPVConfig(pvc, options)
  if (!config.nodeName) return null

  const pvcName = getPVCName(pvc)
  const storage = pvc.spec?.resources?.requests?.storage || '1Gi'

  return {
    apiVersion: 'v1',
    kind: 'PersistentVolume',
    metadata: {
      name: config.pvName,
      labels: {
        ...(pvc.metadata?.labels || {}),
        'kubecanvas.io/managed-by': 'kubecanvas',
        'kubecanvas.io/generated-for-pvc': pvcName
      }
    },
    spec: {
      capacity: {
        storage
      },
      volumeMode: pvc.spec?.volumeMode || 'Filesystem',
      accessModes: pvc.spec?.accessModes || ['ReadWriteOnce'],
      persistentVolumeReclaimPolicy: config.reclaimPolicy,
      storageClassName: config.storageClassName,
      hostPath: {
        path: config.path,
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
                  values: [config.nodeName]
                }
              ]
            }
          ]
        }
      }
    }
  }
}

export function withGeneratedLocalPVResources(resources, options = {}) {
  const generatedPVNames = new Set()

  resources.forEach(resource => {
    if (isLocalPVClaim(resource)) {
      generatedPVNames.add(getLocalPVConfig(resource, options).pvName)
    }
  })

  return resources.flatMap(resource => {
    if (resource.kind === 'PersistentVolume' && generatedPVNames.has(resource.metadata?.name)) {
      return []
    }

    if (!isLocalPVClaim(resource)) return [resource]

    const pvc = normalizeLocalPVClaim(resource, options)
    const pv = createLocalPersistentVolumeForClaim(pvc, options)
    return pv ? [pv, pvc] : [pvc]
  })
}

function createPriority(resource) {
  const kind = resource.kind
  if (kind === 'Namespace') return 0
  if (kind === 'PersistentVolume') return 1
  if (['ConfigMap', 'Secret', 'PersistentVolumeClaim'].includes(kind)) return 2
  if (['Deployment', 'DaemonSet', 'StatefulSet', 'Pod', 'Job', 'CronJob'].includes(kind)) return 3
  if (kind === 'Service') return 4
  if (kind === 'Ingress') return 5
  return 6
}

function resourceName(resource) {
  return `${resource.metadata?.namespace || ''}/${resource.metadata?.name || ''}`
}

export function sortResourcesForCreate(resources) {
  return [...resources].sort((a, b) => {
    const priorityDiff = createPriority(a) - createPriority(b)
    if (priorityDiff !== 0) return priorityDiff
    return resourceName(a).localeCompare(resourceName(b))
  })
}

export function sortResourcesForDelete(resources) {
  return [...resources].sort((a, b) => {
    const priorityDiff = createPriority(b) - createPriority(a)
    if (priorityDiff !== 0) return priorityDiff
    return resourceName(a).localeCompare(resourceName(b))
  })
}
