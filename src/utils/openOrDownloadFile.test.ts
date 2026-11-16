import { afterEach, describe, expect, it, vi } from 'vitest'
import { openOrDownloadFile } from './openOrDownloadFile'

describe('openOrDownloadFile', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reserves the tab before requesting the PDF and revokes the URL when it closes', async () => {
    vi.useFakeTimers()
    const tab = { opener: window, closed: false, location: { replace: vi.fn() } }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const createObjectURL = vi.fn(() => 'blob:pdf')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    await openOrDownloadFile('CV.PDF', async () => {
      expect(open).toHaveBeenCalledWith('', '_blank')
      expect(tab.opener).toBeNull()
      return new Blob(['%PDF'], { type: 'application/octet-stream' })
    })

    expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/pdf' }))
    expect(tab.location.replace).toHaveBeenCalledWith('blob:pdf')
    expect(revokeObjectURL).not.toHaveBeenCalled()
    tab.closed = true
    vi.advanceTimersByTime(1000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:pdf')
  })

  it('closes the reserved tab when the PDF request fails', async () => {
    const close = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ close } as unknown as Window)

    await expect(openOrDownloadFile('acuse.pdf', async () => {
      throw new Error('Error 404')
    })).rejects.toThrow('Error 404')
    expect(close).toHaveBeenCalledOnce()
  })

  it('downloads an Excel example with its original filename', async () => {
    const open = vi.spyOn(window, 'open')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      expect(this.download).toBe('Ejemplo.xlsx')
    })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:excel', revokeObjectURL: vi.fn() })

    await openOrDownloadFile('Ejemplo.xlsx', async () => new Blob(['spreadsheet']))

    expect(click).toHaveBeenCalledOnce()
    expect(open).not.toHaveBeenCalled()
  })
})
