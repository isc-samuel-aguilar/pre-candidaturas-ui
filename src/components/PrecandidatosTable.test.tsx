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
  uploadDocument: mocks.uploadDocument,
  deleteDocument: mocks.deleteDocument,
  downloadDocumentFile: mocks.downloadDocumentFile,
  updateDocumentStatus: mocks.updateDocumentStatus,
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
