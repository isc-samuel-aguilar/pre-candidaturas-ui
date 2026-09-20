export interface DemarcacionCatalogo {
  id: number
  ambito: string
  demarcacion: string
  alias: string | null
}

export type DemarcacionStatus = 'POR_VALIDAR' | 'VALIDO' | 'ERROR' | null

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
  id: number
  folioDemarcacionId: number
  apellidoPaterno: string
  apellidoMaterno: string
  nombre: string
  claveIfe: string
  curp: string
  cargo: string
  status: string
  createdBy: string
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
