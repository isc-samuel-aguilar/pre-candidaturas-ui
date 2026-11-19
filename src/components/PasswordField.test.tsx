import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PasswordField from './PasswordField'

describe('PasswordField', () => {
  it('toggles the password field between hidden and visible', () => {
    const onChange = vi.fn()
    render(<PasswordField value="secreto" onChange={onChange} />)

    const input = screen.getByLabelText(/^Contraseña/) as HTMLInputElement
    expect(input.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input.type).toBe('password')
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeInTheDocument()
  })

  it('forwards value changes and respects the disabled state', () => {
    const onChange = vi.fn()
    render(<PasswordField value="" onChange={onChange} disabled />)

    const input = screen.getByLabelText(/^Contraseña/) as HTMLInputElement
    expect(input).toBeDisabled()

    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' })
    expect(toggle).toBeDisabled()
  })
})
