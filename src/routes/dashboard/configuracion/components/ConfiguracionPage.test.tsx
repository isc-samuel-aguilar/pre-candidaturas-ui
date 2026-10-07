import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import ConfiguracionPage, { validateUpload } from './ConfiguracionPage'
import type { PdfTemplate } from '../../../../services/pdfTemplateService'

const serviceMocks = vi.hoisted(() => ({
  getPdfTemplates: vi.fn(),
  reloadPdfTemplates: vi.fn(),
  uploadPdfTemplate: vi.fn(),
  deletePdfTemplate: vi.fn(),
}))

vi.mock('../../../../services/pdfTemplateService', () => serviceMocks)

const CAMPOS_JSON = '{"NOMBRE_COMPLETO":{"fuente":"nombre"},"EDAD":{"fuente":"edad"}}'

const template: PdfTemplate = {
  documento: 'CV_PUBLICO_APP',
  plantilla: 'CV_PUBLICO_APP_template.pdf',
  tokens: 11,
  ultimaCarga: '2026-10-03T10:00:00',
  version: 1,
  activo: true,
  actualizadoPor: null,
  actualizadoFecha: null,
  campos: CAMPOS_JSON,
  salida: 'CV PUBLICO APP.pdf',
}

const updatedTemplate: PdfTemplate = {
  ...template,
  version: 2,
  actualizadoPor: 'admin',
  actualizadoFecha: '2026-10-06T12:00:00',
}

const uploadedTemplate: PdfTemplate = {
  documento: 'NUEVA_PLANTILLA',
  plantilla: 'NUEVA_PLANTILLA_template.pdf',
  tokens: 3,
  ultimaCarga: '2026-10-03T12:00:00',
  version: 1,
  activo: true,
  actualizadoPor: null,
  actualizadoFecha: null,
  campos: '{"TOKEN":{"fuente":"x"}}',
  salida: 'NUEVA PLANTILLA.pdf',
}

function makeFile(name: string, bytes = 16): File {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' })
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error('file input not found')
  return input as HTMLInputElement
}

function getCamposPre(container: HTMLElement): HTMLElement {
  const pre = container.querySelector('pre')
  if (!pre) throw new Error('campos <pre> not found')
  return pre as HTMLElement
}

beforeEach(() => {
  serviceMocks.getPdfTemplates.mockResolvedValue([template])
  serviceMocks.reloadPdfTemplates.mockResolvedValue(undefined)
  serviceMocks.uploadPdfTemplate.mockResolvedValue([uploadedTemplate])
  serviceMocks.deletePdfTemplate.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ConfiguracionPage - listado', () => {
  it('pinta el listado de plantillas al montar', async () => {
    render(<ConfiguracionPage />)

    expect(await screen.findByText('CV_PUBLICO_APP')).toBeInTheDocument()
    expect(screen.getByText('CV_PUBLICO_APP_template.pdf')).toBeInTheDocument()
    expect(screen.getByText('2026-10-03 10:00')).toBeInTheDocument()
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
    const mappings =
      '{"NUEVA_PLANTILLA": {"campos": {"TOKEN": {"fuente": "nombre"}}, "salida": "NUEVA PLANTILLA.pdf"}}'
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText('mappings.json (opcional)'), {
      target: { value: mappings },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    await waitFor(() => expect(serviceMocks.uploadPdfTemplate).toHaveBeenCalledWith(file, mappings))
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

describe('ConfiguracionPage - columnas C10', () => {
  it('pinta las columnas nuevas: versión, activo, última modificación, campos y acciones', async () => {
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    expect(screen.getByText('Documento')).toBeInTheDocument()
    expect(screen.getByText('Plantilla')).toBeInTheDocument()
    expect(screen.getByText('Última carga')).toBeInTheDocument()
    expect(screen.getByText('Versión')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Última modificación')).toBeInTheDocument()
    expect(screen.getByText('Campos')).toBeInTheDocument()
    expect(screen.getByText('Acciones')).toBeInTheDocument()
    expect(screen.queryByText('Tokens')).not.toBeInTheDocument()
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plantilla PDF' })).toBeInTheDocument()
  })

  it('pinta la columna Campos con el JSON en beauty dentro de un <pre>', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    const pre = getCamposPre(container)
    expect(pre.textContent).toContain('  "NOMBRE_COMPLETO": {')
    expect(pre.textContent).toContain('    "fuente": "nombre"')
  })

  it('si campos no es JSON válido muestra el string crudo sin romper la fila', async () => {
    serviceMocks.getPdfTemplates.mockResolvedValue([{ ...template, campos: '{"roto":' }])
    const { container } = render(<ConfiguracionPage />)

    expect(await screen.findByText('CV_PUBLICO_APP')).toBeInTheDocument()
    expect(getCamposPre(container).textContent).toBe('{"roto":')
    expect(screen.getByRole('button', { name: 'Actualizar…' })).toBeInTheDocument()
  })

  it('pinta usuario y fecha (yyyy-mm-dd hh:mm) cuando la plantilla ya fue modificada', async () => {
    serviceMocks.getPdfTemplates.mockResolvedValue([updatedTemplate])
    render(<ConfiguracionPage />)

    expect(await screen.findByText('admin · 2026-10-06 12:00')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })
})

describe('ConfiguracionPage - borrar plantilla', () => {
  it('cancelar en el diálogo no llama al servicio', async () => {
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Se eliminará la plantilla/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(serviceMocks.deletePdfTemplate).not.toHaveBeenCalled()
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
  })

  it('confirmar borra la fila, muestra snackbar de éxito y recarga el listado', async () => {
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/CV_PUBLICO_APP/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar' }))

    await waitFor(() =>
      expect(serviceMocks.deletePdfTemplate).toHaveBeenCalledWith('CV_PUBLICO_APP')
    )
    expect(await screen.findByText('Plantilla borrada')).toBeInTheDocument()
    await waitFor(() => expect(serviceMocks.getPdfTemplates).toHaveBeenCalledTimes(2))
  })

  it('muestra el error TEMPLATE_NOT_FOUND en español sin recargar', async () => {
    serviceMocks.deletePdfTemplate.mockRejectedValue({
      message: 'Plantilla no encontrada',
      status: 400,
      error: 'TEMPLATE_NOT_FOUND',
    })
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar' }))

    expect(await screen.findByText('Plantilla no encontrada')).toBeInTheDocument()
    expect(serviceMocks.getPdfTemplates).toHaveBeenCalledTimes(1)
  })
})

describe('ConfiguracionPage - actualizar (prellenado)', () => {
  it('rellena mappings en beauty con la clave de la fila y su salida', async () => {
    render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar…' }))

    const textarea = screen.getByLabelText('mappings.json (opcional)') as HTMLTextAreaElement
    expect(textarea.value).toBe(
      JSON.stringify(
        { CV_PUBLICO_APP: { campos: JSON.parse(CAMPOS_JSON), salida: 'CV PUBLICO APP.pdf' } },
        null,
        2
      )
    )
    expect(document.activeElement).toBe(textarea)
    expect(serviceMocks.uploadPdfTemplate).not.toHaveBeenCalled()
  })

  it('vacía el PDF seleccionado al prellenar', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('CV_PUBLICO_APP_template.pdf')] },
    })
    expect(getFileInput(container).files).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar…' }))

    expect(getFileInput(container).files).toHaveLength(0)
  })

  it('actualiza enviando el mappings prellenado con el PDF elegido', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar…' }))
    const file = makeFile('CV_PUBLICO_APP_template.pdf')
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    const expected = JSON.stringify(
      { CV_PUBLICO_APP: { campos: JSON.parse(CAMPOS_JSON), salida: 'CV PUBLICO APP.pdf' } },
      null,
      2
    )
    await waitFor(() => expect(serviceMocks.uploadPdfTemplate).toHaveBeenCalledWith(file, expected))
  })

  it('crea con una clave nueva usando el mismo formulario', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    const file = makeFile('NUEVA_PLANTILLA_template.pdf')
    const mappings = '{\n  "NUEVA_PLANTILLA": {\n    "campos": {\n      "TOKEN": {}\n    },\n    "salida": "NUEVA PLANTILLA.pdf"\n  }\n}'
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText('mappings.json (opcional)'), {
      target: { value: mappings },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    await waitFor(() => expect(serviceMocks.uploadPdfTemplate).toHaveBeenCalledWith(file, mappings))
    expect(await screen.findByText('Plantilla actualizada')).toBeInTheDocument()
  })

  it('rechaza mappings que son un array', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.change(getFileInput(container), { target: { files: [makeFile('x.pdf')] } })
    fireEvent.change(screen.getByLabelText('mappings.json (opcional)'), {
      target: { value: '[1,2]' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    expect(
      await screen.findByText('El contenido de mappings debe ser un objeto JSON no vacío')
    ).toBeInTheDocument()
    expect(serviceMocks.uploadPdfTemplate).not.toHaveBeenCalled()
  })

  it('rechaza mappings que son un objeto vacío', async () => {
    const { container } = render(<ConfiguracionPage />)
    await screen.findByText('CV_PUBLICO_APP')

    fireEvent.change(getFileInput(container), { target: { files: [makeFile('x.pdf')] } })
    fireEvent.change(screen.getByLabelText('mappings.json (opcional)'), {
      target: { value: '{}' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir plantilla' }))

    expect(
      await screen.findByText('El contenido de mappings debe ser un objeto JSON no vacío')
    ).toBeInTheDocument()
    expect(serviceMocks.uploadPdfTemplate).not.toHaveBeenCalled()
  })
})

describe('ConfiguracionPage - validación de mappings (C10)', () => {
  const pdf = () => makeFile('CV_PUBLICO_APP.pdf')

  const VALID_MAPPINGS = JSON.stringify({
    CV_PUBLICO_APP: {
      campos: { NOMBRE_COMPLETO: ['nombre', 'apellido_paterno'] },
      salida: 'CV PUBLICO APP.pdf',
    },
  })

  it('acepta mappings completo (campos objeto no vacío y salida)', () => {
    expect(validateUpload(pdf(), VALID_MAPPINGS)).toBeNull()
  })

  it('acepta mappings vacío porque sólo sustituye el PDF', () => {
    expect(validateUpload(pdf(), '   ')).toBeNull()
  })

  it('rechaza claves fuera de [A-Z0-9_]', () => {
    expect(
      validateUpload(pdf(), '{"cv_publico_app": {"campos": {"a": {"fuente": "x"}}, "salida": "x.pdf"}}')
    ).toBe('La clave "cv_publico_app" no es válida (usa A-Z, 0-9 y _)')
  })

  it('rechaza entradas que no son objetos', () => {
    expect(validateUpload(pdf(), '{"CV_PUBLICO_APP": "x"}')).toBe(
      'La entrada "CV_PUBLICO_APP" debe ser un objeto JSON'
    )
  })

  it('rechaza mappings sin salida (el 400 del backend, ahora en cliente)', () => {
    expect(
      validateUpload(pdf(), '{"CV_PUBLICO_APP": {"campos": {"NOMBRE": {"fuente": "nombre"}}}}')
    ).toBe('Falta "salida" (nombre del documento de salida) en CV_PUBLICO_APP')
  })

  it('rechaza salida en blanco', () => {
    expect(
      validateUpload(pdf(), '{"CV_PUBLICO_APP": {"campos": {"NOMBRE": {"fuente": "x"}}, "salida": "  "}}')
    ).toBe('Falta "salida" (nombre del documento de salida) en CV_PUBLICO_APP')
  })

  it('rechaza cuando campos no es un objeto', () => {
    expect(
      validateUpload(pdf(), '{"CV_PUBLICO_APP": {"campos": "nombre", "salida": "x.pdf"}}')
    ).toBe('Falta "campos" como objeto en CV_PUBLICO_APP')
  })

  it('rechaza campos vacío', () => {
    expect(validateUpload(pdf(), '{"CV_PUBLICO_APP": {"campos": {}, "salida": "x.pdf"}}')).toBe(
      'El "campos" de CV_PUBLICO_APP debe ser un objeto no vacío'
    )
  })

  it('muestra el placeholder con la forma C10 y la ayuda del contrato', () => {
    render(<ConfiguracionPage />)

    expect(
      screen.getByPlaceholderText(
        '{"CLAVE": {"campos": {"TOKEN": "campo"}, "salida": "Nombre Documento.pdf"}}'
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/Cada clave necesita "campos"/)).toBeInTheDocument()
  })
})
