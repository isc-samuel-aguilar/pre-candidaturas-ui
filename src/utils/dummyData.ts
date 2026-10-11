export type DummyDataProvider = () => void

declare global {
  interface Window {
    dummyData?: (section?: string) => void
  }
}

const providers = new Map<string, DummyDataProvider>()

export function resolveDummySection(
  pathname: string = window.location.pathname
): string {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  return lastSegment ?? ''
}

export function registerDummyDataProvider(
  section: string,
  provider: DummyDataProvider
): () => void {
  providers.set(section, provider)
  return () => {
    if (providers.get(section) === provider) {
      providers.delete(section)
    }
  }
}

export function runDummyData(section?: string): void {
  const key = section ?? resolveDummySection()
  const provider = providers.get(key)
  if (!provider) {
    console.warn(`dummyData: no provider registered for section "${key}"`)
    return
  }
  provider()
}

export interface DummyFolioData {
  folio: string
  email: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  estado: string
  codigoPostal: string
  representations: {
    representation: string
    paternalLastName: string
    maternalLastName: string
    name: string
    voterKey: string
    phone: string
  }[]
  user: {
    username: string
    password: string
    name: string
    lastName: string
    motherLastName: string
    email: string
    phone: string
  }
}

export function generateDummyData(path: string, currentFolio: string): DummyFolioData | null {
  if (path === 'folios') {
    // sin registros en "Folios Registrados" el primer folio es 001
    const folio = currentFolio || '001'
    return {
      folio,
      email: `${folio}@test.com`,
      calle: 'Av. Reforma',
      numero: '123',
      colonia: 'Centro',
      municipio: 'Aguascalientes',
      estado: 'Aguascalientes',
      codigoPostal: '20000',
      representations: [
        {
          representation: 'PROPIETARIA',
          paternalLastName: `${folio} Lopez`,
          maternalLastName: 'Garcia',
          name: 'Juan Carlos',
          voterKey: 'ESESOS82040501H800',
          phone: '4491234567',
        },
        {
          representation: 'SUPLENTE',
          paternalLastName: `${folio} Hernandez`,
          maternalLastName: 'Lopez',
          name: 'Maria Elena',
          voterKey: 'ESESOS82040502M800',
          phone: '4492345678',
        },
        {
          representation: 'FINANCIERA',
          paternalLastName: `${folio} Garcia`,
          maternalLastName: 'Hernandez',
          name: 'Pedro Antonio',
          voterKey: 'ESESOS82040503H800',
          phone: '4493456789',
        },
      ],
      user: {
        username: 'AGS',
        password: 'Test_123',
        name: 'Juan Carlos',
        lastName: `${folio} Lopez`,
        motherLastName: 'Garcia',
        email: `${folio}@test.com`,
        phone: '4491234567',
      },
    }
  } 

  console.warn(`dummyData: no data generator for path "${path}"`)
  return null
}
