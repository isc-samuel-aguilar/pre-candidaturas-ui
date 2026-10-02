import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { CSSProperties, ReactNode } from 'react'
import { DemarcacionTable } from './DemarcacionTable'
import { StatusEnum } from '../../../../types/enums'
import type { DemarcacionRow } from '../../../../types/demarcacion'

const mocks = vi.hoisted(() => ({
  useNavigate: vi.fn(),
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

vi.mock('../../../../components/PrecandidatosTable', () => ({
  PrecandidatosTable: (props: { groupDocuments?: boolean }) => (
    <div
      data-testid="precandidatos-table"
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

describe('DemarcacionTable - agrupación de documentos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useNavigate.mockReturnValue(vi.fn())
  })

  it('enables grouped documents for PrecandidatosTable in upload mode', () => {
    renderTable([registeredRow])

    const [expandButton] = screen.getAllByRole('button')
    if (!expandButton) throw new Error('Expand button not found')
    fireEvent.click(expandButton)

    expect(screen.getByTestId('precandidatos-table')).toHaveAttribute(
      'data-group-documents',
      'true'
    )
  })

  it('enables grouped documents for PrecandidatosTable in validate mode', () => {
    renderTable([registeredRow], 'validate')

    const [expandButton] = screen.getAllByRole('button')
    if (!expandButton) throw new Error('Expand button not found')
    fireEvent.click(expandButton)

    expect(screen.getByTestId('precandidatos-table')).toHaveAttribute(
      'data-group-documents',
      'true'
    )
  })
})
