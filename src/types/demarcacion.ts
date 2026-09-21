import type { StatusEnum } from './enums'

export type DemarcacionStatus = StatusEnum | null

export interface DemarcacionCatalogo {
  id: number
  ambito: string
  demarcacion: string
  alias: string | null
}

export interface FolioDemarcacion {
  id: number
  folioId: number
  folio: string
  demarcacionId: number
  ambito: string
  demarcacion: string
  alias: string | null
  status: DemarcacionStatus
  statusDescription: string | null
  createdDate: string
}

export interface DemarcacionRow {
  catalogo: DemarcacionCatalogo
  folioDemarcacion: FolioDemarcacion | null
  status: DemarcacionStatus
}

export interface DemarcacionDetail {
  id: number
  folioId: number
  ambito: string
  demarcacion: string
  alias: string | null
  status: DemarcacionStatus
  statusDescription: string | null
  createdDate: string
  precandidatos: Precandidato[]
}

export interface Precandidato {
  id?: number
  folioDemarcacionId?: number
  cargo: string
  calidad: string
  genero: string
  accionAfirmativa: string
  internoExterno: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombre: string
  claveIfe: string
  ocr: string
  curp: string
  rfcHomoclave: string
  municipioDondeNacio: string
  estadoDondeNacio: string
  ocupacion: string
  calleDondeVive: string
  numeroDondeVive: string
  coloniaDondeVive: string
  municipioDondeVive: string
  estadoDondeVive: string
  codigoPostal: string
  tiempoDeResidenciaEnDomicilio: string
  telefono: string
  correoElectronico: string
  escolaridad: string
  carrera: string
  lugarDondeTrabaja: string
  puestoEnSuTrabajo: string
  fechaIngresoTrabajo: string
  fechaTerminacionTrabajo: string
}

export interface Documento {
  id: number
  catalogId: number
  catalogKey: string
  catalogValue: string
  catalogDescription: string
  status: StatusEnum | null
  bucketName: string | null
  objectKey: string | null
  preCandidatoId: number
  createdDate: string
}

export interface CatalogKeyValue {
  id: number
  key: string
  value: string
  type: string
  description: string
  createdDate: string
}

export interface ExcelImportResult {
  rowNumber: number
  apellidoPaterno: string
  apellidoMaterno: string
  nombre: string
  claveIfe: string
  curp: string
  status: string
  error: string | null
}
