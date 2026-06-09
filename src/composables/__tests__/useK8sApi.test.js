import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockClient),
  },
}))

describe('useK8sApi composition discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.get.mockResolvedValue({ data: { items: [] } })
  })

  it('queries DaemonSets when restoring a composition', async () => {
    const { useK8sApi } = await import('../useK8sApi.js')
    const { getCompositionResources } = useK8sApi()

    await getCompositionResources('composition-test', 'default')

    const requestedPaths = mockClient.get.mock.calls.map(([path]) => path)
    expect(requestedPaths).toContain('/apis/apps/v1/namespaces/default/daemonsets')
  })
})
