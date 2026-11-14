import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { isAbsolute, resolve, sep } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { DEMO_FILES_FILENAMES, DEMO_FILES_URL_PREFIX } from '../src/services/demoFilesCatalog'

export const DEFAULT_DEMO_FILES_DIR = '../demo_files'
export const DEMO_FILES_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type NextFunction = (error?: unknown) => void
type Middleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: NextFunction
) => void

export function resolveDemoFilesDir(configured?: string): string {
  const value = configured?.trim() ? configured.trim() : DEFAULT_DEMO_FILES_DIR
  return isAbsolute(value) ? resolve(value) : resolve(process.cwd(), value)
}

function sendJson(response: ServerResponse, status: number, body: Record<string, string>): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

function contentDisposition(filename: string): string {
  return `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export function createDemoFilesMiddleware(demoFilesDir: string): Middleware {
  const rootDir = resolve(demoFilesDir)

  return (request, response, next) => {
    const rawUrl = request.url ?? ''
    if (!rawUrl.startsWith(`${DEMO_FILES_URL_PREFIX}/`)) {
      next()
      return
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD')
      sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' })
      return
    }

    let requestedName: string
    try {
      const url = new URL(rawUrl, 'http://localhost')
      requestedName = decodeURIComponent(url.pathname.slice(DEMO_FILES_URL_PREFIX.length + 1))
    } catch {
      sendJson(response, 400, { error: 'INVALID_REQUEST' })
      return
    }

    if (!DEMO_FILES_FILENAMES.includes(requestedName)) {
      sendJson(response, 404, { error: 'DEMO_FILE_NOT_FOUND' })
      return
    }

    const filePath = resolve(rootDir, requestedName)
    if (!filePath.startsWith(`${rootDir}${sep}`)) {
      sendJson(response, 404, { error: 'DEMO_FILE_NOT_FOUND' })
      return
    }

    void (async () => {
      try {
        const rootStats = await stat(rootDir).catch(() => null)
        if (!rootStats || !rootStats.isDirectory()) {
          sendJson(response, 500, {
            error: 'DEMO_FILES_DIR_UNAVAILABLE',
            message: 'La carpeta de archivos demo no está disponible',
          })
          return
        }

        const fileStats = await stat(filePath).catch(() => null)
        if (!fileStats || !fileStats.isFile()) {
          sendJson(response, 404, { error: 'DEMO_FILE_NOT_FOUND' })
          return
        }

        response.statusCode = 200
        response.setHeader('Content-Type', DEMO_FILES_XLSX_MIME)
        response.setHeader('Content-Length', fileStats.size)
        response.setHeader('Content-Disposition', contentDisposition(requestedName))
        response.setHeader('Cache-Control', 'no-store')

        if (request.method === 'HEAD') {
          response.end()
          return
        }

        const stream = createReadStream(filePath)
        stream.on('error', () => {
          if (!response.headersSent) {
            sendJson(response, 500, {
              error: 'DEMO_FILES_READ_ERROR',
              message: 'No se pudo leer el archivo demo',
            })
            return
          }
          response.destroy()
        })
        stream.pipe(response)
      } catch {
        if (!response.headersSent) {
          sendJson(response, 500, {
            error: 'DEMO_FILES_SERVICE_ERROR',
            message: 'No se pudo atender la descarga del archivo demo',
          })
        } else {
          response.destroy()
        }
      }
    })()
  }
}

export interface DemoFilesPluginOptions {
  demoFilesDir?: string
}

export function demoFilesPlugin(options: DemoFilesPluginOptions = {}): Plugin {
  return {
    name: 'demo-files-server',
    configureServer(server) {
      const dir = resolveDemoFilesDir(options.demoFilesDir ?? process.env.DEMO_FILES_DIR)
      server.middlewares.use(createDemoFilesMiddleware(dir))
    },
    configurePreviewServer(server) {
      const dir = resolveDemoFilesDir(options.demoFilesDir ?? process.env.DEMO_FILES_DIR)
      server.middlewares.use(createDemoFilesMiddleware(dir))
    },
  }
}
