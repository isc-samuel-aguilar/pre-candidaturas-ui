// @vitest-environment node
import { createServer, type Server } from 'node:http'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_DEMO_FILES_DIR,
  DEMO_FILES_XLSX_MIME,
  createDemoFilesMiddleware,
  resolveDemoFilesDir,
} from './demoFilesPlugin'

const FALLBACK_STATUS = 599

let demoDir: string
let server: Server
let baseUrl: string

function startServer(directory: string): Promise<void> {
  const middleware = createDemoFilesMiddleware(directory)

  return new Promise((resolveListen) => {
    server = createServer((request, response) => {
      middleware(request, response, () => {
        response.statusCode = FALLBACK_STATUS
        response.end('fallback')
      })
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        throw new Error('Unexpected server address')
      }
      baseUrl = `http://127.0.0.1:${address.port}`
      resolveListen()
    })
  })
}

function stopServer(): Promise<void> {
  return new Promise((resolveClose, reject) => {
    if (!server) {
      resolveClose()
      return
    }
    server.close((error) => (error ? reject(error) : resolveClose()))
  })
}

beforeEach(async () => {
  demoDir = await mkdtemp(join(tmpdir(), 'demo-files-'))
  await startServer(demoDir)
})

afterEach(async () => {
  await stopServer()
  await rm(demoDir, { recursive: true, force: true })
})

describe('resolveDemoFilesDir', () => {
  it('defaults to ../demo_files relative to the working directory', () => {
    expect(resolveDemoFilesDir(undefined)).toBe(
      resolve(process.cwd(), DEFAULT_DEMO_FILES_DIR)
    )
    expect(resolveDemoFilesDir('   ')).toBe(resolve(process.cwd(), DEFAULT_DEMO_FILES_DIR))
  })

  it('accepts relative and absolute directories', () => {
    expect(resolveDemoFilesDir('demo-files')).toBe(resolve(process.cwd(), 'demo-files'))

    const absolute = resolve(demoDir)
    expect(resolveDemoFilesDir(absolute)).toBe(absolute)
  })
})

describe('demo files middleware', () => {
  it('serves an existing catalog file with its exact name and xlsx mime type', async () => {
    const filename = 'AYTO AGUASCALIENTES.xlsx'
    await writeFile(join(demoDir, filename), 'fake-xlsx-content')

    const response = await fetch(`${baseUrl}/demo-files/${encodeURIComponent(filename)}`)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(DEMO_FILES_XLSX_MIME)
    expect(response.headers.get('content-disposition')).toContain(
      `filename="${filename}"`
    )
    expect(await response.text()).toBe('fake-xlsx-content')
  })

  it('serves example filenames with spaces', async () => {
    const filename = 'EJEMPLO LLENADO - DIP MR.xlsx'
    await writeFile(join(demoDir, filename), 'example')

    const response = await fetch(`${baseUrl}/demo-files/${encodeURIComponent(filename)}`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('example')
  })

  it('answers HEAD with headers only', async () => {
    const filename = 'GUBERNATURA.xlsx'
    await writeFile(join(demoDir, filename), 'clean')

    const response = await fetch(`${baseUrl}/demo-files/${encodeURIComponent(filename)}`, {
      method: 'HEAD',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
  })

  it('returns 404 when a catalog file is missing from an accessible folder', async () => {
    const response = await fetch(
      `${baseUrl}/demo-files/${encodeURIComponent('AYTO AGUASCALIENTES.xlsx')}`
    )

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('DEMO_FILE_NOT_FOUND')
  })

  it('returns 404 for filenames outside the catalog', async () => {
    await writeFile(join(demoDir, 'secret.xlsx'), 'nope')

    const response = await fetch(`${baseUrl}/demo-files/secret.xlsx`)

    expect(response.status).toBe(404)
  })

  it('rejects path traversal attempts', async () => {
    const response = await fetch(`${baseUrl}/demo-files/..%2F..%2Fsecret.txt`)

    expect(response.status).toBe(404)
  })

  it('rejects methods other than GET and HEAD', async () => {
    const response = await fetch(
      `${baseUrl}/demo-files/${encodeURIComponent('GUBERNATURA.xlsx')}`,
      { method: 'POST' }
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, HEAD')
  })

  it('distinguishes an unavailable folder from an empty one', async () => {
    const missingDir = join(demoDir, 'missing-folder')
    await stopServer()
    await startServer(missingDir)

    const missingResponse = await fetch(
      `${baseUrl}/demo-files/${encodeURIComponent('GUBERNATURA.xlsx')}`
    )
    expect(missingResponse.status).toBe(500)
    const body = (await missingResponse.json()) as { error: string }
    expect(body.error).toBe('DEMO_FILES_DIR_UNAVAILABLE')

    const emptyDir = join(demoDir, 'empty-folder')
    await mkdir(emptyDir)
    await stopServer()
    await startServer(emptyDir)

    const emptyResponse = await fetch(
      `${baseUrl}/demo-files/${encodeURIComponent('GUBERNATURA.xlsx')}`
    )
    expect(emptyResponse.status).toBe(404)
  })

  it('ignores requests outside the demo files prefix', async () => {
    const response = await fetch(`${baseUrl}/api/other`)

    expect(response.status).toBe(FALLBACK_STATUS)
    expect(await response.text()).toBe('fallback')
  })
})
