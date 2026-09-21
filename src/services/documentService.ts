import { apiClient, type ApiError } from './apiClient'
import type { Documento, CatalogKeyValue } from '../types/demarcacion'

export interface DocumentError {
  message: string
  status: number
  error?: string
}

function mapApiError(error: ApiError): DocumentError {
  return {
    message: error.message,
    status: error.status,
    error: error.error,
  }
}

const CACHE_KEY = 'document_type_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000

function getCache(): CatalogKeyValue[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const rawTime = localStorage.getItem(`${CACHE_KEY}_time`)
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

function setCache(data: CatalogKeyValue[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString())
  } catch {
    // ignore
  }
}

export async function getDocumentTypes(): Promise<CatalogKeyValue[]> {
  const cached = getCache()
  if (cached) return cached

  try {
    const response = await apiClient.get<CatalogKeyValue[]>('/catalogs/key/DOCUMENT_TYPE')
    setCache(response.data)
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
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
  file: File
): Promise<Documento> {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await apiClient.post<Documento>(
      `/documents/${preCandidatoId}/upload?documentType=${encodeURIComponent(documentType)}`,
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

export function getDocumentUrl(doc: Documento): string | null {
  if (!doc.bucketName || !doc.objectKey) return null
  const env = import.meta.env.VITE_APP_ENV || 'local'
  if (env === 'local') {
    return `/files/${doc.objectKey}`
  }
  return `https://${doc.bucketName}.s3.amazonaws.com/${doc.objectKey}`
}
