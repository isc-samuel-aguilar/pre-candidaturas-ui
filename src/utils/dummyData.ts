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
  if (path !== 'folio') {
    console.warn('path not found')
    return null
  }

  return {
    folio: currentFolio,
    email: `${currentFolio}@test.com`,
    calle: 'Av. Reforma',
    numero: '123',
    colonia: 'Centro',
    municipio: 'Aguascalientes',
    estado: 'Aguascalientes',
    codigoPostal: '20000',
    representations: [
      {
        representation: 'PROPIETARIA',
        paternalLastName: `${currentFolio} Lopez`,
        maternalLastName: 'Garcia',
        name: 'Juan Carlos',
        voterKey: 'ESESOS82040501H800',
        phone: '4491234567',
      },
      {
        representation: 'SUPLENTE',
        paternalLastName: `${currentFolio} Hernandez`,
        maternalLastName: 'Lopez',
        name: 'Maria Elena',
        voterKey: 'ESESOS82040502M800',
        phone: '4492345678',
      },
      {
        representation: 'FINANCIERA',
        paternalLastName: `${currentFolio} Garcia`,
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
      lastName: `${currentFolio} Lopez`,
      motherLastName: 'Garcia',
      email: `${currentFolio}@test.com`,
      phone: '4491234567',
    },
  }
}
