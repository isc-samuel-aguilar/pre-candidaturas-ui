import { describe, expect, it, vi } from 'vitest'
import { getRepresentations } from './folioService'
import type { KeyValueCatalog } from '../types/demarcacion'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./apiClient', () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    delete: mocks.delete,
  },
  authClient: {},
  ApiClient: class {},
}))

const representations: KeyValueCatalog[] = [
  {
    id: 1,
    key: 'REPRESENTACION',
    value: 'PROPIETARIA',
    type: 'REPRESENTACION',
    description: 'Propietaria',
    createdDate: '2026-01-01T00:00:00',
  },
  {
    id: 2,
    key: 'REPRESENTACION',
    value: 'SUPLENTE',
    type: 'REPRESENTACION',
    description: 'Suplente',
    createdDate: '2026-01-01T00:00:00',
  },
]

describe('getRepresentations', () => {
  it('calls the key-value-catalogs endpoint with REPRESENTACION', async () => {
    mocks.get.mockResolvedValue({ data: representations, status: 200, ok: true })

    const result = await getRepresentations()

    expect(mocks.get).toHaveBeenCalledWith('/key-value-catalogs/key/REPRESENTACION')
    expect(result).toEqual(representations)
  })

  it('maps API errors to FolioError', async () => {
    mocks.get.mockRejectedValue({ message: 'Error del servidor', status: 500 })

    await expect(getRepresentations()).rejects.toEqual({
      message: 'Error del servidor',
      status: 500,
      error: undefined,
    })
  })
})