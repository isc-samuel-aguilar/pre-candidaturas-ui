import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_FILES_CATALOG, demoFileHref, getDemoFileEntry } from './demoFilesCatalog'
import {
  DEMO_FILE_ERROR_MESSAGES,
  downloadDemoFile,
  isDemoFileError,
  validateSession,
} from './demoFilesService'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('./authService', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

const fetchMock = vi.fn()

function mockFetchResponse(init: { ok?: boolean; status?: number; body?: string }) {
  fetchMock.mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    blob: async () => new Blob([init.body ?? 'xlsx']),
  })
}

describe('demo files catalog', () => {
  it('keeps the six exact pairs in the expected order', () => {
    expect(DEMO_FILES_CATALOG.map((entry) => entry.id)).toEqual([
      'ayto-aguascalientes',
      'aytos-mas-de-30-hab',
      'aytos-menos-de-30-hab',
      'diputado-mr',
      'diputado-rp',
      'gubernatura',
    ])

    expect(
      DEMO_FILES_CATALOG.map((entry) => [entry.exampleFilename, entry.cleanFilename])
    ).toEqual([
      ['EJEMPLO LLENADO - AYTO AGUASCALIENTES.xlsx', 'AYTO AGUASCALIENTES.xlsx'],
      ['EJEMPLO LLENADO - AYTOS MAS DE 30 HAB.xlsx', 'AYTOS MAS DE 30 HAB.xlsx'],
      ['EJEMPLO LLENADO - AYTOS MENOS DE 30 HAB.xlsx', 'AYTOS MENOS DE 30 HAB.xlsx'],
      ['EJEMPLO LLENADO - DIP MR.xlsx', 'DIPUTADO MR.xlsx'],
      ['EJEMPLO LLENADO - DIPUTADO RP.xlsx', 'DIPUTADO RP.xlsx'],
      ['EJEMPLO LLENADO - GUBERNATURA.xlsx', 'GUBERNATURA.xlsx'],
    ])
  })

  it('resolves entries by id and builds encoded download hrefs', () => {
    expect(getDemoFileEntry('diputado-mr')?.cleanFilename).toBe('DIPUTADO MR.xlsx')
    expect(getDemoFileEntry('unknown-id')).toBeUndefined()
    expect(demoFileHref('DIPUTADO MR.xlsx')).toBe('/demo-files/DIPUTADO%20MR.xlsx')
  })
})

describe('demoFilesService', () => {
  let anchorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchResponse({})
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:demo-files'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
    anchorSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
  })

  it('rejects a missing token without calling the auth service', async () => {
    await expect(downloadDemoFile(null, 'gubernatura', 'clean')).rejects.toMatchObject({
      type: 'session',
      message: DEMO_FILE_ERROR_MESSAGES.session,
    })
    expect(mocks.getCurrentUser).not.toHaveBeenCalled()
  })

  it('rejects an invalid session when the auth service fails', async () => {
    mocks.getCurrentUser.mockRejectedValue(new Error('401'))

    await expect(downloadDemoFile('token123', 'gubernatura', 'clean')).rejects.toMatchObject({
      type: 'session',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('downloads the exact clean filename after validating the session', async () => {
    mocks.getCurrentUser.mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN' })

    await downloadDemoFile('token123', 'ayto-aguascalientes', 'clean')

    expect(mocks.getCurrentUser).toHaveBeenCalledWith('token123')
    expect(fetchMock).toHaveBeenCalledWith('/demo-files/AYTO%20AGUASCALIENTES.xlsx')
    expect(anchorSpy).toHaveBeenCalledTimes(1)
  })

  it('downloads the example filename with spaces preserved in the href', async () => {
    mocks.getCurrentUser.mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN' })

    await downloadDemoFile('token123', 'diputado-mr', 'example')

    expect(fetchMock).toHaveBeenCalledWith('/demo-files/EJEMPLO%20LLENADO%20-%20DIP%20MR.xlsx')
  })

  it('surfaces a missing file when the server responds 404', async () => {
    mocks.getCurrentUser.mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN' })
    mockFetchResponse({ ok: false, status: 404 })

    await expect(downloadDemoFile('token123', 'gubernatura', 'clean')).rejects.toMatchObject({
      type: 'missing',
      message: DEMO_FILE_ERROR_MESSAGES.missing,
    })
    expect(anchorSpy).not.toHaveBeenCalled()
  })

  it('surfaces a service error when the download request fails', async () => {
    mocks.getCurrentUser.mockResolvedValue({ userId: 1, username: 'admin', role: 'ADMIN' })
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(downloadDemoFile('token123', 'gubernatura', 'clean')).rejects.toMatchObject({
      type: 'service',
    })
  })

  it('rejects ids outside the catalog', async () => {
    await expect(downloadDemoFile('token123', 'other-id', 'clean')).rejects.toMatchObject({
      type: 'service',
    })
    expect(mocks.getCurrentUser).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exposes a type guard for demo file errors', async () => {
    await expect(validateSession(null)).rejects.toSatisfy(isDemoFileError)
  })
})
