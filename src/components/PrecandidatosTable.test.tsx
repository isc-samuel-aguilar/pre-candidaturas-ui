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
  generateDocumentForSign: vi.fn(),
  updateDocumentStatus: vi.fn(),
  compressImage: vi.fn(),
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
  generateDocumentForSign: mocks.generateDocumentForSign,
  // mismo mapa que documentService.DOCUMENT_DISPLAY_NAMES (task-ui-21)
  getDocumentDisplayName: (value: string) =>
    (
      {
        'FORMATO DECL PATRI': 'FORMATO DE DECLARACION APP.pdf',
        'CV PRIV': 'CV PRIVADO APP.pdf',
        'CV PUB': 'CV PUBLICO APP.pdf',
      } as Record<string, string>
    )[value] ?? value,
  updateDocumentStatus: mocks.updateDocumentStatus,
  // mismo valor que documentService.GENERATABLE_DOCUMENT_TYPES (C14)
  GENERATABLE_DOCUMENT_TYPES: {
    'CV PUB': 'CV_PUBLICO_APP',
    'CV PRIV': 'CV_PRIVADO_APP',
    'FORMATO DECL PATRI': 'FORMATO_DE_DECLARACION_APP',
  } as Record<string, string>,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

// compressImage se mockea para poder asertar la conversion a JPG sin canvas en jsdom
vi.mock('../utils/fileUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/fileUtils')>()
  return { ...actual, compressImage: mocks.compressImage }
})

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
  homoclave: 'LORM880101AA1',
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

// Catalogo DOCUMENT_TYPE real (data.sql): 3 de subida + 3 firmables
const fullDocumentTypes = [
  'INE',
  'ACTA',
  'FOTO',
  'FORMATO DECL PATRI',
  'CV PRIV',
  'CV PUB',
].map((value, index) => ({
  id: index + 10,
  key: 'DOCUMENT_TYPE',
  value,
  type: 'DOCUMENT_TYPE',
  description: value,
  createdDate: '2026-01-01T00:00:00',
}))

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
  }, 10000)

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
    expect(texts.indexOf('— / 0 / 1')).toBe(texts.indexOf('Titular') + 1)
    expect(texts.indexOf('00000000000000')).toBe(texts.indexOf('— / 0 / 1') + 1)
  })

  it('places the Docs Válidos header between Calidad and Clave INE in detail mode', async () => {
    await renderTable({ mode: 'detail' })

    const { calidad, docsValidos, claveIne } = getHeaderPositions()
    expect(calidad).toBeGreaterThan(-1)
    expect(docsValidos).toBe(calidad + 1)
    expect(claveIne).toBe(docsValidos + 1)
  })

  it('renders the fallback format — / 3 / 6 with a yellow cell', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 3 }])

    await renderTable()

    const cell = screen.getByText('— / 3 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#FFD100', color: '#000000' })
  })

  it('renders 4 / 3 / 6 with a yellow cell when loadedDocsCount is present', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([
      { ...precandidato, validDocsCount: 3, loadedDocsCount: 4 },
    ])

    await renderTable()

    const cell = screen.getByText('4 / 3 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#FFD100', color: '#000000' })
  })

  it('renders 0 / 0 / 6 in gray when nothing is loaded and nothing is valid', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([
      { ...precandidato, validDocsCount: 0, loadedDocsCount: 0 },
    ])

    await renderTable()

    const cell = screen.getByText('0 / 0 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#E0E0E0', color: '#757575' })
  })

  it('renders the fallback format — / 6 / 6 with a green cell when every document is valid', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 6 }])

    await renderTable()

    const cell = screen.getByText('— / 6 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#4CAF50', color: '#FFFFFF' })
  })

  it('renders the fallback format — / 0 / 6 with a gray cell when there are no valid documents', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 0 }])

    await renderTable()

    const cell = screen.getByText('— / 0 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#E0E0E0', color: '#757575' })
  })

  it('falls back to — / 0 / 6 in gray when validDocsCount is absent from the backend', async () => {
    mocks.getDocumentTypes.mockResolvedValue(sixDocumentTypes)

    await renderTable()

    const cell = screen.getByText('— / 0 / 6')
    expect(cell).toHaveStyle({ backgroundColor: '#E0E0E0', color: '#757575' })
  })

  it('renders the fallback format — / 0 / 0 in gray when the document type catalog is empty', async () => {
    mocks.getDocumentTypes.mockResolvedValue([])
    mocks.getPrecandidatos.mockResolvedValue([{ ...precandidato, validDocsCount: 0 }])

    await renderTable()

    const cell = screen.getByText('— / 0 / 0')
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
    mocks.getDocumentTypes.mockResolvedValue(fullDocumentTypes)
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

  it('shows both document sections right after expanding the precandidato', async () => {
    await renderGroupedAndExpand()

    expect(screen.queryByRole('columnheader', { name: 'Documentos' })).not.toBeInTheDocument()
    expect(screen.getByText('Archivos para subir')).toBeInTheDocument()
    expect(screen.getByText('Documentos por firmar y validar')).toBeInTheDocument()
    expect(await screen.findAllByRole('columnheader', { name: 'Tipo' })).toHaveLength(2)
    expect(
      await screen.findByRole('columnheader', { name: 'Descargar para firmar' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Expandir Documentos/ })
    ).not.toBeInTheDocument()
  })

  it('splits the six document types between the two sections', async () => {
    await renderGroupedAndExpand()

    for (const type of ['INE', 'ACTA', 'FOTO']) {
      expect(screen.getByText(type)).toBeInTheDocument()
    }
    for (const name of [
      'FORMATO DE DECLARACION APP.pdf',
      'CV PRIVADO APP.pdf',
      'CV PUBLICO APP.pdf',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.queryByText('CV PUB')).not.toBeInTheDocument()
    expect(screen.queryByText('CV PRIV')).not.toBeInTheDocument()
    expect(screen.queryByText('FORMATO DECL PATRI')).not.toBeInTheDocument()
  })

  it('shows the sign section even when no document is VALIDO', async () => {
    await renderGroupedAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(await screen.findAllByRole('button', { name: 'Descargar y firmar' })).toHaveLength(3)
    expect(
      await screen.findByRole('columnheader', { name: 'Descargar para firmar' })
    ).toBeInTheDocument()
  })

  it('never renders a Generar column', async () => {
    await renderGroupedAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(screen.queryByRole('columnheader', { name: 'Generar' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: 'Generar' })).toHaveLength(0)
  })

  it('keeps the legacy layout when groupDocuments is not set', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(await screen.findByText('Tipo')).toBeInTheDocument()
    expect(screen.queryByText('Archivos para subir')).not.toBeInTheDocument()
    expect(screen.queryByText('Documentos por firmar y validar')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Expandir Documentos/ })
    ).not.toBeInTheDocument()
  })

  async function getSectionTables() {
    const signHeader = await screen.findByRole('columnheader', {
      name: 'Descargar para firmar',
    })
    const signTable = signHeader.closest('table')
    const tipoHeaders = screen.getAllByRole('columnheader', { name: 'Tipo' })
    const validateHeader = tipoHeaders.find((header) => header.closest('table') !== signTable)
    const validateTable = validateHeader?.closest('table')
    if (!signTable || !validateTable) throw new Error('Section tables not found')
    return { signTable, validateTable }
  }

  function headerNames(table: HTMLElement) {
    return within(table).getAllByRole('columnheader').map((cell) => cell.textContent)
  }

  function colWidths(table: Element) {
    return Array.from(table.querySelectorAll('col')).map(
      (col) => (col as HTMLElement).style.width
    )
  }

  function firstBodyCellTexts(table: HTMLElement) {
    const row = (table as HTMLTableElement).tBodies[0]?.rows[0]
    if (!row) throw new Error('Body row not found')
    return Array.from(row.cells).map((cell) => cell.textContent?.trim() ?? '')
  }

  it('orders the columns Tipo, Subir, Nombre, Eliminar, Status in both sections', async () => {
    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    const { signTable, validateTable } = await getSectionTables()

    expect(headerNames(validateTable).slice(0, 5)).toEqual([
      'Tipo',
      'Subir',
      'Nombre',
      'Eliminar',
      'Status',
    ])
    expect(headerNames(signTable).slice(0, 6)).toEqual([
      'Tipo',
      'Descargar para firmar',
      'Subir',
      'Nombre',
      'Eliminar',
      'Status',
    ])
  })

  it('spans the validate Tipo cell over the Tipo and Descargar para firmar columns', async () => {
    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    const { signTable, validateTable } = await getSectionTables()

    const [validateTipo] = within(validateTable).getAllByRole('columnheader')
    expect(validateTipo).toHaveAttribute('colspan', '2')
    const [signTipo] = within(signTable).getAllByRole('columnheader')
    expect(signTipo).toHaveAttribute('colspan', '1')
  })

  it('keeps both section column grids identical so the columns align', async () => {
    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    const { signTable, validateTable } = await getSectionTables()

    expect(colWidths(validateTable)).toHaveLength(6)
    expect(colWidths(validateTable)).toEqual(colWidths(signTable))
    expect(colWidths(validateTable).every((width) => width.endsWith('%'))).toBe(true)
    expect(validateTable).toHaveStyle({ tableLayout: 'fixed', width: '100%' })
    expect(signTable).toHaveStyle({ tableLayout: 'fixed', width: '100%' })
  })

  it('places the Nombre cell right after Subir in the body of both sections', async () => {
    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    const { signTable, validateTable } = await getSectionTables()

    const validateCells = firstBodyCellTexts(validateTable)
    expect(validateCells[1]).toBe('Subir')
    expect(validateCells[3]).toBe('Eliminar')

    const signCells = firstBodyCellTexts(signTable)
    expect(signCells[2]).toBe('Subir')
    expect(signCells[4]).toBe('Eliminar')
  })


  it('uploads from the validate section without catalogKey (C4.1 regression)', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([])

    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    const rowElement = screen.getByText('INE').closest('tr')
    if (!rowElement) throw new Error('Document row not found')
    const input = rowElement.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found')

    const file = new File(['content'], 'ine.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocks.uploadDocument).toHaveBeenCalledWith(7, 'INE', file))
  })

  it('uploads from the sign section with the raw catalog type and default catalogKey', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([])

    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    const rowElement = screen.getByText('CV PUBLICO APP.pdf').closest('tr')
    if (!rowElement) throw new Error('Sign document row not found')
    const input = rowElement.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found')

    const file = new File(['content'], 'cv.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocks.uploadDocument).toHaveBeenCalledWith(7, 'CV PUB', file))
  })

  it('compresses images to JPG before uploading', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue([])
    const compressed = new File(['jpeg-bytes'], 'ine.jpg', { type: 'image/jpeg' })
    mocks.compressImage.mockResolvedValue(compressed)

    await renderGroupedAndExpand({ allowDocActions: true, allowDocValidation: false })

    const rowElement = screen.getByText('INE').closest('tr')
    if (!rowElement) throw new Error('Document row not found')
    const input = rowElement.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('File input not found')

    const file = new File(['png-bytes'], 'ine.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocks.compressImage).toHaveBeenCalledWith(file))
    await waitFor(() => expect(mocks.uploadDocument).toHaveBeenCalled())

    // File no es comparable por igualdad estructural en jsdom: se asierten propiedades
    expect(mocks.uploadDocument).toHaveBeenCalledTimes(1)
    const [preCandidatoId, docType, uploaded] = mocks.uploadDocument.mock.calls[0] ?? []
    expect(preCandidatoId).toBe(7)
    expect(docType).toBe('INE')
    expect((uploaded as File).type).toBe('image/jpeg')
    expect((uploaded as File).name).toBe('ine.jpg')
  })

  it('offers the download of the uploaded file on the six rows', async () => {
    mocks.getDocumentsByPrecandidato.mockResolvedValue(
      fullDocumentTypes.map((type, index) => ({
        ...documentFixture,
        id: 400 + index,
        keyValueCatalogValue: type.value,
        originalFilename: `${type.value}.pdf`,
      }))
    )

    await renderGroupedAndExpand()

    const fileButtons = await screen.findAllByRole('button', { name: /\.pdf$/ })
    expect(fileButtons).toHaveLength(6)

    const [firstFileButton] = fileButtons
    if (!firstFileButton) throw new Error('File download button not found')
    fireEvent.click(firstFileButton)

    expect(mocks.downloadDocumentFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalFilename: 'INE.pdf' }),
      'token'
    )
  })
})

describe('PrecandidatosTable - secciones de documentos visibles por defecto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPrecandidatos.mockResolvedValue([precandidato])
    mocks.getDocumentTypes.mockResolvedValue(fullDocumentTypes)
  })

  async function renderGroupedAndExpand() {
    render(
      <PrecandidatosTable
        folioId={1}
        demarcacionName="ASIENTOS"
        demarcacionStatus={StatusEnum.VALIDO}
        groupDocuments
        allowDocActions={false}
        allowDocValidation
      />
    )

    const [expandButton] = await screen.findAllByRole('button')
    if (!expandButton) throw new Error('Expand button not found')
    fireEvent.click(expandButton)

    await waitFor(() => expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalled())
  }

  it('shows both sections for REGISTER when documents are incomplete', async () => {
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'REGISTER' } })
    mocks.getDocumentsByPrecandidato.mockResolvedValue([documentFixture])

    await renderGroupedAndExpand()

    expect(await screen.findByText('ine.pdf')).toBeInTheDocument()
    expect(screen.getByText('Archivos para subir')).toBeInTheDocument()
    expect(screen.getByText('Documentos por firmar y validar')).toBeInTheDocument()
    expect(await screen.findAllByRole('columnheader', { name: 'Tipo' })).toHaveLength(2)
  })

  it('shows both sections for REGISTER when every document is VALIDO', async () => {
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'REGISTER' } })
    mocks.getDocumentsByPrecandidato.mockResolvedValue([
      { ...documentFixture, status: StatusEnum.VALIDO },
    ])

    await renderGroupedAndExpand()

    expect(await screen.findAllByRole('columnheader', { name: 'Tipo' })).toHaveLength(2)
    expect(screen.getByText('Documentos por firmar y validar')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Expandir Documentos/ })
    ).not.toBeInTheDocument()
  })

  it('shows both sections for VALIDATOR even when documents are incomplete', async () => {
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'VALIDATOR' } })
    mocks.getDocumentsByPrecandidato.mockResolvedValue([documentFixture])

    await renderGroupedAndExpand()

    expect(await screen.findAllByRole('columnheader', { name: 'Tipo' })).toHaveLength(2)
    expect(
      await screen.findAllByRole('button', { name: 'Descargar y firmar' })
    ).toHaveLength(3)
  })
})

describe('PrecandidatosTable - columna Descargar para firmar', () => {
  const SIGN_ROWS: Array<[string, string]> = [
    ['FORMATO DE DECLARACION APP.pdf', 'FORMATO_DE_DECLARACION_APP'],
    ['CV PRIVADO APP.pdf', 'CV_PRIVADO_APP'],
    ['CV PUBLICO APP.pdf', 'CV_PUBLICO_APP'],
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'VALIDATOR' } })
    mocks.getPrecandidatos.mockResolvedValue([precandidato])
    mocks.getDocumentTypes.mockResolvedValue(fullDocumentTypes)
    mocks.getDocumentsByPrecandidato.mockResolvedValue([documentFixture])
    mocks.updateDocumentStatus.mockResolvedValue({
      ...documentFixture,
      status: StatusEnum.VALIDO,
      statusDescription: 'OK',
    })
  })

  async function renderGroupedAndExpandPrecandidato(
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
    await screen.findByRole('columnheader', { name: 'Descargar para firmar' })
  }

  function getRowFor(displayName: string): HTMLElement {
    const row = screen.getByText(displayName).closest('tr')
    if (!row) throw new Error(`Row for ${displayName} not found`)
    return row
  }

  function getSignButton(displayName: string): HTMLElement {
    return within(getRowFor(displayName)).getByRole('button', { name: 'Descargar y firmar' })
  }

  it('never renders a Generar header or button', async () => {
    await renderGroupedAndExpandPrecandidato()

    expect(screen.queryByRole('columnheader', { name: 'Generar' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: 'Generar' })).toHaveLength(0)
  })

  it('renders the Descargar para firmar column once, only in the sign section', async () => {
    await renderGroupedAndExpandPrecandidato()

    expect(
      screen.getAllByRole('columnheader', { name: 'Descargar para firmar' })
    ).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Descargar y firmar' })).toHaveLength(3)
  })

  it('does not render the sign button on the INE/ACTA/FOTO rows', async () => {
    await renderGroupedAndExpandPrecandidato()

    for (const type of ['INE', 'ACTA', 'FOTO']) {
      expect(
        within(getRowFor(type)).queryByRole('button', { name: 'Descargar y firmar' })
      ).not.toBeInTheDocument()
    }
  })

  it('calls generateDocumentForSign with the mapped template key on each click', async () => {
    mocks.generateDocumentForSign.mockResolvedValue(undefined)

    await renderGroupedAndExpandPrecandidato()

    for (const [displayName, templateKey] of SIGN_ROWS) {
      fireEvent.click(getSignButton(displayName))
      await waitFor(() => {
        expect(mocks.generateDocumentForSign).toHaveBeenCalledWith(7, templateKey, 'token')
      })
    }
  })

  it('disables the pressed button and shows a spinner while generating', async () => {
    const deferred: { resolve?: () => void } = {}
    mocks.generateDocumentForSign.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          deferred.resolve = resolve
        })
    )

    await renderGroupedAndExpandPrecandidato()

    expect(getSignButton('CV PUBLICO APP.pdf')).toBeEnabled()

    fireEvent.click(getSignButton('CV PUBLICO APP.pdf'))

    await waitFor(() => expect(getSignButton('CV PUBLICO APP.pdf')).toBeDisabled())
    expect(within(getRowFor('CV PUBLICO APP.pdf')).getByRole('progressbar')).toBeInTheDocument()
    // solo la fila presionada queda deshabilitada
    expect(getSignButton('CV PRIVADO APP.pdf')).toBeEnabled()
    expect(getSignButton('FORMATO DE DECLARACION APP.pdf')).toBeEnabled()

    deferred.resolve?.()

    await waitFor(() => expect(getSignButton('CV PUBLICO APP.pdf')).toBeEnabled())
    expect(await screen.findByText('Documento generado')).toBeInTheDocument()
  })

  it('shows the mapped backend error and re-enables the button when the download fails', async () => {
    mocks.generateDocumentForSign.mockRejectedValue({
      message: 'Plantilla no disponible para este documento',
      status: 400,
      error: 'TEMPLATE_NOT_FOUND',
    })

    await renderGroupedAndExpandPrecandidato()

    fireEvent.click(getSignButton('CV PUBLICO APP.pdf'))

    expect(
      await screen.findByText('Plantilla no disponible para este documento')
    ).toBeInTheDocument()
    expect(getSignButton('CV PUBLICO APP.pdf')).toBeEnabled()
  })

  it('grows the expanded content without an inner scroll (solo scroll general de la pagina)', async () => {
    await renderGroupedAndExpandPrecandidato()

    const container = document.querySelector('.MuiTableContainer-root') as HTMLElement | null
    expect(container).not.toBeNull()
    if (!container) throw new Error('TableContainer not found')
    expect(container.style.maxHeight).toBe('')
    expect(container).not.toHaveStyle({ maxHeight: '400px' })

    // ninguna cadena de ancestros limita la altura: el contenido crece y
    // el unico scroll de la app es el general de la pagina
    let node: Element | null = screen.getByText('Archivos para subir')
    let checked = 0
    while (node && node !== container) {
      const styles = window.getComputedStyle(node)
      expect(styles.maxHeight).not.toBe('60vh')
      expect(styles.overflowY).not.toBe('auto')
      checked += 1
      node = node.parentElement
    }
    expect(node).toBe(container)
    expect(checked).toBeGreaterThan(0)
  })
})
