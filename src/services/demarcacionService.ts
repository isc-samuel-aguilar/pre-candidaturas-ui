import { apiClient, type ApiError } from './apiClient'
import type {
  DemarcacionCatalogo,
  FolioDemarcacion,
  ExcelImportResult,
} from '../types/demarcacion'
import type { Folio } from '../types/folio'

export interface DemarcacionError {
  message: string
  status: number
  error?: string
}

function mapApiError(error: ApiError): DemarcacionError {
  return {
    message: error.message,
    status: error.status,
    error: error.error,
  }
}

export async function getMyFolio(): Promise<Folio> {
  try {
    const response = await apiClient.get<Folio>('/folios/my-folio')
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getCatalogoDemarcaciones(
  filters?: { ambito?: string; demarcacion?: string }
): Promise<DemarcacionCatalogo[]> {
  try {
    const queryParams: Record<string, string> = {}
    if (filters?.ambito) queryParams.ambito = filters.ambito
    if (filters?.demarcacion) queryParams.demarcacion = filters.demarcacion

    const response = await apiClient.get<DemarcacionCatalogo[]>(
      '/demarcaciones/catalogo',
      { queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined }
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getDemarcacionesByFolio(
  folioId: number
): Promise<FolioDemarcacion[]> {
  try {
    const response = await apiClient.get<FolioDemarcacion[]>(
      `/folios/${folioId}/demarcaciones`
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function createDemarcacion(
  folioId: number,
  demarcationName: string,
  ambito: string
): Promise<FolioDemarcacion> {
  try {
    const response = await apiClient.post<FolioDemarcacion>(
      `/folios/${folioId}/demarcaciones`,
      { demarcationName, ambito }
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function deleteDemarcacion(folioId: number, id: number): Promise<void> {
  try {
    await apiClient.delete(`/folios/${folioId}/demarcaciones/${id}`)
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function getDemarcacionById(
  folioId: number,
  id: number
): Promise<FolioDemarcacion> {
  try {
    const response = await apiClient.get<FolioDemarcacion>(
      `/folios/${folioId}/demarcaciones/${id}`
    )
    return response.data
  } catch (error) {
    throw mapApiError(error as ApiError)
  }
}

export async function uploadExcel(
  folioId: number,
  demarcationName: string,
  file: File
): Promise<ExcelImportResult[]> {
  const formData = new FormData()
  formData.append('excel', file)

  const response = await apiClient.post<ExcelImportResult[]>(
    `/folios/${folioId}/demarcaciones/${demarcationName}/precandidatos/excel`,
    formData,
    { timeout: 30000 }
  )
  return response.data
}
