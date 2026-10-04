import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import ConfiguracionPage from './ConfiguracionPage'
import type { PdfTemplate } from '../../../../services/pdfTemplateService'

const serviceMocks = vi.hoisted(() => ({
  getPdfTemplates: vi.fn(),
  reloadPdfTemplates: vi.fn(),
  uploadPdfTemplate: vi.fn(),
}))

vi.mock('../../../../services/pdfTemplateService', () => serviceMocks)

const template: PdfTemplate = {
  documento: 'CV_PUBLICO_APP',
  plantilla: 'CV_PUBLICO_APP_template.pdf',
  tokens: 11,
  ultimaCarga: '2026-10-03T10:00:00',
}

const uploadedTemplate: PdfTemplate = {
  documento: 'NUEVA_PLANTILLA',
  plantilla: 'NUEVA_PLANTILLA_template.pdf',
  tokens: 3,
  ultimaCarga: '2026-10-03T12:00:00',
}

function makeFile(name: string, bytes = 16): File {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' })
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error('file input not found')
  return input as HTMLInputElement
}

beforeEach(() => {
  serviceMocks.getPdfTemplates.mockResolvedValue([template])
  serviceMocks.reloadPdfTemplates.mockResolvedValue(undefined)
  serviceMocks.uploadPdfTemplate.mockResolvedValue([uploadedTemplate])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ConfiguracionPage - listado', () => {
  it('pinta el listado de plantillas al montar', async () => {
    render(<ConfiguracionPage />)

    expect(await screen.findByText('CV_PUBLICO_APP')).toBeInTheDocument()
    expect(screen.getByText('CV_PUBLICO_APP_template.pdf')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('2026-10-03T10:00:00')).toBeInTheDocument()
    expect(serviceMocks.getPdfTemplates).toHaveBeenCalledTimes(1)
  })

  it('muestra "Sin plantillas cargadas" cuando la respuesta está vacía', async () => {
    serviceMocks.getPdfTemplates.mockResolvedValue([])

    render(<ConfiguracionPage />)

    expect(await screen.findByText('Sin plantillas cargadas')).toBeInTheDocument()
  })

  it('muestra el mensaje de error si falla la carga inicial', async () => {
    serviceMocks.getPdfTemplates.mockRejectedValue({ message: 'Error al cargar', status: 500 })

    render(<ConfiguracionPage />)

    expect(await screen.findByText('Error al cargar')).toBeInTheDocument()
  })
})

describe('ConfiguracionPage - actualizar template (reload)', () => {
  it('pide confirmación; cancelar no llama al servicio', async () => {
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar template' }))
    expect(screen.getByText(/Se recargarán las plantillas/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(serviceMocks.reloadPdfTemplates).not.toHaveBeenCalled()
    await waitForElementToBeRemoved(() => screen.queryByText(/Se recargarán las plantillas/))
  })

  it('confirmar hace POST reload, refresca el listado y muestra snackbar de éxito', async () => {
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar template' }))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    await waitFor(() => expect(serviceMocks.reloadPdfTemplates).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Plantillas recargadas')).toBeInTheDocument()
    await waitFor(() => expect(serviceMocks.getPdfTemplates).toHaveBeenCalledTimes(2))
  })

  it('muestra el error del backend si el reload falla', async () => {
    serviceMocks.reloadPdfTemplates.mockRejectedValue({ message: 'Error 500', status: 500 })

    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar template' }))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByText('Error 500')).toBeInTheDocument()
    expect(serviceMocks.reloadPdfTemplates).toHaveBeenCalledTimes(1)
  })
})

describe('ConfiguracionPage - subir plantilla', () => {
  it('sin archivo muestra error y no hace HTTP', async () => {
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    expect(await screen.findByText('Selecciona un archivo PDF')).toBeInTheDocument()
    expect(serviceMocks.uploadPdfTemplate).not.toHaveBeenCalled()
  })

  it('rechaza archivos que no son PDF en el cliente', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('notas.txt')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    expect(await screen.findByText('El archivo debe tener extensión .pdf')).toBeInTheDocument()
    expect(serviceMocks.uploadPdfTemplate).not.toHaveBeenCalled()
  })

  it('rechaza archivos mayores a 5 MB en el cliente', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('CV_PUBLICO_APP_template.pdf', 6 * 1024 * 1024)] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    expect(await screen.findByText('El archivo supera el máximo de 5 MB')).toBeInTheDocument()
    expect(serviceMocks.uploadPdfTemplate).not.toHaveBeenCalled()
  })

  it('rechaza mappings que no son JSON válido en el cliente', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('CV_PUBLICO_APP_template.pdf')] },
    })
    fireEvent.change(screen.getByLabelText('mappings.json (opcional)'), {
      target: { value: '{"TOKEN": roto' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    expect(
      await screen.findByText('El contenido de mappings no es JSON válido')
    ).toBeInTheDocument()
    expect(serviceMocks.uploadPdfTemplate).not.toHaveBeenCalled()
  })

  it('sube el PDF con mappings, actualiza la tabla con el listado devuelto y muestra snackbar', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    const file = makeFile('NUEVA_PLANTILLA_template.pdf')
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText('mappings.json (opcional)'), {
      target: { value: '{"TOKEN": "campo"}' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    await waitFor(() =>
      expect(serviceMocks.uploadPdfTemplate).toHaveBeenCalledWith(file, '{"TOKEN": "campo"}')
    )
    expect(await screen.findByText('Plantilla actualizada')).toBeInTheDocument()
    expect(await screen.findByText('NUEVA_PLANTILLA')).toBeInTheDocument()
  })

  it('sube el PDF sin mappings enviando undefined', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    const file = makeFile('CV_PUBLICO_APP_template.pdf')
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    await waitFor(() =>
      expect(serviceMocks.uploadPdfTemplate).toHaveBeenCalledWith(file, undefined)
    )
    expect(await screen.findByText('Plantilla actualizada')).toBeInTheDocument()
  })

  it('muestra el mensaje de error cuando el backend rechaza la subida', async () => {
    // El servicio (mockeado aquí) ya devuelve el mensaje mapeado al español;
    // el mapeo de los códigos 400/403 se verifica en pdfTemplateService.test.ts.
    serviceMocks.uploadPdfTemplate.mockRejectedValue({
      message: 'El archivo supera el máximo de 5 MB',
      status: 400,
      error: 'FILE_TOO_LARGE',
    })
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('CV_PUBLICO_APP_template.pdf')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    expect(await screen.findByText('El archivo supera el máximo de 5 MB')).toBeInTheDocument()
  })
})
