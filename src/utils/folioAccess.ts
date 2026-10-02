import type { Folio } from '../types/folio'

export type FolioAccessResult =
  | { status: 'ok'; folioId: number }
  | { status: 'denied' }
  | { status: 'not_found' }

export interface FolioAccessInput {
  role: string | undefined
  folioParam: string
  myFolio?: Folio | null
  folios?: Folio[]
}

export function resolveFolioAccess({
  role,
  folioParam,
  myFolio,
  folios,
}: FolioAccessInput): FolioAccessResult {
  if (!role) return { status: 'denied' }

  if (role === 'REGISTER') {
    if (!myFolio || myFolio.folio !== folioParam) return { status: 'denied' }
    return { status: 'ok', folioId: myFolio.id }
  }

  if (role === 'ADMIN' || role === 'VALIDATOR') {
    const match = (folios ?? []).find((f) => f.folio === folioParam)
    if (!match) return { status: 'not_found' }
    return { status: 'ok', folioId: match.id }
  }

  return { status: 'denied' }
}
