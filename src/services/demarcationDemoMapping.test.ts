import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_FILES_CATALOG, DEMO_FILES_FILENAMES, getDemarcationDemoFile, getDemoFilename } from './demoFilesCatalog'
import { downloadDemoFileByName } from './demoFilesService'

vi.mock('./authService', () => ({ getCurrentUser: vi.fn().mockResolvedValue({ userId: 1 }) }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const assignments: Array<[string, string]> = [
  ['AYTO AGUASCALIENTES', 'ayto-aguascalientes'],
  ['GUBERNATURA', 'gubernatura'],
  ['DIPUTADO RP', 'diputado-rp'],
  ...Array.from({ length: 18 }, (_, index): [string, string] => [`DTTO ${index + 1}`, 'diputado-mr']),
  ...['AYTO ASIENTOS', 'AYTO COSIO', 'AYTO EL LLANO', 'AYTO SAN JOSE DE GRACIA', 'AYTO TEPEZALA']
    .map((name): [string, string] => [name, 'aytos-menos-de-30-hab']),
  ...['AYTO CALVILLO', 'AYTO JESUS MARIA', 'AYTO PABELLON DE ARTEAGA', 'AYTO RINCON DE ROMOS', 'AYTO SAN FRANCISCO DE LOS ROMO']
    .map((name): [string, string] => [name, 'aytos-mas-de-30-hab']),
]

describe('demarcation demo mapping', () => {
  it.each(assignments)('maps both files for %s to the example section entry %s', (name, entryId) => {
    const entry = DEMO_FILES_CATALOG.find((candidate) => candidate.id === entryId)!
    for (const type of ['example', 'clean'] as const) {
      const file = getDemarcationDemoFile(name, type)
      expect(file?.filename).toBe(getDemoFilename(entry, type))
      expect(DEMO_FILES_FILENAMES).toContain(file?.filename)
      const isShared = entryId.startsWith('aytos-') || entryId === 'diputado-mr'
      const expectedName = type === 'example' ? `EJEMPLO LLENADO - ${name}.xlsx` : `${name}.xlsx`
      expect(file?.downloadFilename).toBe(isShared ? expectedName : getDemoFilename(entry, type))
    }
  })

  it('accepts accents, case and spacing in demarcation names', () => {
    expect(getDemarcationDemoFile('  ayto   Jesús María  ', 'clean')?.filename)
      .toBe('AYTOS MAS DE 30 HAB.xlsx')
    expect(getDemarcationDemoFile('DTTO 99', 'clean')?.filename).toBe('DIPUTADO MR.xlsx')
  })

  it('leaves unmapped demarcations unavailable', () => {
    expect(getDemarcationDemoFile('OTRA DEMARCACION', 'clean')).toBeUndefined()
    expect(getDemarcationDemoFile('', 'example')).toBeUndefined()
  })

  it('fetches the shared file and saves its content under the demarcation name', async () => {
    const blob = new Blob(['shared workbook'])
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:workbook'), revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('DTTO 1.xlsx')
    })

    await downloadDemoFileByName('token', 'DIPUTADO MR.xlsx', 'DTTO 1.xlsx')

    expect(fetchMock).toHaveBeenCalledWith('/demo-files/DIPUTADO%20MR.xlsx')
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledOnce()
  })

  it('reports a missing shared file without starting a download', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')

    await expect(downloadDemoFileByName('token', 'DIPUTADO MR.xlsx', 'DTTO 1.xlsx'))
      .rejects.toMatchObject({ type: 'missing' })
    expect(click).not.toHaveBeenCalled()
  })
})
