import { describe, expect, it } from 'vitest'
import { isOfficeFile, validateFile } from './fileUtils'

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

describe('validateFile - office (allowOffice)', () => {
  it('accepts a .docx up to 5 MB when allowOffice is true', () => {
    const result = validateFile(
      makeFile(
        'proyecto.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        5 * MB
      ),
      { allowOffice: true }
    )
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects an office file bigger than 5 MB when allowOffice is true', () => {
    const result = validateFile(
      makeFile(
        'proyecto.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        6 * MB
      ),
      { allowOffice: true }
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('5 MB')
  })

  it('keeps rejecting office files when allowOffice is not set', () => {
    const result = validateFile(
      makeFile(
        'proyecto.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        1024
      )
    )
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Solo se permiten imágenes (JPG, PNG, GIF, WEBP) o PDF')
  })

  it('keeps the PDF 2 MB limit even with allowOffice', () => {
    const result = validateFile(makeFile('doc.pdf', 'application/pdf', 3 * MB), {
      allowOffice: true,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('2 MB')
  })

  it('accepts images with allowOffice (unchanged rules)', () => {
    const result = validateFile(makeFile('foto.png', 'image/png', 1024), {
      allowOffice: true,
    })
    expect(result.valid).toBe(true)
  })
})
