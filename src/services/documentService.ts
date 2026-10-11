import { apiClient, type ApiError } from './apiClient'
import type { DemarcationDocument, Documento, KeyValueCatalog } from '../types/demarcacion'
import type { StatusEnum } from '../types/enums'

export interface DocumentError {
  message: string
  status: number
  error?: string
}

export interface UpdateDocumentStatusPayload {
  status: StatusEnum
  statusDescription?: string
}

function mapApiError(error: ApiError): DocumentError {
  return {
    message: error.message,
    status: error.status,
    error: error.error,
  }
}

export const GENERATED_DOCUMENT_KEY = 'GENERATED_DOCUMENT'
export const DEMARCATION_DOCUMENT_KEY = 'DOCUMENT_TYPE_DEMARCATION'

const DOCUMENT_TYPE_CACHE_KEY = 'document_type_cache'
const GENERATED_DOCUMENT_CACHE_KEY = 'generated_document_type_cache'
const DEMARCATION_DOCUMENT_CACHE_KEY = 'demarcation_document_type_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000

function getCache(cacheKey: string): KeyValueCatalog[] | null {
  try {
    const raw = localStorage.getItem(cacheKey)
    const rawTime = localStorage.getItem(`${cacheKey}_time`)
    if (raw && rawTime) {
      const age = Date.now() - Number(rawTime)
      if (age < CACHE_TTL) {
        return JSON.parse(raw)
      }
    }
  } catch {
    // ignore
  }
  return null
}

function setCache(cacheKey: string, data: KeyValueCatalog[]) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(`${cacheKey}_time`, Date.now().toString())
  } catch {
    // ignore
  }
}

async function fetchCatalogTypes(cacheKey: string, catalogKey: string): Promise<KeyValueCatalog[]> {
  const cached = getCache(cacheKey)
  if (cached) return cached

  try {
    const response = await apiClient.get<KeyValueCatalog[]>(`/key-value-catalogs/key/${catalogKey}`)
    setCache(cacheKey, response.data)
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getDocumentTypes(): Promise<KeyValueCatalog[]> {
  return fetchCatalogTypes(DOCUMENT_TYPE_CACHE_KEY, 'DOCUMENT_TYPE')
}

export async function getGeneratedDocumentTypes(): Promise<KeyValueCatalog[]> {
  return fetchCatalogTypes(GENERATED_DOCUMENT_CACHE_KEY, GENERATED_DOCUMENT_KEY)
}

export async function getDemarcationDocumentTypes(): Promise<KeyValueCatalog[]> {
  return fetchCatalogTypes(DEMARCATION_DOCUMENT_CACHE_KEY, DEMARCATION_DOCUMENT_KEY)
}

export async function getDocumentsByPrecandidato(
  preCandidatoId: number
): Promise<Documento[]> {
  try {
    const response = await apiClient.get<Documento[]>(
      `/documents/pre-candidato/${preCandidatoId}`
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function uploadDocument(
  preCandidatoId: number,
  documentType: string,
  file: File,
  catalogKey?: string
): Promise<Documento> {
  const formData = new FormData()
  formData.append('file', file)

  const catalogParam = catalogKey ? `&catalogKey=${encodeURIComponent(catalogKey)}` : ''

  try {
    const response = await apiClient.post<Documento>(
      `/documents/${preCandidatoId}/upload?documentType=${encodeURIComponent(documentType)}${catalogParam}`,
      formData,
      { timeout: 30000 }
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function deleteDocument(documentId: number): Promise<void> {
  try {
    await apiClient.delete(`/documents/${documentId}`)
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function updateDocumentStatus(
  documentId: number,
  payload: UpdateDocumentStatusPayload
): Promise<Documento> {
  try {
    const response = await apiClient.patch<Documento>(`/documents/${documentId}`, payload)
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function downloadDocumentFile(doc: Documento, token: string): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL

  const response = await fetch(
    `${apiUrl}/documents/${doc.id}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = doc.originalFilename || doc.keyValueCatalogValue
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const GENERATED_DOCUMENT_ERROR_MESSAGES: Record<string, string> = {
  PRECANDIDATO_NOT_FOUND: 'Precandidato no encontrado',
  // legacy contract (endpoint deprecado por claveIne)
  PRE_CANDIDATO_NOT_FOUND: 'Precandidato no encontrado',
  TEMPLATE_NOT_FOUND: 'Plantilla no disponible para este documento',
  TEMPLATE_INVALID: 'Plantilla de documento inválida',
  PDF_GENERATION_FAILED: 'Error al generar el documento',
}

const DEMARCATION_DOCUMENT_ERROR_MESSAGES: Record<string, string> = {
  FOLIO_DEMARCACION_NOT_FOUND: 'Demarcación no encontrada',
  FOLIO_DEMARCACION_NOT_VALID: 'La demarcación debe estar válida para esta operación',
  DOCUMENT_NOT_FOUND: 'Documento no encontrado',
  DUPLICATE_DOCUMENT: 'Ya existe un documento de este tipo para la demarcación',
  EMPTY_FILE: 'El archivo está vacío',
  FILE_TOO_LARGE: 'El archivo excede el tamaño máximo permitido',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
  DOCUMENT_NO_FILE: 'El documento no tiene archivo asociado',
  TEMPLATE_NOT_FOUND: 'Plantilla no disponible para este documento',
  TEMPLATE_INVALID: 'Plantilla de documento inválida',
  PDF_GENERATION_FAILED: 'Error al generar el documento',
}

export function toDocumentoKey(catalogValue: string): string {
  return catalogValue
    .replace(/\.pdf$/i, '')
    .replace(/[()]/g, '')
    .replace(/ /g, '_')
}

function getGeneratedFilename(response: Response, fallback: string): string {
  const header = response.headers.get('Content-Disposition')
  if (!header) return fallback

  const encodedMatch = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim())
    } catch {
      // fall through to the plain filename variants
    }
  }

  const quotedMatch = /filename\s*=\s*"([^"]+)"/i.exec(header)
  if (quotedMatch?.[1]) return quotedMatch[1]

  const bareMatch = /filename\s*=\s*([^;]+)/i.exec(header)
  if (bareMatch?.[1]) return bareMatch[1].trim()

  return fallback
}

export async function generateDocumentForSign(
  preCandidatoId: number,
  documento: string,
  token: string
): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL

  const response = await fetch(
    `${apiUrl}/documents/pre-candidatos/${preCandidatoId}/generated?documento=${encodeURIComponent(documento)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) {
    let errorCode: string | undefined
    let apiMessage: string | undefined
    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        const body = (await response.json()) as { message?: string; error?: string }
        apiMessage = body?.message
        errorCode = body?.error
      }
    } catch {
      // ignore malformed error bodies
    }

    throw mapApiError({
      message:
        (errorCode && GENERATED_DOCUMENT_ERROR_MESSAGES[errorCode]) ||
        apiMessage ||
        `Error ${response.status}`,
      status: response.status,
      error: errorCode,
    })
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = getGeneratedFilename(response, `${documento}.pdf`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function demarcationDocumentsPath(folioId: number, fdmId: number): string {
  return `/folios/${folioId}/demarcaciones/${fdmId}/documents`
}

export async function getDemarcationDocuments(
  folioId: number,
  fdmId: number
): Promise<DemarcationDocument[]> {
  try {
    const response = await apiClient.get<DemarcationDocument[]>(
      demarcationDocumentsPath(folioId, fdmId)
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function uploadDemarcationDocument(
  folioId: number,
  fdmId: number,
  documentType: string,
  file: File,
  catalogKey?: string
): Promise<DemarcationDocument> {
  const formData = new FormData()
  formData.append('file', file)

  const catalogParam = catalogKey ? `&catalogKey=${encodeURIComponent(catalogKey)}` : ''

  try {
    const response = await apiClient.post<DemarcationDocument>(
      `${demarcationDocumentsPath(folioId, fdmId)}/upload?documentType=${encodeURIComponent(documentType)}${catalogParam}`,
      formData,
      { timeout: 30000 }
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function updateDemarcationDocumentStatus(
  folioId: number,
  fdmId: number,
  documentId: number,
  payload: UpdateDocumentStatusPayload
): Promise<DemarcationDocument> {
  try {
    const response = await apiClient.patch<DemarcationDocument>(
      `${demarcationDocumentsPath(folioId, fdmId)}/${documentId}`,
      payload
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function deleteDemarcationDocument(
  folioId: number,
  fdmId: number,
  documentId: number
): Promise<void> {
  try {
    await apiClient.delete(demarcationDocumentsPath(folioId, fdmId) + `/${documentId}`)
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function downloadDemarcationDocumentFile(
  folioId: number,
  fdmId: number,
  doc: DemarcationDocument,
  token: string
): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL

  const response = await fetch(
    `${apiUrl}${demarcationDocumentsPath(folioId, fdmId)}/${doc.id}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = doc.originalFilename || doc.keyValueCatalogValue
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function mapDemarcationFetchError(response: Response): Promise<never> {
  let errorCode: string | undefined
  let apiMessage: string | undefined
  try {
    if (response.headers.get('content-type')?.includes('application/json')) {
      const body = (await response.json()) as { message?: string; error?: string }
      apiMessage = body?.message
      errorCode = body?.error
    }
  } catch {
    // ignore malformed error bodies
  }

  throw mapApiError({
    message:
      (errorCode && DEMARCATION_DOCUMENT_ERROR_MESSAGES[errorCode]) ||
      apiMessage ||
      `Error ${response.status}`,
    status: response.status,
    error: errorCode,
  })
}

export async function generateDemarcationDocument(
  folioId: number,
  fdmId: number,
  documento: string,
  token: string
): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL

  const response = await fetch(
    `${apiUrl}${demarcationDocumentsPath(folioId, fdmId)}/generated?documento=${encodeURIComponent(documento)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) {
    await mapDemarcationFetchError(response)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = getGeneratedFilename(response, `${documento}.pdf`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
