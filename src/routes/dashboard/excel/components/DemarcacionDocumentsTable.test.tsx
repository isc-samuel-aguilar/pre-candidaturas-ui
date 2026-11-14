import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DemarcacionDocumentsTable } from './DemarcacionDocumentsTable'
import { StatusEnum } from '../../../../types/enums'
import type {
  DemarcacionStatus,
  DemarcationDocument,
  KeyValueCatalog,
} from '../../../../types/demarcacion'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getDemarcationDocumentTypes: vi.fn(),
  getDemarcationDocuments: vi.fn(),
  uploadDemarcationDocument: vi.fn(),
  updateDemarcationDocumentStatus: vi.fn(),
  deleteDemarcationDocument: vi.fn(),
  downloadDemarcationDocumentFile: vi.fn(),
  generateDemarcationDocument: vi.fn(),
  downloadGeneratedDemarcationDocument: vi.fn(),
}))

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('../../../../services/documentService', () => ({
  DEMARCATION_DOCUMENT_KEY: 'DOCUMENT_TYPE_DEMARCATION',
  getDemarcationDocumentTypes: mocks.getDemarcationDocumentTypes,
  getDemarcationDocuments: mocks.getDemarcationDocuments,
  uploadDemarcationDocument: mocks.uploadDemarcationDocument,
  updateDemarcationDocumentStatus: mocks.updateDemarcationDocumentStatus,
  deleteDemarcationDocument: mocks.deleteDemarcationDocument,
  downloadDemarcationDocumentFile: mocks.downloadDemarcationDocumentFile,
  generateDemarcationDocument: mocks.generateDemarcationDocument,
  downloadGeneratedDemarcationDocument: mocks.downloadGeneratedDemarcationDocument,
  toDocumentoKey: (value: string) =>
    value
      .replace(/\.pdf$/i, '')
      .replace(/[()]/g, '')
      .replace(/ /g, '_'),
}))

// C13: 3 filas sembradas por el backend (FUR -> Proyecto -> ACUSE)
const catalogTypes: KeyValueCatalog[] = [
  {
    id: 20,
    key: 'DOCUMENT_TYPE_DEMARCATION',
    value: 'FORMATO UNICO DE REGISTRO (FUR) APP.pdf',
    type: 'String',
    description: 'FORMATO UNICO DE REGISTRO (FUR) APP',
    createdDate: '2026-01-01T00:00:00',
  },
  {
    id: 21,
    key: 'DOCUMENT_TYPE_DEMARCATION',
    value: 'PROYECTO DE TRABAJO',
    type: 'String',
    description: 'PROYECTO DE TRABAJO',
    createdDate: '2026-01-01T00:00:00',
  },
  {
    id: 22,
    key: 'DOCUMENT_TYPE_DEMARCATION',
    value: 'ACUSE_DE_DOCUMENTOS.pdf',
    type: 'String',
    description: 'ACUSE_DE_DOCUMENTOS',
    createdDate: '2026-01-01T00:00:00',
  },
]

const furDocument: DemarcationDocument = {
  id: 30,
  folioDemarcacionId: 10,
  keyValueCatalogId: 20,
  keyValueCatalogKey: 'DOCUMENT_TYPE_DEMARCATION',
  keyValueCatalogValue: 'FORMATO UNICO DE REGISTRO (FUR) APP.pdf',
  keyValueCatalogDescription: 'FORMATO UNICO DE REGISTRO (FUR) APP',
  status: StatusEnum.VALIDO,
  statusDescription: null,
  bucketName: 'bucket',
  objectKey: 'folio-5/demarcacion-10/demarcacion-20-fur.pdf',
  originalFilename: 'fur-app.pdf',
  createdDate: '2026-01-01T00:00:00',
}

const proyDocument: DemarcationDocument = {
  id: 31,
  folioDemarcacionId: 10,
  keyValueCatalogId: 21,
  keyValueCatalogKey: 'DOCUMENT_TYPE_DEMARCATION',
  keyValueCatalogValue: 'PROYECTO DE TRABAJO',
  keyValueCatalogDescription: 'PROYECTO DE TRABAJO',
  status: StatusEnum.POR_VALIDAR,
  statusDescription: 'revisar',
  bucketName: 'bucket',
  objectKey: 'folio-5/demarcacion-10/demarcacion-21-proy.docx',
  originalFilename: 'proyecto.docx',
  createdDate: '2026-01-01T00:00:00',
}

interface RenderOptions {
  role?: string
  mode?: 'upload' | 'validate'
  demarcacionStatus?: DemarcacionStatus
  existingDocs?: DemarcationDocument[]
  documentTypes?: KeyValueCatalog[]
}

function renderTable({
  role = 'ADMIN',
  mode = 'upload',
  demarcacionStatus = StatusEnum.VALIDO,
  existingDocs = [],
  documentTypes = catalogTypes,
}: RenderOptions = {}) {
  mocks.useAuth.mockReturnValue({
    token: 'token123',
    user: { role, userId: 1, username: role.toLowerCase() },
  })
  mocks.getDemarcationDocumentTypes.mockResolvedValue(documentTypes)
  mocks.getDemarcationDocuments.mockResolvedValue(existingDocs)
  mocks.uploadDemarcationDocument.mockResolvedValue(furDocument)
  mocks.updateDemarcationDocumentStatus.mockResolvedValue(furDocument)
  mocks.deleteDemarcationDocument.mockResolvedValue(undefined)
  mocks.downloadDemarcationDocumentFile.mockResolvedValue(undefined)
  mocks.generateDemarcationDocument.mockResolvedValue(undefined)

  render(
    <DemarcacionDocumentsTable
      folioId={5}
      folioDemarcacionId={10}
      demarcacionStatus={demarcacionStatus}
      mode={mode}
    />
  )
}

describe('DemarcacionDocumentsTable - fusión catálogo + documentos reales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one row per catalog type with merged documents', async () => {
    renderTable({ existingDocs: [furDocument, proyDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    // header + 3 catalog rows
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByText('FORMATO UNICO DE REGISTRO (FUR) APP.pdf')).toBeInTheDocument()
    expect(within(table).getByText('PROYECTO DE TRABAJO')).toBeInTheDocument()
    // Tipo es link con el nombre del catálogo; la columna "Descargar y/o Firmar"
    // muestra "Descargar" en PROYECTO y ACUSE y "Descargar y firmar" en el FUR
    expect(
      within(table).getAllByText('ACUSE_DE_DOCUMENTOS.pdf')
    ).toHaveLength(1)
    expect(within(table).getAllByRole('button', { name: 'Descargar' })).toHaveLength(2)
    expect(
      within(table).getByRole('button', { name: 'Descargar y firmar' })
    ).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'fur-app.pdf' })).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'proyecto.docx' })).toBeInTheDocument()
  })

  it('shows "Sin Cargar" only when there is no persisted document', async () => {
    renderTable({ existingDocs: [furDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    expect(within(table).getAllByText('Sin Cargar')).toHaveLength(1)
  })

  it('shows the real status chip for persisted documents', async () => {
    renderTable({ existingDocs: [furDocument, proyDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    expect(within(table).getByText('Válido')).toBeInTheDocument()
    expect(within(table).getByText('Por Validar')).toBeInTheDocument()
  })

  it('shows upload headers with the download/sign column after Tipo', async () => {
    renderTable({ mode: 'upload' })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual([
      'Tipo',
      'Descargar y/o Firmar',
      'Nombre',
      'Subir',
      'Eliminar',
      'Status',
    ])
  })

  it('shows validation headers with the download/sign column after Tipo', async () => {
    renderTable({ mode: 'validate' })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual([
      'Tipo',
      'Descargar y/o Firmar',
      'Nombre',
      'Status',
      'Validar',
      'Comentario',
      'Acciones',
    ])
  })
})

describe('DemarcacionDocumentsTable - acciones por rol', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enables upload for ADMIN without file and disables delete without file', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const uploadButtons = within(table).getAllByRole('button', { name: 'Subir' })
    const deleteButtons = within(table).getAllByRole('button', { name: 'Eliminar' })
    const generateButtons = within(table).getAllByRole('button', { name: 'Descargar y firmar' })

    uploadButtons.forEach((button) => expect(button).toBeEnabled())
    // no persisted document → Eliminar deshabilitado
    deleteButtons.forEach((button) => expect(button).toBeDisabled())
    // "Descargar y firmar" only on the FUR row
    expect(generateButtons).toHaveLength(1)
    generateButtons.forEach((button) => expect(button).toBeEnabled())
  })

  it('disables upload when the row already has a file and enables delete', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [furDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const uploadButtons = within(table).getAllByRole('button', { name: 'Subir' })
    const deleteButtons = within(table).getAllByRole('button', { name: 'Eliminar' })

    // fila FUR con archivo → Subir deshabilitado; fila OTRO sin archivo → habilitado
    expect(uploadButtons[0]).toBeDisabled()
    expect(uploadButtons[1]).toBeEnabled()
    expect(deleteButtons[0]).toBeEnabled()
    expect(deleteButtons[1]).toBeDisabled()
  })

  it('disables upload and enables validate/generate for VALIDATOR', async () => {
    renderTable({ role: 'VALIDATOR', mode: 'validate', existingDocs: [furDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const generateButtons = within(table).getAllByRole('button', { name: 'Descargar y firmar' })
    const saveButtons = within(table).getAllByRole('button', { name: 'Guardar' })
    const cancelButtons = within(table).getAllByRole('button', { name: 'Cancelar' })

    // VALIDATOR has no Subir/Eliminar columns in validate mode; "Descargar y firmar" enabled
    expect(generateButtons).toHaveLength(1)
    expect(generateButtons[0]).toBeEnabled()
    // save starts disabled until dirty
    saveButtons.forEach((button) => expect(button).toBeDisabled())
    cancelButtons.forEach((button) => expect(button).toBeDisabled())

    // select a status and enable save
    const [select] = within(table).getAllByLabelText('Validar')
    if (!select) throw new Error('Validar select not found')
    fireEvent.mouseDown(select)
    const option = await screen.findByRole('option', { name: 'Error' })
    fireEvent.click(option)

    await waitFor(() => {
      const [saveButton] = within(table).getAllByRole('button', { name: 'Guardar' })
      expect(saveButton).toBeEnabled()
    })
  })

  it('enables generate for REGISTER when the demarcation is valid', async () => {
    renderTable({ role: 'REGISTER', mode: 'upload', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const uploadButtons = within(table).getAllByRole('button', { name: 'Subir' })
    const deleteButtons = within(table).getAllByRole('button', { name: 'Eliminar' })
    const generateButtons = within(table).getAllByRole('button', { name: 'Descargar y firmar' })

    uploadButtons.forEach((button) => expect(button).toBeEnabled())
    deleteButtons.forEach((button) => expect(button).toBeDisabled())
    // REGISTER can generate once the demarcation is VALIDA
    expect(generateButtons).toHaveLength(1)
    generateButtons.forEach((button) => expect(button).toBeEnabled())
  })

  it('enables delete for REGISTER when the row has a file', async () => {
    renderTable({ role: 'REGISTER', mode: 'upload', existingDocs: [furDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const deleteButtons = within(table).getAllByRole('button', { name: 'Eliminar' })

    expect(deleteButtons[0]).toBeEnabled()
    expect(deleteButtons[1]).toBeDisabled()
  })
})

describe('DemarcacionDocumentsTable - gate de status de la demarcación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables upload when the demarcation is not VALIDA', async () => {
    renderTable({
      role: 'ADMIN',
      demarcacionStatus: StatusEnum.POR_VALIDAR,
      existingDocs: [],
    })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const uploadButtons = within(table).getAllByRole('button', { name: 'Subir' })
    uploadButtons.forEach((button) => expect(button).toBeDisabled())
  })

  it('disables validate when the demarcation is not VALIDA', async () => {
    renderTable({
      role: 'VALIDATOR',
      mode: 'validate',
      demarcacionStatus: StatusEnum.ERROR,
      existingDocs: [furDocument],
    })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const selects = within(table).getAllByLabelText('Validar')
    // MUI Select disabled: aria-disabled en el combobox (el disabled va al input oculto)
    selects.forEach((select) => expect(select).toHaveAttribute('aria-disabled', 'true'))
  })

  it('hides generate when the demarcation is not valid', async () => {
    renderTable({
      role: 'ADMIN',
      demarcacionStatus: StatusEnum.POR_VALIDAR,
      existingDocs: [],
    })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const generateButtons = within(table).queryAllByRole('button', { name: 'Descargar y firmar' })
    expect(generateButtons).toHaveLength(0)
    // Tipo on the FUR row is plain text too (no generate without a valid demarcation)
    const tipoText = within(table).getByText('FORMATO UNICO DE REGISTRO (FUR) APP.pdf')
    expect(tipoText.closest('button')).toBeNull()
  })
})

describe('DemarcacionDocumentsTable - generación y descarga', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls generateDemarcationDocument with the FUR key for the FUR row only', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const generateButton = within(table).getByRole('button', { name: 'Descargar y firmar' })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mocks.generateDemarcationDocument).toHaveBeenCalledWith(
        5,
        10,
        'FORMATO_UNICO_DE_REGISTRO_FUR_APP',
        'token123'
      )
    })
  })

  it('shows a spinner while the generation request is in flight', async () => {
    let resolveGenerate: (() => void) | undefined
    mocks.generateDemarcationDocument.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveGenerate = resolve
        })
    )

    renderTable({ role: 'ADMIN', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const generateButton = within(table).getByRole('button', { name: 'Descargar y firmar' })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(within(table).getAllByRole('progressbar').length).toBeGreaterThan(0)
    })

    resolveGenerate?.()
    await waitFor(() => {
      expect(within(table).queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  it('tipo click on FUR row calls generateDemarcationDocument', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const tipoButton = within(table).getByRole('button', {
      name: 'FORMATO UNICO DE REGISTRO (FUR) APP.pdf',
    })
    fireEvent.click(tipoButton)

    await waitFor(() => {
      expect(mocks.generateDemarcationDocument).toHaveBeenCalledWith(
        5,
        10,
        'FORMATO_UNICO_DE_REGISTRO_FUR_APP',
        'token123'
      )
    })
    expect(mocks.downloadDemarcationDocumentFile).not.toHaveBeenCalled()
  })

  it('tipo click on row with file calls download', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [furDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const tipoButton = within(table).getByRole('button', {
      name: 'FORMATO UNICO DE REGISTRO (FUR) APP.pdf',
    })
    fireEvent.click(tipoButton)

    await waitFor(() => {
      expect(mocks.downloadDemarcationDocumentFile).toHaveBeenCalledWith(
        5,
        10,
        furDocument,
        'token123'
      )
    })
    expect(mocks.generateDemarcationDocument).not.toHaveBeenCalled()
  })

  it('tipo is plain when no file and not FUR', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const plainTipo = within(table).getByText('PROYECTO DE TRABAJO')
    expect(plainTipo.closest('button')).toBeNull()

    fireEvent.click(plainTipo)
    expect(mocks.downloadDemarcationDocumentFile).not.toHaveBeenCalled()
    expect(mocks.generateDemarcationDocument).not.toHaveBeenCalled()
  })

  it('downloads the uploaded file from the Nombre link', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [furDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    fireEvent.click(within(table).getByRole('button', { name: 'fur-app.pdf' }))

    await waitFor(() => {
      expect(mocks.downloadDemarcationDocumentFile).toHaveBeenCalledWith(
        5,
        10,
        furDocument,
        'token123'
      )
    })
  })

  it('downloads the uploaded work project file from the Descargar y/o Firmar column', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [proyDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const rows = within(table).getAllByRole('row')
    const proyRow = rows.find(
      (row) => within(row).queryAllByText('PROYECTO DE TRABAJO').length > 0
    )
    if (!proyRow) throw new Error('Proyecto row not found')

    fireEvent.click(within(proyRow).getByRole('button', { name: 'Descargar' }))

    await waitFor(() => {
      expect(mocks.downloadDemarcationDocumentFile).toHaveBeenCalledWith(
        5,
        10,
        proyDocument,
        'token123'
      )
    })
    expect(mocks.generateDemarcationDocument).not.toHaveBeenCalled()
  })

  it('deletes a persisted document', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [furDocument, proyDocument] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const [deleteButton] = within(table).getAllByRole('button', { name: 'Eliminar' })
    if (!deleteButton) throw new Error('Delete button not found')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mocks.deleteDemarcationDocument).toHaveBeenCalledWith(5, 10, 30)
    })
  })
})

describe('DemarcacionDocumentsTable - C13: filas PROYECTO DE TRABAJO y ACUSE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('work project row has no generate button and accepts office files', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')

    // "Descargar y firmar" solo en la fila FUR (PROY y ACUSE no generan)
    const generateButtons = within(table).getAllByRole('button', { name: 'Descargar y firmar' })
    expect(generateButtons).toHaveLength(1)

    // 2 inputs de archivo (FUR + PROY); el ACUSE no ofrece upload
    const inputs = Array.from(table.querySelectorAll('input[type="file"]'))
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png,.gif,.webp')
    expect(inputs[1]).toHaveAttribute(
      'accept',
      '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png'
    )

    // el input de PROY acepta un .docx
    const officeFile = new File(['content'], 'documento.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    fireEvent.change(inputs[1]!, { target: { files: [officeFile] } })

    await waitFor(() => {
      expect(mocks.uploadDemarcationDocument).toHaveBeenCalledWith(
        5,
        10,
        'PROYECTO DE TRABAJO',
        expect.any(File),
        'DOCUMENT_TYPE_DEMARCATION'
      )
    })
  })

  it('acuse row only offers download', async () => {
    renderTable({ role: 'ADMIN', existingDocs: [] })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const rows = within(table).getAllByRole('row')
    const acuseRow = rows.find(
      (row) => within(row).queryAllByText('ACUSE_DE_DOCUMENTOS.pdf').length > 0
    )
    if (!acuseRow) throw new Error('Acuse row not found')

    // sin Subir/Eliminar/Validar y sin chip "Sin Cargar"
    expect(within(acuseRow).queryByRole('button', { name: 'Subir' })).toBeNull()
    expect(within(acuseRow).queryByRole('button', { name: 'Eliminar' })).toBeNull()
    expect(within(acuseRow).queryByText('Sin Cargar')).toBeNull()

    // Tipo es link de descarga con el nombre del catálogo
    const tipoLink = within(acuseRow).getByRole('button', {
      name: 'ACUSE_DE_DOCUMENTOS.pdf',
    })

    // "Descargar y/o Firmar" es botón outlined "Descargar" (mismo formato que el FUR)
    const downloadButton = within(acuseRow).getByRole('button', { name: 'Descargar' })
    expect(downloadButton.className).toContain('MuiButton-outlined')
    expect(
      within(acuseRow).getAllByRole('button', { name: 'ACUSE_DE_DOCUMENTOS.pdf' })
    ).toHaveLength(1)

    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(mocks.downloadGeneratedDemarcationDocument).toHaveBeenCalledWith(
        5,
        10,
        'ACUSE_DE_DOCUMENTOS',
        'token123'
      )
    })
    expect(mocks.generateDemarcationDocument).not.toHaveBeenCalled()
    expect(mocks.downloadDemarcationDocumentFile).not.toHaveBeenCalled()

    fireEvent.click(tipoLink)

    await waitFor(() => {
      expect(mocks.downloadGeneratedDemarcationDocument).toHaveBeenCalledTimes(2)
    })
  })

  it('acuse download is available regardless of demarcation status', async () => {
    renderTable({
      role: 'ADMIN',
      demarcacionStatus: StatusEnum.POR_VALIDAR,
      existingDocs: [],
    })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const rows = within(table).getAllByRole('row')
    const acuseRow = rows.find(
      (row) => within(row).queryAllByText('ACUSE_DE_DOCUMENTOS.pdf').length > 0
    )
    if (!acuseRow) throw new Error('Acuse row not found')

    const tipoLink = within(acuseRow).getByRole('button', {
      name: 'ACUSE_DE_DOCUMENTOS.pdf',
    })
    expect(tipoLink).toBeEnabled()

    const downloadButton = within(acuseRow).getByRole('button', { name: 'Descargar' })
    expect(downloadButton).toBeEnabled()

    // la demarcación no válida sí oculta "Descargar y firmar" del FUR
    expect(within(table).queryByRole('button', { name: 'Descargar y firmar' })).toBeNull()

    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(mocks.downloadGeneratedDemarcationDocument).toHaveBeenCalledWith(
        5,
        10,
        'ACUSE_DE_DOCUMENTOS',
        'token123'
      )
    })
  })

  it('renders rows in FUR, work project, acuse order regardless of catalog order', async () => {
    renderTable({
      role: 'ADMIN',
      existingDocs: [],
      documentTypes: [catalogTypes[0]!, catalogTypes[2]!, catalogTypes[1]!],
    })

    const table = await screen.findByTestId('demarcacion-documents-table')
    const types = within(table)
      .getAllByRole('row')
      .slice(1)
      .map(
        (row) =>
          within(row).getAllByRole('cell')[0]?.textContent?.trim() ?? ''
      )

    expect(types[0]).toContain('FORMATO UNICO DE REGISTRO (FUR) APP.pdf')
    expect(types[1]).toContain('PROYECTO DE TRABAJO')
    expect(types[2]).toContain('ACUSE_DE_DOCUMENTOS.pdf')
  })
})
