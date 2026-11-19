import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExamplesSection } from './ExamplesSection'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  downloadDemoFile: vi.fn(),
}))

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('../../../../services/demoFilesService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../services/demoFilesService')>()
  return {
    ...actual,
    downloadDemoFile: mocks.downloadDemoFile,
  }
})

const EXPECTED_PAIRS: Array<[string, string]> = [
  ['EJEMPLO LLENADO - AYTO AGUASCALIENTES.xlsx', 'AYTO AGUASCALIENTES.xlsx'],
  ['EJEMPLO LLENADO - AYTOS MAS DE 30 HAB.xlsx', 'AYTOS MAS DE 30 HAB.xlsx'],
  ['EJEMPLO LLENADO - AYTOS MENOS DE 30 HAB.xlsx', 'AYTOS MENOS DE 30 HAB.xlsx'],
  ['EJEMPLO LLENADO - DIP MR.xlsx', 'DIPUTADO MR.xlsx'],
  ['EJEMPLO LLENADO - DIPUTADO RP.xlsx', 'DIPUTADO RP.xlsx'],
  ['EJEMPLO LLENADO - GUBERNATURA.xlsx', 'GUBERNATURA.xlsx'],
]

function expandSection() {
  fireEvent.click(screen.getByRole('button', { name: /Ejemplos de archivos/i }))
}

describe('ExamplesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ token: 'token123' })
    mocks.downloadDemoFile.mockResolvedValue(undefined)
  })

  it('starts collapsed', () => {
    render(<ExamplesSection />)

    const summary = screen.getByRole('button', { name: /Ejemplos de archivos/i })
    expect(summary).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows two columns with the six exact filename pairs', () => {
    render(<ExamplesSection />)
    expandSection()

    expect(screen.getByText('Archivos de ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Archivos Limpios')).toBeInTheDocument()

    EXPECTED_PAIRS.forEach(([example, clean]) => {
      expect(screen.getByText(example)).toBeInTheDocument()
      expect(screen.getByText(clean)).toBeInTheDocument()
    })

    expect(screen.getAllByRole('row')).toHaveLength(EXPECTED_PAIRS.length + 1)
  })

  it('validates the session through the service when clicking an example file', () => {
    render(<ExamplesSection />)
    expandSection()

    fireEvent.click(screen.getByText('EJEMPLO LLENADO - DIP MR.xlsx'))

    expect(mocks.downloadDemoFile).toHaveBeenCalledTimes(1)
    expect(mocks.downloadDemoFile).toHaveBeenCalledWith('token123', 'diputado-mr', 'example')
  })

  it('requests the clean file type from the clean column', () => {
    render(<ExamplesSection />)
    expandSection()

    fireEvent.click(screen.getByText('DIPUTADO RP.xlsx'))

    expect(mocks.downloadDemoFile).toHaveBeenCalledWith('token123', 'diputado-rp', 'clean')
  })

  it('informs a missing file without blocking the other cell', async () => {
    mocks.downloadDemoFile.mockRejectedValue({
      message: 'Archivo no disponible',
      type: 'missing',
    })

    render(<ExamplesSection />)
    expandSection()
    fireEvent.click(screen.getByText('GUBERNATURA.xlsx'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Archivo no disponible')

    fireEvent.click(screen.getByText('EJEMPLO LLENADO - GUBERNATURA.xlsx'))
    expect(mocks.downloadDemoFile).toHaveBeenLastCalledWith(
      'token123',
      'gubernatura',
      'example'
    )
  })

  it('informs an invalid session when the service rejects the token', async () => {
    mocks.downloadDemoFile.mockRejectedValue({
      message: 'Sesión inválida. Inicie sesión nuevamente',
      type: 'session',
    })

    render(<ExamplesSection />)
    expandSection()
    fireEvent.click(screen.getByText('AYTO AGUASCALIENTES.xlsx'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sesión inválida. Inicie sesión nuevamente'
    )
  })

  it('falls back to a generic message for unexpected errors', async () => {
    mocks.downloadDemoFile.mockRejectedValue(new Error('boom'))

    render(<ExamplesSection />)
    expandSection()
    fireEvent.click(screen.getByText('AYTO AGUASCALIENTES.xlsx'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo descargar el archivo'
    )
  })
})
