import { apiClient, type ApiError } from './apiClient'
import type {
  Folio,
  CreateFolioRequest,
  UpdateFolioRequest,
} from '../types/folio'
import type { KeyValueCatalog } from '../types/demarcacion'

export interface FolioError {
  message: string
  status: number
  error?: string
}

function mapApiError(error: ApiError): FolioError {
  return {
    message: error.message,
    status: error.status,
    error: error.error,
  }
}

export async function getRepresentations(): Promise<KeyValueCatalog[]> {
  try {
    const response = await apiClient.get<KeyValueCatalog[]>(
      '/key-value-catalogs/key/REPRESENTACION'
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getFolios(): Promise<Folio[]> {
  try {
    const response = await apiClient.get<Folio[]>('/folios')
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getFolioById(id: number): Promise<Folio> {
  try {
    const response = await apiClient.get<Folio>(`/folios/${id}`)
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getFolioByFolio(folio: string): Promise<Folio> {
  try {
    const response = await apiClient.get<Folio>(`/folios/by-folio/${folio}`)
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getFoliosByUser(userName: string): Promise<Folio> {
  try {
    const response = await apiClient.get<Folio>(
      `/folios/by-user/${encodeURIComponent(userName)}`
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function createFolio(data: CreateFolioRequest): Promise<Folio> {
  try {
    const response = await apiClient.post<Folio>('/folios', data)
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function updateFolio(
  id: number,
  data: UpdateFolioRequest
): Promise<Folio> {
  try {
    const response = await apiClient.put<Folio>(`/folios/${id}`, data)
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function deleteFolio(id: number): Promise<void> {
  try {
    await apiClient.delete(`/folios/${id}`)
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}
