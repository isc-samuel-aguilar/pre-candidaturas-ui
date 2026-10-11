import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { CSSProperties, ReactNode } from 'react'
import { DemarcacionTable } from './DemarcacionTable'
import { StatusEnum } from '../../../../types/enums'
import type { DemarcacionRow, KeyValueCatalog } from '../../../../types/demarcacion'

const mocks = vi.hoisted(() => ({
  useNavigate: vi.fn(),
  useAuth: vi.fn(),
  getDemarcationDocumentTypes: vi.fn(),
  getDemarcationDocuments: vi.fn(),
  uploadDemarcationDocument: vi.fn(),
  updateDemarcationDocumentStatus: vi.fn(),
  deleteDemarcationDocument: vi.fn(),
  downloadDemarcationDocumentFile: vi.fn(),
  generateDemarcationDocument: vi.fn(),
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
  toDocumentoKey: (value: string) =>
    value
      .replace(/\.pdf$/i, '')
      .replace(/[()]/g, '')
      .replace(/ /g, '_'),
}))

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
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

function renderTable(rows: DemarcacionRow[], mode?: 'upload' | 'validate') {
  render(
    <DemarcacionTable
      demarcaciones={rows}
      loading={false}
      uploadingIds={new Set<number>()}
      onUpload={async () => {}}
      onDelete={async () => {}}
      getStatusColor={() => ({ bg: '#FFFFFF', color: '#000000' })}
      mode={mode}
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

  it('does not render the Excel column header in validate mode', () => {
    renderTable([registeredRow], 'validate')

    expect(screen.queryByRole('columnheader', { name: 'Excel' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Validar' })).toBeInTheDocument()
  })

  it('shows a sub-table with Pre Candidatos and FUR rows when expanding a demarcation', () => {
    renderTable([registeredRow])

    expandFirstRow()

    expect(
      screen.getByLabelText('Expandir Pre Candidatos')
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP')
    ).toBeInTheDocument()
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
    fireEvent.click(screen.getByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP'))

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
    fireEvent.click(screen.getByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP'))

    const documentsTable = await screen.findByTestId('demarcacion-documents-table')
    const uploadButtons = within(documentsTable).getAllByRole('button', { name: 'Subir' })
    const deleteButtons = within(documentsTable).getAllByRole('button', {
      name: 'Eliminar',
    })
    const generateButtons = within(documentsTable).getAllByRole('button', { name: 'Generar' })

    expect(uploadButtons).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
    // C12: ADMIN + VALIDA → Subir habilitado; Eliminar deshabilitado sin archivo
    uploadButtons.forEach((button) => expect(button).toBeEnabled())
    deleteButtons.forEach((button) => expect(button).toBeDisabled())
    // Generar solo en la fila FUR
    expect(generateButtons).toHaveLength(1)
    expect(generateButtons[0]).toBeEnabled()
  })

  it('renders the columns of the FUR table in upload mode with Generar (C12)', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP'))

    const documentsTable = await screen.findByTestId('demarcacion-documents-table')
    const headers = within(documentsTable)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual(['Tipo', 'Nombre', 'Subir', 'Eliminar', 'Status', 'Generar'])
  })

  it('renders the validation columns with Generar in the FUR table in validate mode', async () => {
    renderTable([registeredRow], 'validate')

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP'))

    const documentsTable = await screen.findByTestId('demarcacion-documents-table')
    const headers = within(documentsTable)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual([
      'Tipo',
      'Nombre',
      'Status',
      'Validar',
      'Comentario',
      'Acciones',
      'Generar',
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
      screen.queryByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
  })

  it('collapses both branches when the demarcation row is collapsed', async () => {
    renderTable([registeredRow])

    expandFirstRow()
    fireEvent.click(screen.getByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP'))
    await screen.findByTestId('demarcacion-documents-table')

    expandFirstRow()

    expect(
      screen.queryByLabelText('Expandir FORMATO UNICO DE REGISTRO (FUR) APP')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('demarcacion-documents-table')).not.toBeInTheDocument()
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
