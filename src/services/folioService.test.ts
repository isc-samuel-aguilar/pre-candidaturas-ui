import { describe, expect, it, vi } from 'vitest'
import { getRepresentations, getFoliosByUser } from './folioService'
import type { KeyValueCatalog } from '../types/demarcacion'
import type { Folio } from '../types/folio'
import { StatusEnum } from '../types/enums'

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

const folioFixture: Folio = {
  id: 1,
  folio: '001',
  email: 'maria.lopez@example.com',
  calle: 'Independencia',
  numero: '10',
  colonia: 'Centro',
  municipio: 'Acapulco',
  estado: 'Guerrero',
  codigoPostal: '40000',
  userId: 10,
  user: { username: 'maria.lopez' },
  status: StatusEnum.VALIDO,
  representations: [],
  createdBy: 'admin',
  updatedBy: null,
  createdDate: '2026-01-01T00:00:00',
  updatedDate: null,
}

describe('getFoliosByUser', () => {
  it('calls the by-user endpoint with the user name', async () => {
    mocks.get.mockResolvedValue({ data: folioFixture, status: 200, ok: true })

    const result = await getFoliosByUser('maria.lopez')

    expect(mocks.get).toHaveBeenCalledWith('/folios/by-user/maria.lopez')
    expect(result).toEqual(folioFixture)
  })

  it('encodes the user name in the path', async () => {
    mocks.get.mockResolvedValue({ data: folioFixture, status: 200, ok: true })

    await getFoliosByUser('user name')

    expect(mocks.get).toHaveBeenCalledWith('/folios/by-user/user%20name')
  })

  it('maps API errors to FolioError', async () => {
    mocks.get.mockRejectedValue({ message: 'Prohibido', status: 403 })

    await expect(getFoliosByUser('otro.usuario')).rejects.toEqual({
      message: 'Prohibido',
      status: 403,
      error: undefined,
    })
  })
})