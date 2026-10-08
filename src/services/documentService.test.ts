import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDocumentTypes,
  getGeneratedDocumentTypes,
  getDemarcationDocumentTypes,
  getDocumentsByPrecandidato,
  uploadDocument,
  deleteDocument,
  downloadDocumentFile,
  generateDocumentForSign,
  toDocumentoKey,
  updateDocumentStatus,
} from './documentService'
import type { Documento, KeyValueCatalog } from '../types/demarcacion'
import { StatusEnum } from '../types/enums'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./apiClient', () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    patch: mocks.patch,
    delete: mocks.delete,
  },
  authClient: {},
  ApiClient: class {},
}))

const documentTypes: KeyValueCatalog[] = [
  {
    id: 1,
    key: 'DOCUMENT_TYPE',
    value: 'INE',
    type: 'DOCUMENT_TYPE',
    description: 'Credencial INE',
    createdDate: '2026-01-01T00:00:00',
  },
]

// C4 (variación task-api-06): "FORMATO DE DECLARACION APP" SIN tilde
const generatedDocumentTypes: KeyValueCatalog[] = [
  {
    id: 10,
    key: 'GENERATED_DOCUMENT',
    value: 'CV PUBLICO APP.pdf',
    type: 'GENERATED_DOCUMENT',
    description: 'CV PUBLICO APP',
    createdDate: '2026-01-01T00:00:00',
  },
  {
    id: 11,
    key: 'GENERATED_DOCUMENT',
    value: 'CV PRIVADO APP.pdf',
    type: 'GENERATED_DOCUMENT',
    description: 'CV PRIVADO APP',
    createdDate: '2026-01-01T00:00:00',
  },
  {
    id: 12,
    key: 'GENERATED_DOCUMENT',
    value: 'FORMATO DE DECLARACION APP.pdf',
    type: 'GENERATED_DOCUMENT',
    description: 'FORMATO DE DECLARACION APP',
    createdDate: '2026-01-01T00:00:00',
  },
]

// C11 (task-ui-19): documentos que pertenecen a la demarcación (FUR)
const demarcationDocumentTypes: KeyValueCatalog[] = [
  {
    id: 20,
    key: 'DOCUMENT_TYPE_DEMARCATION',
    value: 'FORMATO UNICO DE REGISTRO (FUR) APP.pdf',
    type: 'String',
    description: 'FORMATO UNICO DE REGISTRO (FUR) APP',
    createdDate: '2026-01-01T00:00:00',
  },
]

const sampleDocument: Documento = {
  id: 10,
  keyValueCatalogId: 1,
  keyValueCatalogKey: 'DOCUMENT_TYPE',
  keyValueCatalogValue: 'INE',
  keyValueCatalogDescription: 'Credencial INE',
  status: StatusEnum.POR_VALIDAR,
  bucketName: 'bucket',
  objectKey: 'key',
  originalFilename: null,
  preCandidatoId: 5,
  createdDate: '2026-01-01T00:00:00',
}

describe('getDocumentTypes', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.get.mockReset()
  })

  it('calls the key-value-catalogs endpoint with DOCUMENT_TYPE', async () => {
    mocks.get.mockResolvedValue({ data: documentTypes, status: 200, ok: true })

    const result = await getDocumentTypes()

    expect(mocks.get).toHaveBeenCalledWith('/key-value-catalogs/key/DOCUMENT_TYPE')
    expect(result).toEqual(documentTypes)
  })

  it('returns cached values through localStorage without calling the API', async () => {
    localStorage.setItem('document_type_cache', JSON.stringify(documentTypes))
    localStorage.setItem('document_type_cache_time', Date.now().toString())

    const result = await getDocumentTypes()

    expect(result).toEqual(documentTypes)
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('maps API errors to DocumentError', async () => {
    mocks.get.mockRejectedValue({ message: 'Error del servidor', status: 500 })

    await expect(getDocumentTypes()).rejects.toEqual({
      message: 'Error del servidor',
      status: 500,
      error: undefined,
    })
  })
})

describe('getGeneratedDocumentTypes', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.get.mockReset()
  })

  it('calls the key-value-catalogs endpoint with GENERATED_DOCUMENT', async () => {
    mocks.get.mockResolvedValue({ data: generatedDocumentTypes, status: 200, ok: true })

    const result = await getGeneratedDocumentTypes()

    expect(mocks.get).toHaveBeenCalledWith('/key-value-catalogs/key/GENERATED_DOCUMENT')
    expect(result).toEqual(generatedDocumentTypes)
  })

  it('does not reuse the DOCUMENT_TYPE cache (its own cache key)', async () => {
    localStorage.setItem('document_type_cache', JSON.stringify(documentTypes))
    localStorage.setItem('document_type_cache_time', Date.now().toString())
    mocks.get.mockResolvedValue({ data: generatedDocumentTypes, status: 200, ok: true })

    const result = await getGeneratedDocumentTypes()

    expect(mocks.get).toHaveBeenCalledWith('/key-value-catalogs/key/GENERATED_DOCUMENT')
    expect(result).toEqual(generatedDocumentTypes)
  })

  it('returns its own cached values through localStorage without calling the API', async () => {
    localStorage.setItem(
      'generated_document_type_cache',
      JSON.stringify(generatedDocumentTypes)
    )
    localStorage.setItem('generated_document_type_cache_time', Date.now().toString())

    const result = await getGeneratedDocumentTypes()

    expect(result).toEqual(generatedDocumentTypes)
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('maps API errors to DocumentError', async () => {
    mocks.get.mockRejectedValue({ message: 'Error del servidor', status: 500 })

    await expect(getGeneratedDocumentTypes()).rejects.toEqual({
      message: 'Error del servidor',
      status: 500,
      error: undefined,
    })
  })
})

describe('getDemarcationDocumentTypes', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.get.mockReset()
  })

  it('calls the key-value-catalogs endpoint with DOCUMENT_TYPE_DEMARCATION', async () => {
    mocks.get.mockResolvedValue({ data: demarcationDocumentTypes, status: 200, ok: true })

    const result = await getDemarcationDocumentTypes()

    expect(mocks.get).toHaveBeenCalledWith('/key-value-catalogs/key/DOCUMENT_TYPE_DEMARCATION')
    expect(result).toEqual(demarcationDocumentTypes)
  })

  it('does not reuse the other catalog caches (its own cache key)', async () => {
    localStorage.setItem('document_type_cache', JSON.stringify(documentTypes))
    localStorage.setItem('document_type_cache_time', Date.now().toString())
    localStorage.setItem(
      'generated_document_type_cache',
      JSON.stringify(generatedDocumentTypes)
    )
    localStorage.setItem('generated_document_type_cache_time', Date.now().toString())
    mocks.get.mockResolvedValue({ data: demarcationDocumentTypes, status: 200, ok: true })

    const result = await getDemarcationDocumentTypes()

    expect(mocks.get).toHaveBeenCalledWith('/key-value-catalogs/key/DOCUMENT_TYPE_DEMARCATION')
    expect(result).toEqual(demarcationDocumentTypes)
  })

  it('returns its own cached values through localStorage without calling the API', async () => {
    localStorage.setItem(
      'demarcation_document_type_cache',
      JSON.stringify(demarcationDocumentTypes)
    )
    localStorage.setItem('demarcation_document_type_cache_time', Date.now().toString())

    const result = await getDemarcationDocumentTypes()

    expect(result).toEqual(demarcationDocumentTypes)
    expect(mocks.get).not.toHaveBeenCalled()
  })
})

describe('getDocumentsByPrecandidato', () => {
  it('calls the documents endpoint for a pre-candidato', async () => {
    mocks.get.mockResolvedValue({ data: [sampleDocument], status: 200, ok: true })

    const result = await getDocumentsByPrecandidato(5)

    expect(mocks.get).toHaveBeenCalledWith('/documents/pre-candidato/5')
    expect(result).toEqual([sampleDocument])
  })

  it('maps API errors to DocumentError', async () => {
    mocks.get.mockRejectedValue({ message: 'No autorizado', status: 401 })

    await expect(getDocumentsByPrecandidato(5)).rejects.toEqual({
      message: 'No autorizado',
      status: 401,
      error: undefined,
    })
  })
})

describe('uploadDocument', () => {
  it('posts a FormData to the upload endpoint with the document type', async () => {
    const file = new File(['content'], 'ine.pdf', { type: 'application/pdf' })
    mocks.post.mockResolvedValue({ data: sampleDocument, status: 201, ok: true })

    const result = await uploadDocument(5, 'INE', file)

    expect(mocks.post).toHaveBeenCalledWith(
      '/documents/5/upload?documentType=INE',
      expect.any(FormData),
      { timeout: 30000 }
    )
    expect(result).toEqual(sampleDocument)
  })

  it('encodes special characters in the document type query param', async () => {
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    mocks.post.mockResolvedValue({ data: sampleDocument, status: 201, ok: true })

    await uploadDocument(5, 'FORMATO DECL PATRI', file)

    expect(mocks.post).toHaveBeenCalledWith(
      '/documents/5/upload?documentType=FORMATO%20DECL%20PATRI',
      expect.any(FormData),
      { timeout: 30000 }
    )
  })

  it('appends catalogKey to the upload URL when provided (C4.1)', async () => {
    const file = new File(['content'], 'cv.pdf', { type: 'application/pdf' })
    mocks.post.mockResolvedValue({ data: sampleDocument, status: 201, ok: true })

    await uploadDocument(5, 'CV PUBLICO APP.pdf', file, 'GENERATED_DOCUMENT')

    expect(mocks.post).toHaveBeenCalledWith(
      '/documents/5/upload?documentType=CV%20PUBLICO%20APP.pdf&catalogKey=GENERATED_DOCUMENT',
      expect.any(FormData),
      { timeout: 30000 }
    )
  })

  it('keeps the legacy upload URL when catalogKey is omitted (C4.1 regression)', async () => {
    const file = new File(['content'], 'ine.pdf', { type: 'application/pdf' })
    mocks.post.mockResolvedValue({ data: sampleDocument, status: 201, ok: true })

    await uploadDocument(5, 'INE', file)

    expect(mocks.post).toHaveBeenCalledWith(
      '/documents/5/upload?documentType=INE',
      expect.any(FormData),
      { timeout: 30000 }
    )
    const [url] = mocks.post.mock.calls[0] ?? []
    expect(String(url)).not.toContain('catalogKey')
  })
})

describe('deleteDocument', () => {
  it('calls the delete endpoint for the document id', async () => {
    mocks.delete.mockResolvedValue({ data: undefined, status: 204, ok: true })

    await deleteDocument(10)

    expect(mocks.delete).toHaveBeenCalledWith('/documents/10')
  })
})

describe('updateDocumentStatus', () => {
  beforeEach(() => {
    mocks.patch.mockReset()
  })

  it('patches the document status with the comment', async () => {
    const updated = { ...sampleDocument, status: StatusEnum.VALIDO, statusDescription: 'OK' }
    mocks.patch.mockResolvedValue({ data: updated, status: 200, ok: true })

    const result = await updateDocumentStatus(10, {
      status: StatusEnum.VALIDO,
      statusDescription: 'OK',
    })

    expect(mocks.patch).toHaveBeenCalledWith('/documents/10', {
      status: StatusEnum.VALIDO,
      statusDescription: 'OK',
    })
    expect(result).toEqual(updated)
  })

  it('omits statusDescription from the body when not provided (partial PATCH)', async () => {
    const updated = { ...sampleDocument, status: StatusEnum.ERROR }
    mocks.patch.mockResolvedValue({ data: updated, status: 200, ok: true })

    await updateDocumentStatus(10, { status: StatusEnum.ERROR })

    expect(mocks.patch).toHaveBeenCalledWith('/documents/10', {
      status: StatusEnum.ERROR,
    })
  })

  it('sends an empty string to clear a previously stored comment', async () => {
    const updated = { ...sampleDocument, statusDescription: '' }
    mocks.patch.mockResolvedValue({ data: updated, status: 200, ok: true })

    await updateDocumentStatus(10, { status: StatusEnum.VALIDO, statusDescription: '' })

    expect(mocks.patch).toHaveBeenCalledWith('/documents/10', {
      status: StatusEnum.VALIDO,
      statusDescription: '',
    })
  })

  it('maps API errors to DocumentError (VALIDATOR forbidden while backend pending)', async () => {
    mocks.patch.mockRejectedValue({ message: 'Prohibido', status: 403 })

    await expect(
      updateDocumentStatus(10, { status: StatusEnum.VALIDO })
    ).rejects.toEqual({
      message: 'Prohibido',
      status: 403,
      error: undefined,
    })
  })
})

describe('downloadDocumentFile', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('downloads using the document download URL and bearer token', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        blob: async () => new Blob(),
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    ;(URL as { createObjectURL: (blob: Blob) => string }).createObjectURL = vi.fn(
      () => 'blob:mock'
    )
    ;(URL as { revokeObjectURL: (url: string) => void }).revokeObjectURL = vi.fn()

    const anchors: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = originalCreateElement(tagName)
      if (tagName === 'a') anchors.push(el as HTMLAnchorElement)
      return el
    })

    await downloadDocumentFile(sampleDocument, 'token123')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/documents\/10\/download$/),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token123' },
      })
    )
    expect(anchors[0]?.download).toBe('INE')
  })

  it('uses originalFilename as download name when present', async () => {
    const docWithName = { ...sampleDocument, originalFilename: 'nombre-archivo.pdf' }
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        blob: async () => new Blob(),
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    ;(URL as { createObjectURL: (blob: Blob) => string }).createObjectURL = vi.fn(
      () => 'blob:mock'
    )
    ;(URL as { revokeObjectURL: (url: string) => void }).revokeObjectURL = vi.fn()

    const anchors: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = originalCreateElement(tagName)
      if (tagName === 'a') anchors.push(el as HTMLAnchorElement)
      return el
    })

    await downloadDocumentFile(docWithName, 'token123')

    expect(anchors[0]?.download).toBe('nombre-archivo.pdf')
  })

  it('throws when the download response is not ok', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(downloadDocumentFile(sampleDocument, 'token123')).rejects.toThrow(
      'Error 404'
    )
  })
})

describe('toDocumentoKey', () => {
  it('strips the .pdf extension and replaces spaces with underscores', () => {
    expect(toDocumentoKey('CV PUBLICO APP.pdf')).toBe('CV_PUBLICO_APP')
  })

  it('is case-insensitive on the extension and leaves other values untouched', () => {
    expect(toDocumentoKey('CV PRIVADO App.PDF')).toBe('CV_PRIVADO_App')
    expect(toDocumentoKey('CV_PUBLICO_APP')).toBe('CV_PUBLICO_APP')
  })
})

describe('generateDocumentForSign', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubPdfFetch(disposition: string | null) {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (name: string) => (name === 'Content-Disposition' ? disposition : null),
      },
      blob: async () => new Blob(['%PDF'], { type: 'application/pdf' }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    ;(URL as { createObjectURL: (blob: Blob) => string }).createObjectURL = vi.fn(
      () => 'blob:mock'
    )
    ;(URL as { revokeObjectURL: (url: string) => void }).revokeObjectURL = vi.fn()

    const anchors: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = originalCreateElement(tagName)
      if (tagName === 'a') anchors.push(el as HTMLAnchorElement)
      return el
    })

    return { fetchMock, anchors }
  }

  it('calls the official endpoint by precandidato id with the normalized documento (C5)', async () => {
    const { fetchMock } = stubPdfFetch('attachment; filename="CV PUBLICO APP.pdf"')

    await generateDocumentForSign(7, 'CV_PUBLICO_APP', 'token123')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/documents\/pre-candidatos\/7\/generated\?documento=CV_PUBLICO_APP$/),
      expect.objectContaining({
        headers: { Authorization: `Bearer token123` },
      })
    )
  })

  it('url-encodes the documento and keeps the numeric id in the path', async () => {
    const { fetchMock } = stubPdfFetch(null)

    await generateDocumentForSign(42, 'CV PUBLICO APP', 'token123')

    const [url] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/documents/pre-candidatos/42/generated?')
    expect(String(url)).toContain('documento=CV%20PUBLICO%20APP')
    expect(String(url)).not.toContain('claveIne')
  })

  it('uses the filename from the Content-Disposition header', async () => {
    const { anchors } = stubPdfFetch('attachment; filename="salida.pdf"')

    await generateDocumentForSign(7, 'CV_PUBLICO_APP', 'token123')

    expect(anchors[0]?.download).toBe('salida.pdf')
  })

  it('falls back to <documento>.pdf when Content-Disposition is missing', async () => {
    const { anchors } = stubPdfFetch(null)

    await generateDocumentForSign(7, 'CV_PUBLICO_APP', 'token123')

    expect(anchors[0]?.download).toBe('CV_PUBLICO_APP.pdf')
  })

  it('maps PRECANDIDATO_NOT_FOUND to a spanish message', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: {
        get: (name: string) => (name === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ message: 'ignored', error: 'PRECANDIDATO_NOT_FOUND' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateDocumentForSign(999, 'CV_PUBLICO_APP', 'token123')).rejects.toEqual({
      message: 'Precandidato no encontrado',
      status: 400,
      error: 'PRECANDIDATO_NOT_FOUND',
    })
  })

  it('maps BusinessException codes to spanish messages (C5)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: {
        get: (name: string) => (name === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ message: 'ignored', error: 'TEMPLATE_NOT_FOUND' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateDocumentForSign(7, 'CV_PUBLICO_APP', 'token123')).rejects.toEqual({
      message: 'Plantilla no disponible para este documento',
      status: 400,
      error: 'TEMPLATE_NOT_FOUND',
    })
  })

  it('falls back to the API message for unknown error codes', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: (name: string) => (name === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ message: 'Acceso prohibido' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateDocumentForSign(7, 'CV_PUBLICO_APP', 'token123')).rejects.toEqual({
      message: 'Acceso prohibido',
      status: 403,
      error: undefined,
    })
  })
})