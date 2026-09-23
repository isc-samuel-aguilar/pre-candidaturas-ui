import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDocumentTypes,
  getDocumentsByPrecandidato,
  uploadDocument,
  deleteDocument,
  downloadDocumentFile,
} from './documentService'
import type { Documento, KeyValueCatalog } from '../types/demarcacion'
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
})

describe('deleteDocument', () => {
  it('calls the delete endpoint for the document id', async () => {
    mocks.delete.mockResolvedValue({ data: undefined, status: 204, ok: true })

    await deleteDocument(10)

    expect(mocks.delete).toHaveBeenCalledWith('/documents/10')
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