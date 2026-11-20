import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { CSSProperties, ReactNode } from 'react'
import { DemarcacionTable } from './DemarcacionTable'
import { StatusEnum } from '../../../../types/enums'
import type { DemarcacionRow, KeyValueCatalog } from '../../../../types/demarcacion'

const mocks = vi.hoisted(() => ({
  useNavigate: vi.fn(),
  useAuth: vi.fn(),
  isDemoFileAvailable: vi.fn<(filename: string, signal: AbortSignal) => Promise<boolean>>(
    () => new Promise<boolean>(() => {})
  ),
  downloadDemoFileByName: vi.fn(),
  getDemarcationDocumentTypes: vi.fn(),
  getDemarcationDocuments: vi.fn(),
  uploadDemarcationDocument: vi.fn(),
  updateDemarcationDocumentStatus: vi.fn(),
  deleteDemarcationDocument: vi.fn(),
  downloadDemarcationDocumentFile: vi.fn(),
  generateDemarcationDocument: vi.fn(),
  downloadGeneratedDemarcationDocument: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: mocks.useNavigate,
  Link: ({
    to,
    params,
    target,
    rel,
    style,
    children,
    ...rest
  }: {
    to: string
    params: { folio: string; alias: string }
    target?: string
    rel?: string
    style?: CSSProperties
    children?: ReactNode
  }) => (
    <a
      href={`/dashboard/${encodeURIComponent(params.folio)}/demarcaciones/${encodeURIComponent(params.alias)}`}
      target={target}
      rel={rel}
      style={style}
      data-to={to}
      {...rest}
    >
      {children}
    </a>
  ),
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

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('../../../../services/demoFilesService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../services/demoFilesService')>()),
  isDemoFileAvailable: mocks.isDemoFileAvailable,
  downloadDemoFileByName: mocks.downloadDemoFileByName,
}))

vi.mock('../../../../components/PrecandidatosTable', () => ({
  PrecandidatosTable: (props: {
    folioId?: number
    demarcacionName?: string
    mode?: string
    demarcacionStatus?: string | null
    allowDocActions?: boolean
    allowDocValidation?: boolean
    groupDocuments?: boolean
  }) => (
    <div
      data-testid="precandidatos-table"
      data-folio-id={String(props.folioId ?? '')}
      data-demarcacion-name={props.demarcacionName ?? ''}
      data-mode={props.mode ?? ''}
      data-demarcacion-status={String(props.demarcacionStatus ?? '')}
      data-allow-doc-actions={String(props.allowDocActions ?? false)}
      data-allow-doc-validation={String(props.allowDocValidation ?? false)}
      data-group-documents={String(props.groupDocuments ?? false)}
    />
  ),
}))

const registeredRow: DemarcacionRow = {
  catalogo: {
    id: 1,
    ambito: 'Municipal',
    demarcacion: 'PRIMERA',
    alias: '1A DEMARCACION',
  },
  folioDemarcacion: {
    id: 10,
    folioId: 5,
    folio: 'FOLIO-2026',
    demarcacionId: 1,
    ambito: 'Municipal',
    demarcacion: 'PRIMERA',
    alias: '1A DEMARCACION',
    status: StatusEnum.VALIDO,
    statusDescription: null,
    createdDate: '2026-01-01T00:00:00',
  },
  status: StatusEnum.VALIDO,
}

const unregisteredRow: DemarcacionRow = {
  catalogo: {
    id: 2,
    ambito: 'Municipal',
    demarcacion: 'SEGUNDA',
    alias: null,
  },
  folioDemarcacion: null,
  status: null,
}

// C11 (task-ui-19): orden por etiqueta visible y fila GUBERNATURA fija la 1ª
const zetaRow: DemarcacionRow = {
  catalogo: {
    id: 21,
    ambito: 'Municipal',
    demarcacion: 'PRIMERA',
    alias: 'ZETA DEMARC',
  },
  folioDemarcacion: null,
  status: null,
}

const sinAliasRow: DemarcacionRow = {
  catalogo: {
    id: 22,
    ambito: 'Municipal',
    demarcacion: 'SEGUNDA',
    alias: null,
  },
  folioDemarcacion: null,
  status: null,
}

const gubernaturaRow: DemarcacionRow = {
  catalogo: {
    id: 23,
    ambito: 'Municipal',
    demarcacion: 'GOB MUN',
    alias: 'Gubernatura Municipal',
  },
  folioDemarcacion: null,
  status: null,
}

const demarcationDocumentTypes: KeyValueCatalog[] = [
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
    value: 'OTRO DOC DEMARCACION.pdf',
    type: 'String',
    description: 'OTRO DOC DEMARCACION',
    createdDate: '2026-01-01T00:00:00',
  },
]

function renderTable(
  rows: DemarcacionRow[],
  mode?: 'upload' | 'validate',
  onSaveStatus?: (
    demarcacion: DemarcacionRow,
    status: StatusEnum,
    statusDescription: string | null
  ) => Promise<void>
) {
  render(
    <DemarcacionTable
      demarcaciones={rows}
      loading={false}
      uploadingIds={new Set<number>()}
      onUpload={async () => {}}
      onDelete={async () => {}}
      getStatusColor={() => ({ bg: '#FFFFFF', color: '#000000' })}
      mode={mode}
      onSaveStatus={onSaveStatus}
    />
  )
}

function renderedDemarcacionLabels(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1]?.textContent ?? '')
}

function expandFirstRow() {
  const [expandButton] = screen.getAllByRole('button')
  if (!expandButton) throw new Error('Expand button not found')
  fireEvent.click(expandButton)
}

// El componente ahora lee el rol vía useAuth → default global (ADMIN = sin auto-expansión)
beforeEach(() => {
  mocks.useNavigate.mockReturnValue(vi.fn())
  mocks.useAuth.mockReturnValue({
    token: 'token123',
    user: { role: 'ADMIN', userId: 1, username: 'admin' },
  })
})

describe('DemarcacionTable - link a la ficha de demarcación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useNavigate.mockReturnValue(vi.fn())
  })

  it('renders the demarcation name as a link that opens in a new tab', () => {
    renderTable([registeredRow])

    const link = screen.getByRole('link', { name: '1A DEMARCACION' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'opener')
    expect(link).toHaveAttribute(
      'href',
      '/dashboard/FOLIO-2026/demarcaciones/1A%20DEMARCACION'
    )
    expect(link).toHaveAttribute('data-to', '/dashboard/$folio/demarcaciones/$alias')
  })

  it('falls back to the demarcation name in the link when alias is null', () => {
    renderTable([{ ...registeredRow, catalogo: { ...registeredRow.catalogo, alias: null } }])

    const link = screen.getByRole('link', { name: 'PRIMERA' })
    expect(link).toHaveAttribute(
      'href',
      '/dashboard/FOLIO-2026/demarcaciones/PRIMERA'
    )
  })

  it('renders plain text without a link when the demarcacion is not registered', () => {
    renderTable([unregisteredRow])

    expect(screen.getByText('SEGUNDA')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('navigates to the folio/alias route when clicking Pre Candidatos', async () => {
    const navigate = vi.fn()
    mocks.useNavigate.mockReturnValue(navigate)

    renderTable([registeredRow])

    fireEvent.click(screen.getByRole('button', { name: /Pre Candidatos/ }))

    expect(navigate).toHaveBeenCalledWith({
      to: '/dashboard/$folio/demarcaciones/$alias',
      params: { folio: 'FOLIO-2026', alias: '1A DEMARCACION' },
    })
  })
})

describe('DemarcacionTable - C11 (orden, título, cabecera, expansión)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useNavigate.mockReturnValue(vi.fn())
    mocks.useAuth.mockReturnValue({
      token: 'token123',
      user: { role: 'ADMIN', userId: 1, username: 'admin' },
    })
    mocks.getDemarcationDocumentTypes.mockResolvedValue(demarcationDocumentTypes)
    mocks.getDemarcationDocuments.mockResolvedValue([])
    mocks.uploadDemarcationDocument.mockResolvedValue({})
    mocks.updateDemarcationDocumentStatus.mockResolvedValue({})
    mocks.deleteDemarcationDocument.mockResolvedValue(undefined)
    mocks.downloadDemarcationDocumentFile.mockResolvedValue(undefined)
    mocks.generateDemarcationDocument.mockResolvedValue(undefined)
  })

  it('sorts with GUBERNATURA first and the rest alphabetically by the visible label', () => {
    renderTable([zetaRow, gubernaturaRow, sinAliasRow])

    expect(renderedDemarcacionLabels()).toEqual([
      'Gubernatura Municipal',
      'SEGUNDA',
      'ZETA DEMARC',
    ])
  })

  it('sorts district numbers numerically in the demarcation list', () => {
    const districtRows: DemarcacionRow[] = [10, 2, 11, 9, 1].map((number) => ({
      catalogo: {
        id: 100 + number,
        ambito: 'DISTRITAL',
        demarcacion: String(number),
        alias: 'DTTO ' + number,
      },
      folioDemarcacion: null,
      status: null,
    }))

    renderTable([...districtRows, zetaRow, gubernaturaRow, sinAliasRow])

    expect(renderedDemarcacionLabels()).toEqual([
      'Gubernatura Municipal',
      'DTTO 1',
      'DTTO 2',
      'DTTO 9',
      'DTTO 10',
      'DTTO 11',
      'SEGUNDA',
      'ZETA DEMARC',
    ])
  })

  it('keeps the filtered rows sorted', () => {
    renderTable([zetaRow, gubernaturaRow, sinAliasRow])

    // "n" descarta "ZETA DEMARC" y conserva GUBERNATURA + SEGUNDA
    fireEvent.change(screen.getByPlaceholderText('Buscar demarcación...'), {
      target: { value: 'n' },
    })

    expect(renderedDemarcacionLabels()).toEqual(['Gubernatura Municipal', 'SEGUNDA'])
  })

  it('renders the section title "Demarcaciones" as a heading', () => {
    renderTable([registeredRow])

    expect(
      screen.getByRole('heading', { level: 6, name: 'Demarcaciones' })
    ).toBeInTheDocument()
  })

  it('renames the upload column header to Excel while the button keeps saying Subir', () => {
    renderTable([registeredRow])

    expect(screen.getByRole('columnheader', { name: 'Excel' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Subir' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir' })).toBeInTheDocument()
  })

  it('VALIDATOR does not render the Excel column header in validate mode', () => {
    // el rol por defecto del suite es ADMIN (que ahora sí ve Excel en validate);
    // esta regresión aplica al VALIDATOR
    mocks.useAuth.mockReturnValue({
      token: 'token123',
      user: { role: 'VALIDATOR', userId: 1, username: 'validator' },
    })
    renderTable([registeredRow], 'validate')

    expect(screen.queryByRole('columnheader', { name: 'Excel' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Validar' })).toBeInTheDocument()
  })

  it('shows a sub-table with the documents branch first and Pre Candidatos second', () => {
    renderTable([registeredRow])

    expandFirstRow()

    expect(
      screen.getByLabelText('Expandir Documentos por demarcación')
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Expandir Pre Candidatos')
    ).toBeInTheDocument()
    // C13: la rama de documentos va primero en el DOM
    const branchLabels = screen
      .getAllByLabelText(/^Expandir (Documentos por demarcación|Pre Candidatos)$/)
      .map((el) => el.getAttribute('aria-label'))
    expect(branchLabels).toEqual([
      'Expandir Documentos por demarcación',
      'Expandir Pre Candidatos',
    ])
    expect(screen.queryByTestId('precandidatos-table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
  })

  it('renders PrecandidatosTable with the current props after expanding Pre Candidatos', () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Pre Candidatos'))

    const table = screen.getByTestId('precandidatos-table')
    expect(table).toHaveAttribute('data-folio-id', '5')
    expect(table).toHaveAttribute('data-demarcacion-name', 'PRIMERA')
    expect(table).toHaveAttribute('data-mode', 'excel')
    expect(table).toHaveAttribute('data-demarcacion-status', StatusEnum.VALIDO)
    expect(table).toHaveAttribute('data-allow-doc-actions', 'true')
    expect(table).toHaveAttribute('data-allow-doc-validation', 'false')
    expect(table).toHaveAttribute('data-group-documents', 'true')
  })

  it('enables doc validation for PrecandidatosTable in validate mode', () => {
    renderTable([registeredRow], 'validate')

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Pre Candidatos'))

    const table = screen.getByTestId('precandidatos-table')
    expect(table).toHaveAttribute('data-allow-doc-actions', 'false')
    expect(table).toHaveAttribute('data-allow-doc-validation', 'true')
    expect(table).toHaveAttribute('data-group-documents', 'true')
  })

  it('loads the catalog and passes the folio/demarcacion context to the FUR table (C12)', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))

    const documentsTable = await screen.findByTestId('demarcacion-documents-table')

    expect(mocks.getDemarcationDocumentTypes).toHaveBeenCalledTimes(1)
    // props received: folioId=5, folioDemarcacionId=10
    expect(mocks.getDemarcationDocuments).toHaveBeenCalledWith(5, 10)
    // header + 2 catalog rows
    expect(within(documentsTable).getAllByRole('row')).toHaveLength(3)
    expect(
      within(documentsTable).getByText('OTRO DOC DEMARCACION.pdf')
    ).toBeInTheDocument()
  })

  it('enables upload and generate for ADMIN in upload mode on a VALIDA demarcation', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))

    const documentsTable = await screen.findByTestId('demarcacion-documents-table')
    const uploadButtons = within(documentsTable).getAllByRole('button', { name: 'Subir' })
    const deleteButtons = within(documentsTable).getAllByRole('button', {
      name: 'Eliminar',
    })
    const generateButtons = within(documentsTable).getAllByRole('button', { name: 'Descargar y firmar' })

    expect(uploadButtons).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
    // C12: ADMIN + VALIDA → Subir habilitado; Eliminar deshabilitado sin archivo
    uploadButtons.forEach((button) => expect(button).toBeEnabled())
    deleteButtons.forEach((button) => expect(button).toBeDisabled())
    // "Descargar y firmar" solo en la fila FUR
    expect(generateButtons).toHaveLength(1)
    expect(generateButtons[0]).toBeEnabled()
  })

  it('renders the columns of the FUR table in upload mode with Descargar y/o Firmar (C12)', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))

    const documentsTable = await screen.findByTestId('demarcacion-documents-table')
    const headers = within(documentsTable)
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

  it('renders the validation columns in the FUR table in validate mode', async () => {
    renderTable([registeredRow], 'validate')

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))

    const documentsTable = await screen.findByTestId('demarcacion-documents-table')
    const headers = within(documentsTable)
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
    const saveButtons = within(documentsTable).getAllByRole('button', {
      name: 'Guardar',
    })
    const cancelButtons = within(documentsTable).getAllByRole('button', {
      name: 'Cancelar',
    })
    expect(saveButtons).toHaveLength(2)
    expect(cancelButtons).toHaveLength(2)
    // sin archivo persistido → deshabilitados
    saveButtons.forEach((button) => expect(button).toBeDisabled())
    cancelButtons.forEach((button) => expect(button).toBeDisabled())
  })

  it('keeps the expand disabled when the demarcation is only a catalog row (no folioDemarcacion)', () => {
    renderTable([unregisteredRow])

    // sin status no se puede expandir → la rama FUR nunca se ofrece
    const [expandButton] = screen.getAllByRole('button')
    if (!expandButton) throw new Error('Expand button not found')
    expect(expandButton).toBeDisabled()

    expect(
      screen.queryByLabelText('Expandir Documentos por demarcación')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
  })

  it('collapses both branches when the demarcation row is collapsed', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))
    await screen.findByTestId('demarcacion-documents-table')

    expandFirstRow()

    expect(
      screen.queryByLabelText('Expandir Documentos por demarcación')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
  })

  it('expands both branches independently (opening one does not collapse the other)', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))
    await screen.findByTestId('demarcacion-documents-table')

    fireEvent.click(screen.getByLabelText('Expandir Pre Candidatos'))

    expect(await screen.findByTestId('precandidatos-table')).toBeInTheDocument()
    expect(screen.getByTestId('demarcacion-documents-table')).toBeInTheDocument()
  })

  it('collapsing one branch keeps the other branch expanded', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))
    await screen.findByTestId('demarcacion-documents-table')
    fireEvent.click(screen.getByLabelText('Expandir Pre Candidatos'))
    await screen.findByTestId('precandidatos-table')

    fireEvent.click(screen.getByLabelText('Expandir Documentos por demarcación'))

    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
    expect(screen.getByTestId('precandidatos-table')).toBeInTheDocument()
  })
})

describe('DemarcacionTable - auto-expansión por rol', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDemarcationDocumentTypes.mockResolvedValue(demarcationDocumentTypes)
    mocks.getDemarcationDocuments.mockResolvedValue([])
  })

  function setRole(role: string) {
    mocks.useAuth.mockReturnValue({
      token: 'token123',
      user: { role, userId: 1, username: 'user' },
    })
  }

  it('REGISTER: expanding the demarcation opens the Pre Candidatos branch automatically', () => {
    setRole('REGISTER')
    renderTable([registeredRow])

    expandFirstRow()

    expect(screen.getByTestId('precandidatos-table')).toBeInTheDocument()
    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
  })

  it('VALIDATOR: expanding the demarcation opens the FUR branch automatically', async () => {
    setRole('VALIDATOR')
    renderTable([registeredRow], 'validate')

    expandFirstRow()

    expect(await screen.findByTestId('demarcacion-documents-table')).toBeInTheDocument()
    expect(screen.queryByTestId('precandidatos-table')).not.toBeInTheDocument()
  })

  it('ADMIN: expanding the demarcation keeps both branches collapsed', () => {
    setRole('ADMIN')
    renderTable([registeredRow])

    expandFirstRow()

    expect(screen.queryByTestId('precandidatos-table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
  })
})

describe('DemarcacionTable - C14 (scroll al expandir)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>
  let originalScrollIntoView: unknown

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useNavigate.mockReturnValue(vi.fn())
    mocks.useAuth.mockReturnValue({
      token: 'token123',
      user: { role: 'ADMIN', userId: 1, username: 'admin' },
    })
    mocks.getDemarcationDocumentTypes.mockResolvedValue(demarcationDocumentTypes)
    mocks.getDemarcationDocuments.mockResolvedValue([])
    // jsdom no implementa scrollIntoView → stub local de este describe
    originalScrollIntoView = Element.prototype.scrollIntoView
    scrollIntoViewMock = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock
  })

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView as typeof Element.prototype.scrollIntoView
  })

  it('calls scrollIntoView with smooth/start when expanding the demarcation', async () => {
    renderTable([registeredRow])

    expandFirstRow()

    await waitFor(() =>
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
    )
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1)
  })

  it('does not call scrollIntoView when collapsing the demarcation', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1))
    scrollIntoViewMock.mockClear()

    // colapsar la misma demarcación
    expandFirstRow()

    // deja pasar un frame por si hubiera un rAF pendiente
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })
})

describe('DemarcacionTable - columnas por rol (Estatus y Comentarios)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDemarcationDocumentTypes.mockResolvedValue(demarcationDocumentTypes)
    mocks.getDemarcationDocuments.mockResolvedValue([])
  })

  function setRole(role: string) {
    mocks.useAuth.mockReturnValue({
      token: 'token123',
      user: { role, userId: 1, username: 'user' },
    })
  }

  function mainHeaders(): string[] {
    return screen.getAllByRole('columnheader').map((cell) => cell.textContent ?? '')
  }

  const rowWithComment: DemarcacionRow = {
    ...registeredRow,
    folioDemarcacion: {
      ...registeredRow.folioDemarcacion!,
      statusDescription: 'Falta INE',
    },
  }

  it('REGISTER: sees Excel, Eliminar, Comentarios (solo lectura) and Estatus in order', () => {
    setRole('REGISTER')
    renderTable([rowWithComment])

    expect(mainHeaders()).toEqual([
      '',
      'Demarcación',
      'Detalles',
      'Descargar Ejemplo',
      'Archivos Limpios',
      'Pre Candidatos',
      'Excel',
      'Eliminar',
      'Comentarios',
      'Estatus',
    ])
    expect(screen.getByText('Falta INE')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Validar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Status' })
    ).not.toBeInTheDocument()
  })

  it('REGISTER: shows an em dash in Comentarios when there is no comment', () => {
    setRole('REGISTER')
    renderTable([registeredRow]) // statusDescription: null

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('REGISTER: expanded row uses colSpan 10', () => {
    setRole('REGISTER')
    renderTable([registeredRow])

    expandFirstRow()

    expect(document.querySelector('td[colspan="10"]')).not.toBeNull()
    expect(document.querySelector('td[colspan="12"]')).toBeNull()
  })

  it('ADMIN in upload mode: sees the union of REGISTER and VALIDATOR columns', () => {
    setRole('ADMIN')
    renderTable([registeredRow])

    expect(mainHeaders()).toEqual([
      '',
      'Demarcación',
      'Detalles',
      'Descargar Ejemplo',
      'Archivos Limpios',
      'Pre Candidatos',
      'Excel',
      'Eliminar',
      'Comentarios',
      'Estatus',
      'Validar',
      'Acciones',
    ])
    // Comentarios de ADMIN es editable (poder de VALIDATOR)
    expect(screen.getByPlaceholderText('Comentario...')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('ADMIN in upload mode: saves status and comment through onSaveStatus', async () => {
    setRole('ADMIN')
    const onSaveStatus = vi.fn().mockResolvedValue(undefined)
    renderTable([registeredRow], undefined, onSaveStatus)

    fireEvent.change(screen.getByPlaceholderText('Comentario...'), {
      target: { value: 'Comentario del admin' },
    })
    const saveButton = screen.getByRole('button', { name: 'Guardar' })
    expect(saveButton).toBeEnabled()

    fireEvent.click(saveButton)

    await waitFor(() =>
      expect(onSaveStatus).toHaveBeenCalledWith(
        expect.objectContaining({ catalogo: expect.objectContaining({ id: 1 }) }),
        StatusEnum.VALIDO,
        'Comentario del admin'
      )
    )
  })

  it('ADMIN in upload mode: expanded row uses colSpan 12', () => {
    setRole('ADMIN')
    renderTable([registeredRow])

    expandFirstRow()

    expect(document.querySelector('td[colspan="12"]')).not.toBeNull()
    expect(document.querySelector('td[colspan="10"]')).toBeNull()
  })

  it('ADMIN in validate mode: also sees Excel and Eliminar (12 columns)', () => {
    setRole('ADMIN')
    renderTable([registeredRow], 'validate')

    expect(mainHeaders()).toEqual([
      '',
      'Demarcación',
      'Detalles',
      'Descargar Ejemplo',
      'Archivos Limpios',
      'Pre Candidatos',
      'Excel',
      'Eliminar',
      'Comentarios',
      'Estatus',
      'Validar',
      'Acciones',
    ])
  })

  it('VALIDATOR: keeps its original validate layout without Excel/Eliminar', () => {
    setRole('VALIDATOR')
    renderTable([registeredRow], 'validate')

    expect(mainHeaders()).toEqual([
      '',
      'Demarcación',
      'Detalles',
      'Descargar Ejemplo',
      'Archivos Limpios',
      'Pre Candidatos',
      'Estatus',
      'Validar',
      'Comentarios',
      'Acciones',
    ])
    expect(screen.queryByRole('columnheader', { name: 'Excel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument()
  })

  it('renames the status filter label to Estatus in every view', () => {
    setRole('ADMIN')
    renderTable([registeredRow])

    expect(screen.getAllByText('Estatus').length).toBeGreaterThan(0)
    expect(screen.queryByText('Status')).not.toBeInTheDocument()
  })
})

describe('DemarcacionTable - columna Detalles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useNavigate.mockReturnValue(vi.fn())
    mocks.useAuth.mockReturnValue({
      token: 'token123',
      user: { role: 'ADMIN', userId: 1, username: 'admin' },
    })
  })

  it('renders the "Detalles" header right after "Demarcación"', () => {
    renderTable([registeredRow])

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent ?? '')
    expect(headers.indexOf('Demarcación')).toBe(1)
    expect(headers[2]).toBe('Detalles')
    expect(
      screen.getByRole('columnheader', { name: 'Detalles' })
    ).toBeInTheDocument()
  })

  it('renders a Detalles link that opens the folio/alias route in a new tab', () => {
    renderTable([registeredRow])

    const link = screen.getByRole('link', { name: 'Detalles' })
    expect(link).toHaveAttribute(
      'href',
      '/dashboard/FOLIO-2026/demarcaciones/1A%20DEMARCACION'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'opener')
    expect(link).toHaveAttribute('data-to', '/dashboard/$folio/demarcaciones/$alias')
  })

  it('renders an em dash and no link when the row has no folioDemarcacion', () => {
    renderTable([unregisteredRow])

    const cells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[2]?.textContent ?? '')
    expect(cells).toEqual(['—'])
    expect(screen.queryByRole('link', { name: 'Detalles' })).not.toBeInTheDocument()
  })
})

describe('DemarcacionTable - Descargas por demarcación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useNavigate.mockReturnValue(vi.fn())
    mocks.useAuth.mockReturnValue({
      token: 'token123',
      user: { role: 'ADMIN', userId: 1, username: 'admin' },
    })
  })

  it.each(['upload', 'validate'] as const)(
    'downloads the exact filenames and opens the same details link in %s mode',
    async (mode) => {
      mocks.isDemoFileAvailable.mockResolvedValue(true)
      mocks.downloadDemoFileByName.mockResolvedValue(undefined)
      const row = {
        ...registeredRow,
        catalogo: { ...registeredRow.catalogo, alias: 'AYTO AGUASCALIENTES' },
      }

      renderTable([row], mode)

      const aliasLink = screen.getByRole('link', { name: 'AYTO AGUASCALIENTES' })
      const detailsLink = screen.getByRole('link', { name: 'Detalles' })
      expect(detailsLink).toHaveAttribute('href', aliasLink.getAttribute('href'))
      expect(detailsLink).toHaveAttribute('target', '_blank')

      const example = screen.getByRole('button', { name: 'Descargar Ejemplo' })
      const template = screen.getByRole('button', { name: 'Archivos Limpios' })
      await waitFor(() => {
        expect(example).toBeEnabled()
        expect(template).toBeEnabled()
      })
      fireEvent.click(example)
      fireEvent.click(template)

      expect(mocks.downloadDemoFileByName).toHaveBeenCalledWith(
        'token123',
        'EJEMPLO LLENADO - AYTO AGUASCALIENTES.xlsx',
        'EJEMPLO LLENADO - AYTO AGUASCALIENTES.xlsx'
      )
      expect(mocks.downloadDemoFileByName).toHaveBeenCalledWith('token123', 'AYTO AGUASCALIENTES.xlsx', 'AYTO AGUASCALIENTES.xlsx')
      await waitFor(() => expect(template).toBeEnabled())
    }
  )

  it('uses shared district files while naming downloads after the demarcation', async () => {
    mocks.isDemoFileAvailable.mockResolvedValue(true)
    mocks.downloadDemoFileByName.mockResolvedValue(undefined)
    renderTable([{
      ...registeredRow,
      catalogo: { ...registeredRow.catalogo, alias: 'DTTO 1' },
    }])

    const example = screen.getByRole('button', { name: 'Descargar Ejemplo' })
    const clean = screen.getByRole('button', { name: 'Archivos Limpios' })
    await waitFor(() => expect(example).toBeEnabled())
    await waitFor(() => expect(clean).toBeEnabled())
    fireEvent.click(example)
    fireEvent.click(clean)

    expect(mocks.isDemoFileAvailable).toHaveBeenCalledWith(
      'DIPUTADO MR.xlsx', expect.any(AbortSignal)
    )
    expect(mocks.downloadDemoFileByName).toHaveBeenCalledWith(
      'token123', 'DIPUTADO MR.xlsx', 'DTTO 1.xlsx'
    )
    expect(mocks.downloadDemoFileByName).toHaveBeenCalledWith(
      'token123', 'EJEMPLO LLENADO - DIP MR.xlsx', 'EJEMPLO LLENADO - DTTO 1.xlsx'
    )
    await waitFor(() => expect(clean).toBeEnabled())
  })

  it('disables only the missing file and keeps downloads available without a folio', async () => {
    mocks.isDemoFileAvailable.mockImplementation(async (filename) => filename === 'GUBERNATURA.xlsx')
    const row = {
      ...unregisteredRow,
      catalogo: { ...unregisteredRow.catalogo, demarcacion: 'GUBERNATURA' },
    }
    renderTable([row])

    expect(await screen.findByRole('button', { name: 'No disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Archivos Limpios' })).toBeEnabled()
    expect(screen.queryByRole('link', { name: 'Detalles' })).not.toBeInTheDocument()
  })
})
