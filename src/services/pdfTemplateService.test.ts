import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deletePdfTemplate,
  getPdfTemplates,
  mapPdfTemplateError,
  reloadPdfTemplates,
  uploadPdfTemplate,
  type PdfTemplate,
} from './pdfTemplateService'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./apiClient', () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    delete: mocks.delete,
  },
  authClient: {},
  ApiClient: class {},
}))

const templates: PdfTemplate[] = [
  {
    documento: 'CV_PUBLICO_APP',
    plantilla: 'CV_PUBLICO_APP_template.pdf',
    tokens: 11,
    ultimaCarga: '2026-10-03T10:00:00',
    version: 1,
    activo: true,
    actualizadoPor: null,
    actualizadoFecha: null,
    campos: '{"NOMBRE_COMPLETO":{"fuente":"nombre"}}',
    salida: 'CV PUBLICO APP.pdf',
  },
]

afterEach(() => {
  vi.clearAllMocks()
})

describe('PdfTemplate DTO (C10)', () => {
  it('expone los 10 campos del contrato del GET', () => {
    expect(Object.keys(templates[0]!)).toEqual([
      'documento',
      'plantilla',
      'tokens',
      'ultimaCarga',
      'version',
      'activo',
      'actualizadoPor',
      'actualizadoFecha',
      'campos',
      'salida',
    ])
  })
})

describe('getPdfTemplates', () => {
  it('hace GET /pdf-templates y devuelve el listado', async () => {
    mocks.get.mockResolvedValue({ data: templates, status: 200, ok: true })

    const result = await getPdfTemplates()

    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(mocks.get).toHaveBeenCalledWith('/pdf-templates')
    expect(result).toEqual(templates)
  })

  it('lanza el error mapeado cuando el GET falla', async () => {
    mocks.get.mockRejectedValue({ message: 'Error 500', status: 500 })

    await expect(getPdfTemplates()).rejects.toEqual({
      message: 'Error 500',
      status: 500,
      error: undefined,
    })
  })
})

describe('reloadPdfTemplates', () => {
  it('hace POST /pdf-templates/reload', async () => {
    mocks.post.mockResolvedValue({ data: { templates: 1, tokens: 11 }, status: 200, ok: true })

    await reloadPdfTemplates()

    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(mocks.post).toHaveBeenCalledWith('/pdf-templates/reload')
  })

  it('mapea el 403 a mensaje de permisos', async () => {
    mocks.post.mockRejectedValue({ message: 'Forbidden', status: 403 })

    await expect(reloadPdfTemplates()).rejects.toEqual({
      message: 'No tienes permisos para realizar esta acción',
      status: 403,
      error: undefined,
    })
  })
})

describe('uploadPdfTemplate', () => {
  it('hace POST /pdf-templates/upload con FormData sólo con file y devuelve el listado', async () => {
    mocks.post.mockResolvedValue({ data: templates, status: 200, ok: true })
    const file = new File(['pdf-bytes'], 'CV_PUBLICO_APP_template.pdf', {
      type: 'application/pdf',
    })

    const result = await uploadPdfTemplate(file)

    expect(mocks.post).toHaveBeenCalledTimes(1)
    const [url, body, options] = mocks.post.mock.calls[0]!
    expect(url).toBe('/pdf-templates/upload')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    expect((body as FormData).get('mappings')).toBeNull()
    expect(options).toEqual({ timeout: 30000 })
    expect(result).toEqual(templates)
  })

  it('incluye mappings en el FormData cuando se envía', async () => {
    mocks.post.mockResolvedValue({ data: templates, status: 200, ok: true })
    const file = new File(['pdf-bytes'], 'CV_PUBLICO_APP_template.pdf', {
      type: 'application/pdf',
    })
    const mappings = '{"TOKEN":"campo"}'

    await uploadPdfTemplate(file, mappings)

    const body = mocks.post.mock.calls[0]![1] as FormData
    expect(body.get('mappings')).toBe(mappings)
  })

  it('mapea FILE_TOO_LARGE del backend al mensaje en español', async () => {
    mocks.post.mockRejectedValue({
      message: 'Error 400',
      status: 400,
      error: 'FILE_TOO_LARGE',
    })
    const file = new File(['pdf-bytes'], 'big.pdf', { type: 'application/pdf' })

    await expect(uploadPdfTemplate(file)).rejects.toEqual({
      message: 'El archivo supera el máximo de 5 MB',
      status: 400,
      error: 'FILE_TOO_LARGE',
    })
  })
})

describe('deletePdfTemplate', () => {
  it('hace DELETE /pdf-templates/{clave} y resuelve con 204 sin cuerpo', async () => {
    mocks.delete.mockResolvedValue({ data: undefined, status: 204, ok: true })

    await deletePdfTemplate('CV_PUBLICO_APP')

    expect(mocks.delete).toHaveBeenCalledTimes(1)
    expect(mocks.delete).toHaveBeenCalledWith('/pdf-templates/CV_PUBLICO_APP')
  })

  it('codifica la clave de la URL', async () => {
    mocks.delete.mockResolvedValue({ data: undefined, status: 204, ok: true })

    await deletePdfTemplate('CLAVE CON ESPACIOS')

    expect(mocks.delete).toHaveBeenCalledWith('/pdf-templates/CLAVE%20CON%20ESPACIOS')
  })

  it('mapea TEMPLATE_NOT_FOUND al mensaje en español', async () => {
    mocks.delete.mockRejectedValue({
      message: 'Error 400',
      status: 400,
      error: 'TEMPLATE_NOT_FOUND',
    })

    await expect(deletePdfTemplate('NO_EXISTE')).rejects.toEqual({
      message: 'Plantilla no encontrada',
      status: 400,
      error: 'TEMPLATE_NOT_FOUND',
    })
  })

  it('mapea 403 a mensaje de permisos', async () => {
    mocks.delete.mockRejectedValue({ message: 'Forbidden', status: 403 })

    await expect(deletePdfTemplate('CV_PUBLICO_APP')).rejects.toEqual({
      message: 'No tienes permisos para realizar esta acción',
      status: 403,
      error: undefined,
    })
  })
})

describe('mapPdfTemplateError', () => {
  it('mapea los 4 códigos 400 del contrato C6 y TEMPLATE_NOT_FOUND (C10)', () => {
    expect(
      mapPdfTemplateError({ message: 'Error 400', status: 400, error: 'FILE_REQUIRED' }).message
    ).toBe('Selecciona un archivo PDF')
    expect(
      mapPdfTemplateError({ message: 'Error 400', status: 400, error: 'TEMPLATE_INVALID' }).message
    ).toBe('Plantilla de documento inválida')
    expect(
      mapPdfTemplateError({ message: 'Error 400', status: 400, error: 'FILE_TOO_LARGE' }).message
    ).toBe('El archivo supera el máximo de 5 MB')
    expect(
      mapPdfTemplateError({ message: 'Error 400', status: 400, error: 'TEMPLATE_WRITE_FAILED' })
        .message
    ).toBe('No se pudo guardar la plantilla en el servidor')
    expect(
      mapPdfTemplateError({ message: 'Error 400', status: 400, error: 'TEMPLATE_NOT_FOUND' }).message
    ).toBe('Plantilla no encontrada')
  })

  it('mapea 403 a mensaje de permisos', () => {
    expect(mapPdfTemplateError({ message: 'Denied', status: 403 }).message).toBe(
      'No tienes permisos para realizar esta acción'
    )
  })

  it('usa el message del backend para códigos desconocidos', () => {
    expect(
      mapPdfTemplateError({ message: 'Algo salió mal', status: 400, error: 'OTRO_CODIGO' }).message
    ).toBe('Algo salió mal')
  })

  it('usa el fallback Error {status} si no hay message', () => {
    expect(mapPdfTemplateError({ message: '', status: 418 }).message).toBe('Error 418')
  })
})
