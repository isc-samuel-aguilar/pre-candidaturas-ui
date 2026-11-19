import { afterEach, describe, expect, it, vi } from 'vitest'
import { openFileInNewTab, openOrDownloadFile } from './openOrDownloadFile'

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

describe('openFileInNewTab', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens a tab for an image and replaces its location with the viewer page URL', async () => {
    vi.useFakeTimers()
    const tab = {
      opener: window,
      closed: false,
      location: { replace: vi.fn() },
      close: vi.fn(),
    }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:jpg')
      .mockReturnValueOnce('blob:page')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    await openFileInNewTab('foto.jpg', async () => new Blob(['img'], { type: 'image/jpeg' }))

    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(tab.opener).toBeNull()
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(tab.location.replace).toHaveBeenCalledWith('blob:page')
    expect(revokeObjectURL).not.toHaveBeenCalled()
    tab.closed = true
    vi.advanceTimersByTime(1000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:jpg')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:page')
  })

  it('closes the tab when the request fails', async () => {
    const close = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({
      close,
      opener: window,
      location: { replace: vi.fn() },
    } as unknown as Window)

    await expect(
      openFileInNewTab('acuse.pdf', async () => {
        throw new Error('Error de red')
      })
    ).rejects.toThrow('Error de red')
    expect(close).toHaveBeenCalledOnce()
  })

  it('throws the popup-blocked error when window.open returns null', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    await expect(
      openFileInNewTab('acuse.pdf', async () => new Blob(['%PDF'], { type: 'application/pdf' }))
    ).rejects.toThrow('Permite las ventanas emergentes')
  })

  it('corrects an octet-stream jpg to image/jpeg and renders a titled viewer page', async () => {
    const tab = {
      opener: window,
      closed: false,
      location: { replace: vi.fn() },
      close: vi.fn(),
    }
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:file')
      .mockReturnValueOnce('blob:page')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    await openFileInNewTab('foto.jpg', async () => new Blob(['img'], {
      type: 'application/octet-stream',
    }))

    const fileBlob = createObjectURL.mock.calls[0]?.[0] as Blob
    expect(fileBlob.type).toBe('image/jpeg')
    const pageBlob = createObjectURL.mock.calls[1]?.[0] as Blob
    expect(pageBlob.type).toBe('text/html')
    const html = await readBlobText(pageBlob)
    expect(html).toContain('<title>foto.jpg</title>')
    expect(html).toContain('image/jpeg')
    expect(html).toContain('<img')
    expect(tab.location.replace).toHaveBeenCalledWith('blob:page')
  })

  it('corrects an octet-stream pdf to application/pdf and renders an embed viewer page', async () => {
    const tab = {
      opener: window,
      closed: false,
      location: { replace: vi.fn() },
      close: vi.fn(),
    }
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:file')
      .mockReturnValueOnce('blob:page')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    await openFileInNewTab('acuse.pdf', async () => new Blob(['%PDF'], {
      type: 'application/octet-stream',
    }))

    const fileBlob = createObjectURL.mock.calls[0]?.[0] as Blob
    expect(fileBlob.type).toBe('application/pdf')
    const pageBlob = createObjectURL.mock.calls[1]?.[0] as Blob
    const html = await readBlobText(pageBlob)
    expect(html).toContain('<title>acuse.pdf</title>')
    expect(html).toContain('application/pdf')
    expect(html).toContain('<embed')
    expect(tab.location.replace).toHaveBeenCalledWith('blob:page')
  })

  it('navigates directly to the original blob for office binaries instead of rendering HTML', async () => {
    const tab = {
      opener: window,
      closed: false,
      location: { replace: vi.fn() },
      close: vi.fn(),
    }
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const createObjectURL = vi.fn(() => 'blob:docx')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const original = new Blob(['docx'], { type: 'application/octet-stream' })
    await openFileInNewTab('informe.docx', async () => original)

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(createObjectURL).toHaveBeenCalledWith(original)
    expect(tab.location.replace).toHaveBeenCalledWith('blob:docx')
  })

  it('does nothing when the tab is already closed after the load resolves', async () => {
    const close = vi.fn()
    const tab = {
      opener: window,
      closed: true,
      location: { replace: vi.fn() },
      close,
    }
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const createObjectURL = vi.fn(() => 'blob:any')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    await openFileInNewTab('foto.jpg', async () => new Blob(['img'], { type: 'image/jpeg' }))

    expect(tab.location.replace).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })
})

async function readBlobText(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el blob'))
      reader.readAsText(blob)
    })
  }
  if (typeof blob.text === 'function') return blob.text()
  return new Response(blob).text()
}
