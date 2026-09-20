import { apiClient, type ApiError } from './apiClient'
import type { Documento } from '../types/demarcacion'

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
