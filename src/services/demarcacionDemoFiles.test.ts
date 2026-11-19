import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_FILES_FILENAMES, demarcacionDemoFilename } from './demoFilesCatalog'
import { isDemoFileAvailable } from './demoFilesService'

afterEach(() => vi.unstubAllGlobals())

describe('files by demarcation', () => {
  it('permits exact seeded demarcation filenames alongside legacy examples', () => {
    const example = demarcacionDemoFilename('DTTO 18', 'example')
    const template = demarcacionDemoFilename('AYTO CALVILLO', 'clean')

    expect(example).toBe('EJEMPLO LLENADO - DTTO 18.xlsx')
    expect(template).toBe('AYTO CALVILLO.xlsx')
    expect(DEMO_FILES_FILENAMES).toEqual(
      expect.arrayContaining([example, template, 'EJEMPLO LLENADO - DIP MR.xlsx'])
    )
    expect(DEMO_FILES_FILENAMES).not.toContain('secret.xlsx')
  })

  it.each([
    [200, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true],
    [404, 'application/json', false],
    [200, 'text/html; charset=utf-8', false],
  ])('checks availability with HEAD for %s and %s', async (status, contentType, available) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status, headers: { 'Content-Type': contentType } })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { signal } = new AbortController()

    await expect(isDemoFileAvailable('GUBERNATURA.xlsx', signal)).resolves.toBe(available)
    expect(fetchMock).toHaveBeenCalledWith('/demo-files/GUBERNATURA.xlsx', {
      method: 'HEAD',
      cache: 'no-store',
      signal,
    })
  })
})
