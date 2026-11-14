import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getFolios } from '../../../services/folioService'
import { listUsers, updateUser } from '../../../services/userService'
import UsersPage from './-UsersPage'

vi.mock('../../../services/folioService', () => ({
  getFolios: vi.fn(),
}))

vi.mock('../../../services/userService', () => ({
  administrativeRoles: ['ADMIN', 'VALIDATOR'],
  listUsers: vi.fn(),
  updateUser: vi.fn(),
}))

const validatorUser = {
  id: 85,
  username: 'validator85',
  name: 'Ana',
  lastName: 'López',
  motherLastName: 'Pérez',
  email: 'ana@example.test',
  phone: '4490001111',
  enabled: true,
  role: { name: 'VALIDATOR' },
}

it('opens inline editing without submitting the form until Guardar is pressed', async () => {
  vi.mocked(listUsers).mockResolvedValue([validatorUser])
  vi.mocked(getFolios).mockResolvedValue([])
  vi.mocked(updateUser).mockResolvedValue(undefined)

  render(<UsersPage />)
  const editButton = await screen.findByRole('button', { name: 'Editar' })

  expect(fireEvent.click(editButton)).toBe(false)

  const table = within(screen.getByRole('table', { name: 'Usuarios existentes' }))
  expect(table.getByLabelText('Contraseña')).toHaveValue('')
  expect(updateUser).not.toHaveBeenCalled()
  expect(listUsers).toHaveBeenCalledTimes(1)

  fireEvent.click(table.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1))
  expect(updateUser).toHaveBeenCalledWith(validatorUser, expect.objectContaining({ password: '' }))
  await table.findByRole('button', { name: 'Editar' })
})

describe('Usuarios - columna Folio (solo lectura)', () => {
  it('renders Folio as the first column header', async () => {
    vi.mocked(listUsers).mockResolvedValue([validatorUser])
    vi.mocked(getFolios).mockResolvedValue([])

    render(<UsersPage />)
    await screen.findByRole('button', { name: 'Editar' })

    const table = screen.getByRole('table', { name: 'Usuarios existentes' })
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)
    expect(headers[0]).toBe('Folio')
    expect(headers[1]).toBe('Usuario')
  })

  it('shows the folio matched by userId', async () => {
    vi.mocked(listUsers).mockResolvedValue([validatorUser])
    vi.mocked(getFolios).mockResolvedValue([
      { userId: 85, folio: '007' } as Awaited<ReturnType<typeof getFolios>>[number],
    ])

    render(<UsersPage />)
    const editButton = await screen.findByRole('button', { name: 'Editar' })

    const row = editButton.closest('tr')
    expect(row?.cells[0]?.textContent).toBe('007')
  })

  it('shows an em dash when the user has no folio', async () => {
    vi.mocked(listUsers).mockResolvedValue([validatorUser])
    vi.mocked(getFolios).mockResolvedValue([
      { userId: 999, folio: '099' } as Awaited<ReturnType<typeof getFolios>>[number],
    ])

    render(<UsersPage />)
    const editButton = await screen.findByRole('button', { name: 'Editar' })

    const row = editButton.closest('tr')
    expect(row?.cells[0]?.textContent).toBe('—')
  })

  it('still renders the users table when GET /folios fails', async () => {
    vi.mocked(listUsers).mockResolvedValue([validatorUser])
    vi.mocked(getFolios).mockRejectedValue({ status: 500 })

    render(<UsersPage />)
    const editButton = await screen.findByRole('button', { name: 'Editar' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const row = editButton.closest('tr')
    expect(row?.cells[0]?.textContent).toBe('—')
    expect(within(screen.getByRole('table', { name: 'Usuarios existentes' }))
      .getByText('validator85')).toBeInTheDocument()
  })

  it('keeps the folio cell as plain text while editing the row', async () => {
    vi.mocked(listUsers).mockResolvedValue([validatorUser])
    vi.mocked(getFolios).mockResolvedValue([
      { userId: 85, folio: '007' } as Awaited<ReturnType<typeof getFolios>>[number],
    ])
    vi.mocked(updateUser).mockResolvedValue(undefined)

    render(<UsersPage />)
    const editButton = await screen.findByRole('button', { name: 'Editar' })
    fireEvent.click(editButton)

    const table = screen.getByRole('table', { name: 'Usuarios existentes' })
    const row = within(table).getByText('007').closest('tr')
    const firstCell = row?.cells[0]
    expect(firstCell?.textContent).toBe('007')
    expect(firstCell?.querySelector('input')).toBeNull()
    expect(firstCell?.querySelector('[role="button"]')).toBeNull()
  })
})
