import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { PrecandidatosTable } from './PrecandidatosTable'
import { StatusEnum } from '../types/enums'
import type { Documento, Precandidato } from '../types/demarcacion'

const mocks = vi.hoisted(() => ({
  getPrecandidatos: vi.fn(),
  getDocumentsByPrecandidato: vi.fn(),
  getDocumentTypes: vi.fn(),
  getGeneratedDocumentTypes: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  downloadDocumentFile: vi.fn(),
  updateDocumentStatus: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('../services/demarcacionService', () => ({
  getPrecandidatos: mocks.getPrecandidatos,
}))

vi.mock('../services/documentService', () => ({
  getDocumentsByPrecandidato: mocks.getDocumentsByPrecandidato,
  getDocumentTypes: mocks.getDocumentTypes,
  getGeneratedDocumentTypes: mocks.getGeneratedDocumentTypes,
  uploadDocument: mocks.uploadDocument,
  deleteDocument: mocks.deleteDocument,
  downloadDocumentFile: mocks.downloadDocumentFile,
  updateDocumentStatus: mocks.updateDocumentStatus,
  // mismo valor que documentService.GENERATED_DOCUMENT_KEY (constante en producción)
  GENERATED_DOCUMENT_KEY: 'GENERATED_DOCUMENT',
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

const precandidato: Precandidato = {
  id: 7,
  cargo: 'Regiduria',
  calidad: 'Titular',
  genero: 'Mujer',
  accionAfirmativa: 'No',
  internoExterno: 'Interno',
  apellidoPaterno: 'Lopez',
  apellidoMaterno: 'Ruiz',
  nombre: 'Maria',
  claveIfe: '00000000000000',
  ocr: '',
  curp: 'LORM880101MDFXXX01',
  rfcHomoclave: 'LORM880101AA1',
  municipioDondeNacio: '',
  estadoDondeNacio: '',
  ocupacion: '',
  calleDondeVive: '',
  numeroDondeVive: '',
  coloniaDondeVive: '',
  municipioDondeVive: '',
  estadoDondeVive: '',
  codigoPostal: '',
  tiempoDeResidenciaEnDomicilio: '',
  telefono: '55555555',
  correoElectronico: 'maria@example.com',
  escolaridad: '',
  carrera: '',
  lugarDondeTrabaja: '',
  puestoEnSuTrabajo: '',
  fechaIngresoTrabajo: '',
  fechaTerminacionTrabajo: '',
}

const documentFixture: Documento = {
  id: 10,
  keyValueCatalogId: 1,
  keyValueCatalogKey: 'DOCUMENT_TYPE',
  keyValueCatalogValue: 'INE',
  keyValueCatalogDescription: 'Credencial INE',
  status: StatusEnum.POR_VALIDAR,
  statusDescription: null,
  bucketName: 'bucket',
  objectKey: 'key',
  originalFilename: 'ine.pdf',
  preCandidatoId: 7,
  createdDate: '2026-01-01T00:00:00',
}

const documentTypes = [
  {
    id: 1,
    key: 'DOCUMENT_TYPE',
    value: 'INE',
    type: 'DOCUMENT_TYPE',
    description: 'Credencial INE',
    createdDate: '2026-01-01T00:00:00',
  },
]

const sixDocumentTypes = ['INE', 'CURP', 'RFC', 'COMPROBANTE', 'DOMICILIO', 'FOTO'].map(
  (value, index) => ({
    id: index + 1,
    key: 'DOCUMENT_TYPE',
    value,
    type: 'DOCUMENT_TYPE',
    description: value,
    createdDate: '2026-01-01T00:00:00',
  })
)

// C4 (variación task-api-06): "FORMATO DE DECLARACION APP" SIN tilde
const generatedDocumentTypes = ['CV PUBLICO APP.pdf', 'FOR CV PRIV NEW.pdf', 'FORMATO DE DECLARACION APP.pdf'].map(
  (value, index) => ({
    id: index + 10,
    key: 'GENERATED_DOCUMENT',
    value,
    type: 'GENERATED_DOCUMENT',
    description: value.replace(/\.pdf$/, ''),
    createdDate: '2026-01-01T00:00:00',
  })
)

async function renderAndExpand(
  props: Partial<ComponentProps<typeof PrecandidatosTable>> = {}
) {
  render(
    <PrecandidatosTable
      folioId={1}
      demarcacionName="ASIENTOS"
      demarcacionStatus={StatusEnum.VALIDO}
      {...props}
    />
  )

  const [expandButton] = await screen.findAllByRole('button')
  if (!expandButton) throw new Error('Expand button not found')
  fireEvent.click(expandButton)

  await waitFor(() => expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalled())
}

async function renderTable(props: Partial<ComponentProps<typeof PrecandidatosTable>> = {}) {
  render(
    <PrecandidatosTable
      folioId={1}
      demarcacionName="ASIENTOS"
      demarcacionStatus={StatusEnum.VALIDO}
      {...props}
    />
  )
  await screen.findByText('Docs Válidos')
}

function getHeaderPositions() {
  const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent)
  return {
    calidad: headers.indexOf('Calidad'),
    docsValidos: headers.indexOf('Docs Válidos'),
    claveIne: headers.indexOf('Clave INE'),
  }
}

describe('PrecandidatosTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'VALIDATOR' } })
    mocks.getPrecandidatos.mockResolvedValue([precandidato])
    mocks.getDocumentTypes.mockResolvedValue(documentTypes)
    mocks.getDocumentsByPrecandidato.mockResolvedValue([documentFixture])
    mocks.updateDocumentStatus.mockResolvedValue({
      ...documentFixture,
      status: StatusEnum.VALIDO,
      statusDescription: 'OK',
    })
  })

  it('keeps upload controls and hides validation controls when allowDocValidation is false', async () => {
    await renderAndExpand({ allowDocActions: true, allowDocValidation: false })

    await screen.findByText('Tipo')
    expect(screen.getAllByText('Subir').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Eliminar').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Validar')).toHaveLength(0)
    expect(screen.queryAllByText('Comentario')).toHaveLength(0)
    expect(screen.queryAllByText('Acciones')).toHaveLength(0)
  })

  it('shows the validation controls and hides upload controls when allowDocValidation is true', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    await screen.findByText('Tipo')
    expect(screen.getAllByText('Validar').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Comentario').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Acciones').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Subir')).toHaveLength(0)
    expect(screen.queryAllByText('Eliminar')).toHaveLength(0)
  })

  it('expands the precandidato when only allowDocValidation is set (expansion fix)', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalledWith(7)
    expect(screen.getByText('ine.pdf')).toBeInTheDocument()
  })

  it('saves the status with the comment through updateDocumentStatus', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    const saveButton = screen.getByRole('button', { name: 'Guardar' })
    expect(saveButton).toBeDisabled()

    fireEvent.mouseDown(screen.getByLabelText('Validar'))
    fireEvent.click(await screen.findByRole('option', { name: 'Válido' }))

    fireEvent.change(screen.getByPlaceholderText('Comentario...'), {
      target: { value: 'Documentación correcta' },
    })

    const enabledSave = screen.getByRole('button', { name: 'Guardar' })
    expect(enabledSave).toBeEnabled()

    fireEvent.click(enabledSave)

    await waitFor(() => {
      expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(10, {
        status: StatusEnum.VALIDO,
        statusDescription: 'Documentación correcta',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Documento actualizado correctamente')).toBeInTheDocument()
    })
  })

  it('shows an error message when the documents cannot be loaded', async () => {
    mocks.getDocumentsByPrecandidato.mockRejectedValue({ message: 'Prohibido', status: 403 })

    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(
      await screen.findByText('No se pudieron cargar los documentos')
    ).toBeInTheDocument()
    expect(mocks.updateDocumentStatus).not.toHaveBeenCalled()
  })
})

describe('PrecandidatosTable - Docs Válidos column', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'VALIDATOR' } })
    mocks.getPrecandidatos.mockResolvedValue([precandidato])
    mocks.getDocumentTypes.mockResolvedValue(documentTypes)
    mocks.getDocumentsByPrecandidato.mockResolvedValue([documentFixture])
    mocks.updateDocumentStatus.mockResolvedValue({
      ...documentFixture,
      status: StatusEnum.VALIDO,
      statusDescription: 'OK',
    })
  })

  it('places the Docs Válidos header between Calidad and Clave INE in excel mode', async () => {
    await renderTable()

    const { calidad, docsValidos, claveIne } = getHeaderPositions()
    expect(calidad).toBeGreaterThan(-1)
    expect(docsValidos).toBe(calidad + 1)
    expect(claveIne).toBe(docsValidos + 1)

    const bodyRow = screen.getAllByRole('row')[1]
    if (!bodyRow) throw new Error('Body row not found')
    const texts = within(bodyRow)
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(texts.indexOf('0 / 1')).toBe(texts.indexOf('Titular') + 1)
    expect(texts.indexOf('00000000000000')).toBe(texts.indexOf('0 / 1') + 1)
  })

  it('places the Docs Válidos header between Calidad and Clave INE in detail mode', async () => {
    await renderTable({ mode: 'detail' })

    const { calidad, docsValidos, claveIne } = getHeaderPositions()
    expect(calidad).toBeGreaterThan(-1)
    expect(docsValidos).toBe(calidad + 1)
    expect(claveIne).toBe(docsValidos + 1)
  })

  it('renders the partial format 3 / 6 with a yellow cell', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 3 }])

    await renderTable()

    const cell = screen.getByText('3 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#FFD100', color: '#000000' })
  })

  it('renders 6 / 6 with a green cell when every document is valid', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 6 }])

    await renderTable()

    const cell = screen.getByText('6 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#4CAF50', color: '#FFFFFF' })
  })

  it('renders 0 / 6 with a gray cell when there are no valid documents', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 0 }])

    await renderTable()

    const cell = screen.getByText('0 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#E0E0E0', color: '#757575' })
  })

  it('falls back to 0 / 6 in gray when validDocsCount is absent from the backend', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)

    await renderTable()

    const cell = screen.getByText('0 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#E0E0E0', color: '#757575' })
  })

  it('renders 0 / 0 in gray when the document type catalog is empty', async () => {
    mocks.getDocumentTypes.mockResolvedValue([])
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 0 }])

    await renderTable()

    const cell = screen.getByText('0 / 0')
    expect(cell).toHaveStyle({ backgroundColor: '#E0E0E0', color: '#757575' })
  })

  it('refetches precandidatos after validating a document', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })
    expect(mocks.getPrecandidatos).toHaveBeenCalledTimes(1)

    fireEvent.mouseDown(screen.getByLabelText('Validar'))
    fireEvent.click(await screen.findByRole('option', { name: 'Válido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(mocks.getPrecandidatos).toHaveBeenCalledTimes(2))
  })

  it('refetches precandidatos after deleting a document', async () => {
    await renderAndExpand({ allowDocActions: true, allowDocValidation: false })
    expect(mocks.getPrecandidatos).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(mocks.getPrecandidatos).toHaveBeenCalledTimes(2))
  })
})

describe('PrecandidatosTable - agrupación Documentos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'VALIDATOR' } })
    mocks.getPrecandidatos.mockResolvedValue([precandidato])
    mocks.getDocumentTypes.mockResolvedValue(documentTypes)
    mocks.getGeneratedDocumentTypes.mockResolvedValue(generatedDocumentTypes)
    mocks.getDocumentsByPrecandidato.mockResolvedValue([documentFixture])
    mocks.updateDocumentStatus.mockResolvedValue({
      ...documentFixture,
      status: StatusEnum.VALIDO,
      statusDescription: 'OK',
    })
  })

  async function renderGroupedAndExpand(
    props: Partial<ComponentProps<typeof PrecandidatosTable>> = {}
  ) {
    render(
      <PrecandidatosTable
        folioId={1}
        demarcacionName="ASIENTOS"
        demarcacionStatus={StatusEnum.VALIDO}
        groupDocuments
        {...props}
      />
    )

    const [expandButton] = await screen.findAllByRole('button')
    if (!expandButton) throw new Error('Expand button not found')
    fireEvent.click(expandButton)

    await waitFor(() => expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalled())
  }

  it('shows the Documentos wrapper with the two group rows', async () => {
    await renderGroupedAndExpand()

    expect(await screen.findByRole('columnheader', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.getByText('Documentos por validar')).toBeInTheDocument()
    expect(screen.getByText('Documentos por firmar y validar')).toBeInTheDocument()
    expect(screen.queryByText('Tipo')).not.toBeInTheDocument()
  })

  it('renders the current documents table only after expanding the "por validar" row', async () => {
    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    await screen.findByRole('columnheader', { name: 'Documentos' })
    expect(screen.queryByText('Tipo')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expandir Documentos por validar' }))

    expect(await screen.findByText('Tipo')).toBeInTheDocument()
    expect(screen.getByText('ine.pdf')).toBeInTheDocument()
    expect(screen.getAllByText('Subir').length).toBeGreaterThan(0)
    expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalledTimes(1)
  })

  it('keeps the sign row locked while a document is not VALIDO', async () => {
    await renderGroupedAndExpand({ allowDocActions: false, allowDocValidation: true })

    const signButton = await screen.findByRole('button', {
      name: 'Expandir Documentos por firmar y validar',
    })
    expect(signButton).toBeDisabled()

    fireEvent.click(signButton)

    expect(mocks.getGeneratedDocumentTypes).not.toHaveBeenCalled()
    expect(screen.queryByText('Descargar para firmar')).not.toBeInTheDocument()
  })

  it('keeps the sign row locked when a catalog row has no document uploaded', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([])

    await renderGroupedAndExpand({ allowDocActions: false, allowDocValidation: true })

    const signButton = await screen.findByRole('button', {
      name: 'Expandir Documentos por firmar y validar',
    })
    expect(signButton).toBeDisabled()

    fireEvent.click(signButton)

    expect(mocks.getGeneratedDocumentTypes).not.toHaveBeenCalled()
  })

  it('unlocks the sign row when every document is VALIDO and loads the generated catalog lazily', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([
      { ...documentFixture, status: StatusEnum.VALIDO },
    ])

    await renderGroupedAndExpand({ allowDocActions: false, allowDocValidation: true })

    const signButton = await screen.findByRole('button', {
      name: 'Expandir Documentos por firmar y validar',
    })
    expect(signButton).toBeEnabled()
    expect(mocks.getGeneratedDocumentTypes).not.toHaveBeenCalled()

    fireEvent.click(signButton)

    await waitFor(() => expect(mocks.getGeneratedDocumentTypes).toHaveBeenCalledTimes(1))
    expect(
      await screen.findByRole('columnheader', { name: 'Descargar para firmar' })
    ).toBeInTheDocument()
    expect(screen.getByText('FORMATO DE DECLARACION APP.pdf')).toBeInTheDocument()
    // la tabla "por validar" sigue colapsada (se mueve, no se duplica)
    expect(screen.queryByText('ine.pdf')).not.toBeInTheDocument()
  })

  it('shows the not implemented message when pressing "Descargar y firmar"', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([
      { ...documentFixture, status: StatusEnum.VALIDO },
    ])

    await renderGroupedAndExpand({ allowDocActions: false, allowDocValidation: true })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Expandir Documentos por firmar y validar' })
    )
    await screen.findByRole('columnheader', { name: 'Descargar para firmar' })

    const downloadButtons = screen.getAllByRole('button', { name: 'Descargar y firmar' })
    const [downloadButton] = downloadButtons
    if (!downloadButton) throw new Error('Download button not found')
    expect(downloadButton).toBeEnabled()

    fireEvent.click(downloadButton)

    expect(await screen.findByText('funcionalidad no implementada')).toBeInTheDocument()
    // sin llamadas HTTP nuevas al pulsar el botón
    expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalledTimes(1)
    expect(mocks.updateDocumentStatus).not.toHaveBeenCalled()
    expect(mocks.uploadDocument).not.toHaveBeenCalled()
    expect(mocks.deleteDocument).not.toHaveBeenCalled()
  })

  it('keeps the legacy layout when groupDocuments is not set', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(await screen.findByText('Tipo')).toBeInTheDocument()
    expect(screen.queryByText('Documentos por validar')).not.toBeInTheDocument()
    expect(screen.queryByText('Documentos por firmar y validar')).not.toBeInTheDocument()
    expect(mocks.getGeneratedDocumentTypes).not.toHaveBeenCalled()
  })

  it('uploads from the sign row with catalogKey GENERATED_DOCUMENT (C4.1)', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([
      { ...documentFixture, status: StatusEnum.VALIDO },
    ])

    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Expandir Documentos por firmar y validar' })
    )
    await screen.findByRole('columnheader', { name: 'Descargar para firmar' })

    const rowElement = screen.getByText('CV PUBLICO APP.pdf').closest('tr')
    if (!rowElement) throw new Error('Generated document row not found')
    const input = rowElement.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found')

    const file = new File(['content'], 'cv.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(mocks.uploadDocument).toHaveBeenCalledWith(
        7,
        'CV PUBLICO APP.pdf',
        file,
        'GENERATED_DOCUMENT'
      )
    )
  })

  it('uploads from the validate row without catalogKey (C4.1 regression)', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([])

    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    fireEvent.click(screen.getByRole('button', { name: 'Expandir Documentos por validar' }))
    await screen.findByText('Tipo')

    const rowElement = screen.getByText('INE').closest('tr')
    if (!rowElement) throw new Error('Document row not found')
    const input = rowElement.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found')

    const file = new File(['content'], 'ine.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(mocks.uploadDocument).toHaveBeenCalledWith(7, 'INE', file, undefined)
    )
    const [,,, catalogKey] = mocks.uploadDocument.mock.calls[0] ?? []
    expect(catalogKey).toBeUndefined()
  })
})
