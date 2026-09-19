export interface FolioRepresentation {
  id?: number
  representation: string
  paternalLastName: string
  maternalLastName: string
  name: string
  voterKey: string
  phone: string
  createdBy?: string
  updatedBy?: string | null
  createdDate?: string
  updatedDate?: string | null
}

export interface FolioUser {
  username: string
  password: string
  name: string
  lastName: string
  motherLastName: string
  email: string
  phone: string
}

export interface Folio {
  id: number
  folio: string
  email: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  estado: string
  codigoPostal: string
  userId: number
  user: FolioUser | null
  representations: FolioRepresentation[]
  createdBy: string
  updatedBy: string | null
  createdDate: string
  updatedDate: string | null
}

export interface CreateFolioRequest {
  folio: string
  email: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  estado: string
  codigoPostal: string
  user: FolioUser
  representations: FolioRepresentation[]
}

export interface UpdateFolioRequest {
  folio: string
  email: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  estado: string
  codigoPostal: string
  representations: FolioRepresentation[]
}

export interface Configuration {
  id: number
  key: string
  value: string
  type: string
  description: string
}
