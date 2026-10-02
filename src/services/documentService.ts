import { apiClient, type ApiError } from './apiClient'
import type { Documento, KeyValueCatalog } from '../types/demarcacion'
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

const DOCUMENT_TYPE_CACHE_KEY = 'document_type_cache'
const GENERATED_DOCUMENT_CACHE_KEY = 'generated_document_type_cache'
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
