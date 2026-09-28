import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FolioList } from './FolioList'
import type { Folio } from '../../../../types/folio'
import { StatusEnum } from '../../../../types/enums'

function buildFolio(overrides: Partial<Folio> = {}): Folio {
  return {
    id: 1,
    folio: '001',
    email: 'maria.lopez@example.com',
    calle: 'Independencia',
    numero: '10',
    colonia: 'Centro',
    municipio: 'Acapulco',
    estado: 'Guerrero',
    codigoPostal: '40000',
    userId: 10,
    user: { username: 'maria.lopez' },
    status: StatusEnum.VALIDO,
    representations: [],
    createdBy: 'admin',
    updatedBy: null,
    createdDate: '2026-01-01T00:00:00',
    updatedDate: null,
    ...overrides,
  }
}

describe('FolioList', () => {
  it('renders the username as a link that opens in a new tab', () => {
    render(<FolioList folios={[buildFolio()]} loading={false} error={null} />)

    const link = screen.getByRole('link', { name: 'maria.lopez' })
    expect(link).toHaveAttribute('href', '/dashboard/excel/maria.lopez')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'opener')
  })

  it('never shows the id when the backend sends a username', () => {
    render(<FolioList folios={[buildFolio()]} loading={false} error={null} />)

    expect(screen.queryByText('10')).toBeNull()
  })

  it('falls back to the userId when there is no username', () => {
    render(<FolioList folios={[buildFolio({ user: null })]} loading={false} error={null} />)

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders the status chip with its label', () => {
    render(<FolioList folios={[buildFolio()]} loading={false} error={null} />)

    expect(screen.getByText('Válido')).toBeInTheDocument()
  })

  it('renders a gray chip when the status is null', () => {
    render(<FolioList folios={[buildFolio({ status: null })]} loading={false} error={null} />)

    expect(screen.getByText('Sin cargar')).toBeInTheDocument()
  })

  it('shows the actions column by default', () => {
    render(<FolioList folios={[buildFolio()]} loading={false} error={null} />)

    expect(screen.getByText('Acciones')).toBeInTheDocument()
  })

  it('hides the actions column when showActions is false', () => {
    render(
      <FolioList folios={[buildFolio()]} loading={false} error={null} showActions={false} />
    )

    expect(screen.queryByText('Acciones')).toBeNull()
    expect(screen.getByText('Válido')).toBeInTheDocument()
  })
})
