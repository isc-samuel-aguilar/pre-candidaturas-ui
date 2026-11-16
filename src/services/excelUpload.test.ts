import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadExcel } from './demarcacionService'

function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('uploadExcel', () => {
  it('uploads one multipart request using an encoded demarcation and returns the import result', async () => {
    const data = { results: [{ rowNumber: 2, status: 'OK' }], errors: [] }
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, data))
    vi.stubGlobal('fetch', mockFetch)
    const file = new File(['example'], 'AYTO AGUASCALIENTES.xlsx')

    await expect(uploadExcel(2, 'AYTO AGUASCALIENTES', file)).resolves.toEqual(data)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0] ?? []
    expect(url).toMatch(/\/folios\/2\/demarcaciones\/AYTO%20AGUASCALIENTES\/precandidatos\/excel$/)
    expect(options?.method).toBe('POST')
    expect((options?.body as FormData).get('excel')).toBe(file)
  })

  it('preserves the backend filename validation message', async () => {
    const message = 'El nombre del archivo no corresponde. Nombre esperado: AYTO AGUASCALIENTES.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, {
      error: 'INVALID_EXCEL_FILE',
      message,
    })))

    await expect(uploadExcel(2, 'AGUASCALIENTES', new File([], 'Ejemplo 02.xlsx')))
      .rejects.toMatchObject({ message, error: 'INVALID_EXCEL_FILE', status: 400 })
  })

  it('shows individual row errors before a generic backend message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, {
      results: [],
      errors: ['Fila 2: columnas sin valor: CURP', 'Fila 3: AMBITO incorrecto'],
      message: 'El archivo contiene errores',
    })))

    await expect(uploadExcel(2, 'AGUASCALIENTES', new File([], 'AYTO AGUASCALIENTES.xlsx')))
      .rejects.toMatchObject({
        message: 'Fila 2: columnas sin valor: CURP\nFila 3: AMBITO incorrecto',
        status: 400,
      })
  })
})
