import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  compressImage,
  isExecutableFile,
  isOfficeFile,
  validateFile,
} from './fileUtils'

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  // jsdom no permite sobrescribir size; definimos la propiedad directamente
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const MB = 1024 * 1024

describe('isOfficeFile', () => {
  it('detects office files by MIME type', () => {
    expect(
      isOfficeFile(makeFile('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 10))
    ).toBe(true)
    expect(isOfficeFile(makeFile('a.xls', 'application/vnd.ms-excel', 10))).toBe(true)
    expect(isOfficeFile(makeFile('a.pptx', 'application/vnd.ms-powerpoint', 10))).toBe(true)
  })

  it('detects office files by extension when MIME is empty', () => {
    expect(isOfficeFile(makeFile('reporte.doc', '', 10))).toBe(true)
    expect(isOfficeFile(makeFile('datos.xlsx', '', 10))).toBe(true)
  })

  it('rejects images and pdfs', () => {
    expect(isOfficeFile(makeFile('foto.jpg', 'image/jpeg', 10))).toBe(false)
    expect(isOfficeFile(makeFile('doc.pdf', 'application/pdf', 10))).toBe(false)
  })
})

describe('isExecutableFile', () => {
  it('detects executables by extension', () => {
    expect(isExecutableFile(makeFile('setup.exe', '', 10))).toBe(true)
    expect(isExecutableFile(makeFile('instalar.msi', '', 10))).toBe(true)
    expect(isExecutableFile(makeFile('script.bat', '', 10))).toBe(true)
    expect(isExecutableFile(makeFile('arranque.sh', '', 10))).toBe(true)
    expect(isExecutableFile(makeFile('app.jar', '', 10))).toBe(true)
    expect(isExecutableFile(makeFile('virus.apk', '', 10))).toBe(true)
  })

  it('detects executables by MIME type', () => {
    expect(
      isExecutableFile(makeFile('setup.exe', 'application/x-msdownload', 10))
    ).toBe(true)
    expect(isExecutableFile(makeFile('lib.so', 'application/x-sharedlib', 10))).toBe(true)
  })

  it('rejects allowed document types', () => {
    expect(isExecutableFile(makeFile('doc.pdf', 'application/pdf', 10))).toBe(false)
    expect(isExecutableFile(makeFile('foto.png', 'image/png', 10))).toBe(false)
    expect(isExecutableFile(makeFile('reporte.docx', '', 10))).toBe(false)
  })
})

describe('validateFile - executables', () => {
  it('rejects an .exe with a clear message', () => {
    const result = validateFile(makeFile('setup.exe', 'application/x-msdownload', 1024))
    expect(result.valid).toBe(false)
    expect(result.error).toBe('No se permiten archivos ejecutables')
  })

  it('rejects executables even when allowOffice is true', () => {
    const result = validateFile(makeFile('malicioso.bat', '', 1024), {
      allowOffice: true,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('No se permiten archivos ejecutables')
  })

  it('rejects scripts and libraries by extension', () => {
    expect(validateFile(makeFile('instalar.sh', '', 10)).error).toBe(
      'No se permiten archivos ejecutables'
    )
    expect(validateFile(makeFile('lib.dll', '', 10)).error).toBe(
      'No se permiten archivos ejecutables'
    )
  })
})

describe('validateFile - office (allowOffice)', () => {
  it('accepts a .docx up to 10 MB when allowOffice is true', () => {
    const result = validateFile(
      makeFile(
        'proyecto.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        10 * MB
      ),
      { allowOffice: true }
    )
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects an office file bigger than 10 MB when allowOffice is true', () => {
    const result = validateFile(
      makeFile(
        'proyecto.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        11 * MB
      ),
      { allowOffice: true }
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('10 MB')
  })

  it('keeps rejecting office files when allowOffice is not set', () => {
    const result = validateFile(
      makeFile('proyecto.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1024),
      {}
    )
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Solo se permiten imágenes (JPG, PNG, GIF, WEBP) o PDF')
  })

  it('keeps the 10 MB limit for PDFs even with allowOffice', () => {
    const result = validateFile(makeFile('doc.pdf', 'application/pdf', 11 * MB), {
      allowOffice: true,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('10 MB')
  })

  it('accepts images with allowOffice (unchanged rules)', () => {
    const result = validateFile(makeFile('foto.png', 'image/png', 1024), {
      allowOffice: true,
    })
    expect(result.valid).toBe(true)
  })
})

describe('validateFile - 10 MB unified limit', () => {
  it('accepts a PDF of exactly 10 MB', () => {
    const result = validateFile(makeFile('doc.pdf', 'application/pdf', 10 * MB))
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects a PDF bigger than 10 MB', () => {
    const result = validateFile(makeFile('doc.pdf', 'application/pdf', 10 * MB + 1))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('El PDF pesa')
    expect(result.error).toContain('10 MB')
  })

  it('rejects an image bigger than 10 MB', () => {
    const result = validateFile(makeFile('foto.png', 'image/png', 11 * MB))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('La imagen pesa')
    expect(result.error).toContain('10 MB')
  })

  it('accepts images up to 10 MB', () => {
    expect(validateFile(makeFile('foto.jpg', 'image/jpeg', 10 * MB)).valid).toBe(true)
    expect(validateFile(makeFile('foto.webp', 'image/webp', 10 * MB)).valid).toBe(true)
  })

  it('still rejects unknown types', () => {
    const result = validateFile(makeFile('notas.txt', 'text/plain', 10))
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Solo se permiten imágenes (JPG, PNG, GIF, WEBP) o PDF')
  })
})

describe('compressImage', () => {
  let toBlobMock: ReturnType<typeof vi.fn>
  let ctx: {
    fillStyle: string
    fillRect: ReturnType<typeof vi.fn>
    drawImage: ReturnType<typeof vi.fn>
  }

  class MockImage {
    naturalWidth = 400
    naturalHeight = 300
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    private _src = ''
    set src(value: string) {
      this._src = value
      queueMicrotask(() => this.onload?.())
    }
    get src() {
      return this._src
    }
  }

  beforeEach(() => {
    ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    )
    toBlobMock = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlobMock)
    // jsdom no implementa URL.createObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    vi.stubGlobal('Image', MockImage)
  })

  afterEach(() => {
    delete (URL as unknown as Record<string, unknown>).createObjectURL
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('converts any image to JPG even when it is under the target size', async () => {
    toBlobMock.mockImplementation((cb: (blob: Blob) => void) =>
      cb(new Blob([new Uint8Array(1000)], { type: 'image/jpeg' }))
    )

    const file = new File([new Uint8Array(1000)], 'foto.png', { type: 'image/png' })
    const result = await compressImage(file)

    expect(result.type).toBe('image/jpeg')
    expect(result.name).toBe('foto.jpg')
    expect(toBlobMock).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8)
  })

  it('paints a white background before drawing (JPEG has no alpha)', async () => {
    toBlobMock.mockImplementation((cb: (blob: Blob) => void) =>
      cb(new Blob([new Uint8Array(1000)], { type: 'image/jpeg' }))
    )

    await compressImage(new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' }))

    expect(ctx.fillStyle).toBe('#FFFFFF')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 300)
    expect(ctx.drawImage).toHaveBeenCalled()
  })

  it('reduces quality until the result fits the target size', async () => {
    toBlobMock.mockImplementation(
      (cb: (blob: Blob) => void, _type: string, quality: number) => {
        const size = quality === 0.8 ? 2 * MB : 500 * 1024
        cb(new Blob([new Uint8Array(size)], { type: 'image/jpeg' }))
      }
    )

    const result = await compressImage(new File([new Uint8Array(10)], 'foto.jpg', { type: 'image/jpeg' }))

    expect(toBlobMock).toHaveBeenCalledTimes(2)
    expect(toBlobMock.mock.calls[0]?.[2]).toBe(0.8)
    expect(toBlobMock.mock.calls[1]?.[2]).toBe(0.6)
    expect(result.size).toBeLessThanOrEqual(1024 * 1024)
    expect(result.type).toBe('image/jpeg')
  })

  it('scales down as a last resort when quality alone is not enough', async () => {
    toBlobMock.mockImplementation((cb: (blob: Blob) => void) =>
      cb(new Blob([new Uint8Array(3 * MB)], { type: 'image/jpeg' }))
    )

    await compressImage(new File([new Uint8Array(10)], 'grande.png', { type: 'image/png' }))

    // 4 calidades (0.8, 0.6, 0.4, 0.3) + 1 intento a la mitad de resolucion
    expect(toBlobMock).toHaveBeenCalledTimes(5)
  })

  it('propagates the error when the image cannot be decoded', async () => {
    class BrokenImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', BrokenImage)

    await expect(
      compressImage(new File([new Uint8Array(10)], 'rota.png', { type: 'image/png' }))
    ).rejects.toThrow('No se pudo cargar la imagen')
  })
})
