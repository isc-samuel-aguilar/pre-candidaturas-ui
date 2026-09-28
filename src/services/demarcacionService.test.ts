import { describe, expect, it, vi } from 'vitest'
import { updateDemarcacionStatus } from './demarcacionService'
import type { FolioDemarcacion } from '../types/demarcacion'
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

const folioDemarcacionFixture: FolioDemarcacion = {
  id: 7,
  folioId: 1,
  folio: '001',
  demarcacionId: 3,
  ambito: 'MUNICIPAL',
  demarcacion: 'Acapulco',
  alias: null,
  status: StatusEnum.VALIDO,
  statusDescription: 'Revisado',
  createdDate: '2026-01-01T00:00:00',
}

describe('updateDemarcacionStatus', () => {
  it('calls PUT with status and statusDescription', async () => {
    mocks.put.mockResolvedValue({ data: folioDemarcacionFixture, status: 200, ok: true })

    const result = await updateDemarcacionStatus(1, 7, {
      status: StatusEnum.VALIDO,
      statusDescription: 'Revisado',
    })

    expect(mocks.put).toHaveBeenCalledWith('/folios/1/demarcaciones/7', {
      status: StatusEnum.VALIDO,
      statusDescription: 'Revisado',
    })
    expect(result).toEqual(folioDemarcacionFixture)
  })

  it('sends statusDescription as null when there is no comment', async () => {
    mocks.put.mockResolvedValue({ data: folioDemarcacionFixture, status: 200, ok: true })

    await updateDemarcacionStatus(1, 7, {
      status: StatusEnum.ERROR,
      statusDescription: null,
    })

    expect(mocks.put).toHaveBeenCalledWith('/folios/1/demarcaciones/7', {
      status: StatusEnum.ERROR,
      statusDescription: null,
    })
  })

  it('maps API errors to DemarcacionError', async () => {
    mocks.put.mockRejectedValue({ message: 'Prohibido', status: 403 })

    await expect(
      updateDemarcacionStatus(1, 7, { status: StatusEnum.VALIDO, statusDescription: null })
    ).rejects.toEqual({
      message: 'Prohibido',
      status: 403,
      error: undefined,
    })
  })
})
