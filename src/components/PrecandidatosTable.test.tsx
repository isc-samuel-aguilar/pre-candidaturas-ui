import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { PrecandidatosTable } from './PrecandidatosTable'
import { StatusEnum } from '../types/enums'
import type { Documento, Precandidato } from '../types/demarcacion'

const mocks = vi.hoisted(() => ({
  getPrecandidatos: vi.fn(),
  getDocumentsByPrecandidato: vi.fn(),
  getDocumentTypes: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  downloadDocumentFile: vi.fn(),
  updateDocumentStatus: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('../services/demarcacionService', () => ({
  getPrecandidatos: mocks.getPrecandidatos,
}))

vi.mock('../services/documentService', () => ({
  getDocumentsByPrecandidato: mocks.getDocumentsByPrecandidato,
  getDocumentTypes: mocks.getDocumentTypes,
  uploadDocument: mocks.uploadDocument,
  deleteDocument: mocks.deleteDocument,
  downloadDocumentFile: mocks.downloadDocumentFile,
  updateDocumentStatus: mocks.updateDocumentStatus,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

const precandidato: Precandidato = {
  id: 7,
  cargo: 'Regiduria',
  calidad: 'Titular',
  genero: 'Mujer',
  accionAfirmativa: 'No',
  internoExterno: 'Interno',
  apellidoPaterno: 'Lopez',
  apellidoMaterno: 'Ruiz',
  nombre: 'Maria',
  claveIfe: '00000000000000',
  ocr: '',
  curp: 'LORM880101MDFXXX01',
  rfcHomoclave: 'LORM880101AA1',
  municipioDondeNacio: '',
  estadoDondeNacio: '',
  ocupacion: '',
  calleDondeVive: '',
  numeroDondeVive: '',
  coloniaDondeVive: '',
  municipioDondeVive: '',
  estadoDondeVive: '',
  codigoPostal: '',
  tiempoDeResidenciaEnDomicilio: '',
  telefono: '55555555',
  correoElectronico: 'maria@example.com',
  escolaridad: '',
  carrera: '',
  lugarDondeTrabaja: '',
  puestoEnSuTrabajo: '',
  fechaIngresoTrabajo: '',
  fechaTerminacionTrabajo: '',
}

const documentFixture: Documento = {
  id: 10,
  keyValueCatalogId: 1,
  keyValueCatalogKey: 'DOCUMENT_TYPE',
  keyValueCatalogValue: 'INE',
  keyValueCatalogDescription: 'Credencial INE',
  status: StatusEnum.POR_VALIDAR,
  statusDescription: null,
  bucketName: 'bucket',
  objectKey: 'key',
  originalFilename: 'ine.pdf',
  preCandidatoId: 7,
  createdDate: '2026-01-01T00:00:00',
}

const documentTypes = [
  {
    id: 1,
    key: 'DOCUMENT_TYPE',
    value: 'INE',
    type: 'DOCUMENT_TYPE',
    description: 'Credencial INE',
    createdDate: '2026-01-01T00:00:00',
  },
]

async function renderAndExpand(
  props: Partial<ComponentProps<typeof PrecandidatosTable>> = {}
) {
  render(
    <PrecandidatosTable
      folioId={1}
      demarcacionName="ASIENTOS"
      demarcacionStatus={StatusEnum.VALIDO}
      {...props}
    />
  )

  const [expandButton] = await screen.findAllByRole('button')
  if (!expandButton) throw new Error('Expand button not found')
  fireEvent.click(expandButton)

  await waitFor(() => expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalled())
}

describe('PrecandidatosTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ token: 'token', user: { role: 'VALIDATOR' } })
    mocks.getPrecandidatos.mockResolvedValue([precandidato])
    mocks.getDocumentTypes.mockResolvedValue(documentTypes)
    mocks.getDocumentsByPrecandidato.mockResolvedValue([documentFixture])
    mocks.updateDocumentStatus.mockResolvedValue({
      ...documentFixture,
      status: StatusEnum.VALIDO,
      statusDescription: 'OK',
    })
  })

  it('keeps upload controls and hides validation controls when allowDocValidation is false', async () => {
    await renderAndExpand({ allowDocActions: true, allowDocValidation: false })

    await screen.findByText('Tipo')
    expect(screen.getAllByText('Subir').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Eliminar').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Validar')).toHaveLength(0)
    expect(screen.queryAllByText('Comentario')).toHaveLength(0)
    expect(screen.queryAllByText('Acciones')).toHaveLength(0)
  })

  it('shows the validation controls and hides upload controls when allowDocValidation is true', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    await screen.findByText('Tipo')
    expect(screen.getAllByText('Validar').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Comentario').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Acciones').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Subir')).toHaveLength(0)
    expect(screen.queryAllByText('Eliminar')).toHaveLength(0)
  })

  it('expands the precandidato when only allowDocValidation is set (expansion fix)', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(mocks.getDocumentsByPrecandidato).toHaveBeenCalledWith(7)
    expect(screen.getByText('ine.pdf')).toBeInTheDocument()
  })

  it('saves the status with the comment through updateDocumentStatus', async () => {
    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    const saveButton = screen.getByRole('button', { name: 'Guardar' })
    expect(saveButton).toBeDisabled()

    fireEvent.mouseDown(screen.getByLabelText('Validar'))
    fireEvent.click(await screen.findByRole('option', { name: 'Válido' }))

    fireEvent.change(screen.getByPlaceholderText('Comentario...'), {
      target: { value: 'Documentación correcta' },
    })

    const enabledSave = screen.getByRole('button', { name: 'Guardar' })
    expect(enabledSave).toBeEnabled()

    fireEvent.click(enabledSave)

    await waitFor(() => {
      expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(10, {
        status: StatusEnum.VALIDO,
        statusDescription: 'Documentación correcta',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Documento actualizado correctamente')).toBeInTheDocument()
    })
  })

  it('shows an error message when the documents cannot be loaded', async () => {
    mocks.getDocumentsByPrecandidato.mockRejectedValue({ message: 'Prohibido', status: 403 })

    await renderAndExpand({ allowDocActions: false, allowDocValidation: true })

    expect(
      await screen.findByText('No se pudieron cargar los documentos')
    ).toBeInTheDocument()
    expect(mocks.updateDocumentStatus).not.toHaveBeenCalled()
  })
})
