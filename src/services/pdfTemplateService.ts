import { apiClient, type ApiError } from './apiClient'

export interface PdfTemplate {
  documento: string
  plantilla: string
  tokens: number
  ultimaCarga: string
  version: number
  activo: boolean
  actualizadoPor: string | null
  actualizadoFecha: string | null
  campos: string
  salida: string
}

export interface PdfTemplateError {
  message: string
  status: number
  error?: string
}

const PDF_TEMPLATE_ERROR_MESSAGES: Record<string, string> = {
  FILE_REQUIRED: 'Selecciona un archivo PDF',
  TEMPLATE_INVALID: 'Plantilla de documento inválida',
  FILE_TOO_LARGE: 'El archivo supera el máximo de 5 MB',
  TEMPLATE_WRITE_FAILED: 'No se pudo guardar la plantilla en el servidor',
  TEMPLATE_NOT_FOUND: 'Plantilla no encontrada',
}

export function mapPdfTemplateError(error: ApiError): PdfTemplateError {
  const message =
    (error.error && PDF_TEMPLATE_ERROR_MESSAGES[error.error]) ||
    (error.status === 403 ? 'No tienes permisos para realizar esta acción' : undefined) ||
    error.message ||
    `Error ${error.status}`

  return {
    message,
    status: error.status,
    error: error.error,
  }
}

export async function getPdfTemplates(): Promise<PdfTemplate[]> {
  try {
    const response = await apiClient.get<PdfTemplate[]>('/pdf-templates')
    return response.data
  } catch (error) {
    throw mapPdfTemplateError(error as ApiError)
  }
}

export async function reloadPdfTemplates(): Promise<void> {
  try {
    await apiClient.post('/pdf-templates/reload')
  } catch (error) {
    throw mapPdfTemplateError(error as ApiError)
  }
}

export async function uploadPdfTemplate(
  file: File,
  mappings?: string
): Promise<PdfTemplate[]> {
  const formData = new FormData()
  formData.append('file', file)
  if (mappings) {
    formData.append('mappings', mappings)
  }

  try {
    const response = await apiClient.post<PdfTemplate[]>(
      '/pdf-templates/upload',
      formData,
      { timeout: 30000 }
    )
    return response.data
  } catch (error) {
    throw mapPdfTemplateError(error as ApiError)
  }
}

export async function deletePdfTemplate(clave: string): Promise<void> {
  try {
    await apiClient.delete(`/pdf-templates/${encodeURIComponent(clave)}`)
  } catch (error) {
    throw mapPdfTemplateError(error as ApiError)
  }
}
