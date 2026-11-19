import { openOrDownloadFile } from '../utils/openOrDownloadFile'
import { getCurrentUser } from './authService'
import {
  demoFileHref,
  getDemoFileEntry,
  getDemoFilename,
  type DemoFileType,
} from './demoFilesCatalog'

export type DemoFileErrorType = 'session' | 'missing' | 'service'

export interface DemoFileError {
  message: string
  type: DemoFileErrorType
}

export const DEMO_FILE_ERROR_MESSAGES: Record<DemoFileErrorType, string> = {
  session: 'Sesión inválida. Inicie sesión nuevamente',
  missing: 'Archivo no disponible',
  service: 'No se pudo descargar el archivo',
}

export function isDemoFileError(error: unknown): error is DemoFileError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error
  )
}

export async function validateSession(token: string | null): Promise<void> {
  if (!token) {
    throw { message: DEMO_FILE_ERROR_MESSAGES.session, type: 'session' } satisfies DemoFileError
  }

  try {
    await getCurrentUser(token)
  } catch {
    throw { message: DEMO_FILE_ERROR_MESSAGES.session, type: 'session' } satisfies DemoFileError
  }
}

export async function downloadDemoFile(
  token: string | null,
  id: string,
  type: DemoFileType
): Promise<void> {
  const entry = getDemoFileEntry(id)
  if (!entry) {
    throw { message: DEMO_FILE_ERROR_MESSAGES.service, type: 'service' } satisfies DemoFileError
  }

  const filename = getDemoFilename(entry, type)
  await downloadDemoFileByName(token, filename)
}

export async function isDemoFileAvailable(
  filename: string,
  signal: AbortSignal
): Promise<boolean> {
  const response = await fetch(demoFileHref(filename), {
    method: 'HEAD',
    cache: 'no-store',
    signal,
  })
  return response.ok && !response.headers.get('content-type')?.includes('text/html')
}

export async function downloadDemoFileByName(
  token: string | null,
  filename: string
): Promise<void> {
  await openOrDownloadFile(filename, async () => {
    await validateSession(token)


    let response: Response
    try {
      response = await fetch(demoFileHref(filename))
    } catch {
      throw { message: DEMO_FILE_ERROR_MESSAGES.service, type: 'service' } satisfies DemoFileError
    }

    if (response.status === 404) {
      throw { message: DEMO_FILE_ERROR_MESSAGES.missing, type: 'missing' } satisfies DemoFileError
    }

    if (!response.ok) {
      throw { message: DEMO_FILE_ERROR_MESSAGES.service, type: 'service' } satisfies DemoFileError
    }
    return response.blob()
  })
}
