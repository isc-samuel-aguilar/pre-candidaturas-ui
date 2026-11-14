import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { FolioForm } from './FolioForm'
import { generateDummyData } from '../../../../utils/dummyData'
import { StatusEnum } from '../../../../types/enums'
import type { KeyValueCatalog } from '../../../../types/demarcacion'
import type { Folio as FolioType } from '../../../../types/folio'

vi.mock('../../../../services/credentialService', () => ({
  encryptCredential: vi.fn().mockResolvedValue('encrypted-password'),
}))

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
  user: { username: 'user', email: 'associated@test.com', phone: '4492221111' },
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

function section(title: string) {
  const root = screen.getByText(title).closest('section')
  if (!root) throw new Error(`Section "${title}" not found`)
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

function fillCreateForm() {
  const folioSection = section('Datos del Folio')
  fireEvent.change(field(folioSection, 'Folio'), {
    target: { value: 'F-2026' },
  })
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

  const representationSection = section('Representaciones')
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

  const userSection = section('Datos del Usuario')
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

describe('FolioForm - contacto compartido', () => {
  it('shows the user section first and only shows its contact fields there', () => {
    renderForm()

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent))
      .toEqual(['Datos del Usuario', 'Datos del Folio', 'Representaciones'])
    expect(section('Datos del Folio').queryByLabelText(/Correo Electrónico|Teléfono/)).toBeNull()
    expect(field(section('Datos del Usuario'), 'Teléfono')).toBeRequired()
  })

  it('sends the same contact for both records and uses the username without a prefix', async () => {
    const { onSubmit } = renderForm()

    fillCreateForm()
    submitForm()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@test.com',
      telefono: '4491112222',
      user: expect.objectContaining({
        username: 'user',
        password: 'encrypted-password',
        email: 'user@test.com',
        phone: '4491112222',
      }),
    }))
  })

  it('prefills the associated contact on edit and sends the edited contact in the Folio PUT shape', async () => {
    const { onSubmit } = renderForm({ editingFolio })
    const userSection = section('Datos del Usuario')
    expect(field(userSection, 'Usuario')).toHaveValue('user')
    expect(field(userSection, 'Correo Electrónico')).toHaveValue('associated@test.com')
    expect(field(userSection, 'Teléfono')).toHaveValue('4492221111')

    fireEvent.change(field(userSection, 'Correo Electrónico'), { target: { value: 'new@test.com' } })
    fireEvent.change(field(userSection, 'Teléfono'), { target: { value: '5550001111' } })
    submitForm()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      folio: 'F-2026', email: 'new@test.com', telefono: '5550001111',
    }))
    expect(onSubmit).not.toHaveBeenCalledWith(expect.objectContaining({ user: expect.anything() }))
  })

  it('fills the shared contact from dummy data', () => {
    renderForm({ dummyDataToFill: generateDummyData('folios', 'F-2026') })

    expect(field(section('Datos del Usuario'), 'Teléfono')).toHaveValue('4491234567')
    expect(field(section('Datos del Folio'), 'Folio')).toHaveValue('F-2026')
    expect(field(section('Datos del Folio'), 'Calle')).toHaveValue('Av. Reforma')
  })
})
