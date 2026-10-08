import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { FolioForm } from './FolioForm'
import { StatusEnum } from '../../../../types/enums'
import type { KeyValueCatalog } from '../../../../types/demarcacion'
import type { Folio as FolioType } from '../../../../types/folio'

const representations: KeyValueCatalog[] = [
  {
    id: 1,
    key: 'REPRESENTACION',
    value: 'PROPIETARIA',
    type: 'String',
    description: 'Representación propietaria',
    createdDate: '2026-01-01T00:00:00',
  },
]

const editingFolio: FolioType = {
  id: 5,
  folio: 'F-2026',
  email: 'folio@test.com',
  telefono: '4490001111',
  calle: 'Av. Reforma',
  numero: '123',
  colonia: 'Centro',
  municipio: 'Aguascalientes',
  estado: 'Aguascalientes',
  codigoPostal: '20000',
  userId: 3,
  user: { username: 'F-2026user' },
  status: StatusEnum.VALIDO,
  representations: [
    {
      id: 1,
      representation: 'PROPIETARIA',
      paternalLastName: 'Lopez',
      maternalLastName: '',
      name: 'Maria',
      voterKey: 'ESESOS82040501H800',
      phone: '4490000000',
      createdBy: 'admin',
      updatedBy: null,
      createdDate: '2026-01-01T00:00:00',
      updatedDate: null,
    },
  ],
  createdBy: 'admin',
  updatedBy: null,
  createdDate: '2026-01-01T00:00:00',
  updatedDate: null,
}

function renderForm({
  onSubmit: onSubmitOverride,
  ...overrides
}: Partial<ComponentProps<typeof FolioForm>> = {}) {
  const onSubmit = onSubmitOverride ?? vi.fn().mockResolvedValue(undefined)

  render(
    <FolioForm
      representations={representations}
      editingFolio={null}
      defaultFolio="F-2026"
      dummyDataToFill={null}
      onCancel={() => {}}
      onDummyDataConsumed={() => {}}
      loading={false}
      error={null}
      {...overrides}
      onSubmit={onSubmit}
    />
  )

  return { onSubmit }
}

function accordion(title: string) {
  const root = screen.getByText(title).closest('div.MuiAccordion-root')
  if (!root) throw new Error(`Accordion "${title}" not found`)
  return within(root as HTMLElement)
}

// MUI añade el asterisco de "required" al texto del label → match por prefijo
function field(scope: ReturnType<typeof within>, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return scope.getByLabelText(new RegExp(`^${escaped}`))
}

// jsdom no dispara el submit al pulsar el botón → se envía el form directamente
function submitForm() {
  const form = document.querySelector('form')
  if (!form) throw new Error('Form not found')
  fireEvent.submit(form)
}

function fillCreateForm(folioPhone?: string) {
  const folioSection = accordion('Datos del Folio')
  fireEvent.change(field(folioSection, 'Folio'), {
    target: { value: 'F-2026' },
  })
  fireEvent.change(field(folioSection, 'Correo Electrónico'), {
    target: { value: 'folio@test.com' },
  })
  if (folioPhone !== undefined) {
    fireEvent.change(field(folioSection, 'Teléfono'), {
      target: { value: folioPhone },
    })
  }
  fireEvent.change(field(folioSection, 'Calle'), {
    target: { value: 'Av. Reforma' },
  })
  fireEvent.change(field(folioSection, 'Número'), {
    target: { value: '123' },
  })
  fireEvent.change(field(folioSection, 'Colonia'), {
    target: { value: 'Centro' },
  })
  fireEvent.change(field(folioSection, 'Municipio'), {
    target: { value: 'Aguascalientes' },
  })
  fireEvent.change(field(folioSection, 'Estado'), {
    target: { value: 'Aguascalientes' },
  })
  fireEvent.change(field(folioSection, 'Código Postal'), {
    target: { value: '20000' },
  })

  const representationSection = accordion('Representaciones')
  fireEvent.change(field(representationSection, 'Apellido Paterno'), {
    target: { value: 'Lopez' },
  })
  fireEvent.change(field(representationSection, 'Nombre(s)'), {
    target: { value: 'Maria' },
  })
  fireEvent.change(field(representationSection, 'Clave de Elector'), {
    target: { value: 'ESESOS82040501H800' },
  })
  fireEvent.change(field(representationSection, 'Teléfono'), {
    target: { value: '4490000000' },
  })

  const userSection = accordion('Datos del Usuario')
  fireEvent.change(field(userSection, 'Usuario'), {
    target: { value: 'user' },
  })
  fireEvent.change(field(userSection, 'Contraseña'), {
    target: { value: 'Test1234' },
  })
  fireEvent.change(field(userSection, 'Apellido Paterno'), {
    target: { value: 'Perez' },
  })
  fireEvent.change(field(userSection, 'Nombre(s)'), {
    target: { value: 'Ana' },
  })
  fireEvent.change(field(userSection, 'Correo Electrónico'), {
    target: { value: 'user@test.com' },
  })
  fireEvent.change(field(userSection, 'Teléfono'), {
    target: { value: '4491112222' },
  })
}

describe('FolioForm - Teléfono del folio (C11 / task-ui-19)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the Teléfono field in the folio section without being required', () => {
    renderForm()

    const telefono = accordion('Datos del Folio').getByLabelText('Teléfono')

    expect(telefono).toBeInTheDocument()
    expect(telefono).not.toHaveAttribute('required')
    expect(telefono).not.toHaveAttribute('aria-required', 'true')
  })

  it('allows typing the folio phone number', () => {
    renderForm()

    const telefono = accordion('Datos del Folio').getByLabelText('Teléfono')
    fireEvent.change(telefono, { target: { value: '4491234567' } })

    expect(accordion('Datos del Folio').getByLabelText('Teléfono')).toHaveValue(
      '4491234567'
    )
  })

  it('sends telefono in the create payload', async () => {
    const { onSubmit } = renderForm()

    fillCreateForm('4491234567')
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument()
    submitForm()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ telefono: '4491234567' })
    )
  })

  it('does not require the folio phone number to create a folio', async () => {
    const { onSubmit } = renderForm()

    fillCreateForm()
    submitForm()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ telefono: '' }))
  })

  it('prefills the folio phone number when editing', () => {
    renderForm({ editingFolio })

    expect(accordion('Datos del Folio').getByLabelText('Teléfono')).toHaveValue(
      '4490001111'
    )
  })

  it('sends telefono in the update payload', async () => {
    const { onSubmit } = renderForm({ editingFolio })

    fireEvent.change(accordion('Datos del Folio').getByLabelText('Teléfono'), {
      target: { value: '5550001111' },
    })
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument()
    submitForm()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ folio: 'F-2026', telefono: '5550001111' })
    )
  })
})
