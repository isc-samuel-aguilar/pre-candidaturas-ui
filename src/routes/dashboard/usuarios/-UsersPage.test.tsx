import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { listUsers, updateUser } from '../../../services/userService'
import UsersPage from './-UsersPage'

vi.mock('../../../services/userService', () => ({
  administrativeRoles: ['ADMIN', 'VALIDATOR'],
  listUsers: vi.fn(),
  updateUser: vi.fn(),
}))

it('opens inline editing without submitting the form until Guardar is pressed', async () => {
  const user = {
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
  vi.mocked(listUsers).mockResolvedValue([user])
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
  expect(updateUser).toHaveBeenCalledWith(user, expect.objectContaining({ password: '' }))
  await table.findByRole('button', { name: 'Editar' })
})
