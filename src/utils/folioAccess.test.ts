import { describe, it, expect } from 'vitest'
import { resolveFolioAccess } from './folioAccess'
import type { Folio } from '../types/folio'

function buildFolio(id: number, folio: string): Folio {
  return {
    id,
    folio,
    email: 'test@test.com',
    calle: 'Calle',
    numero: '1',
    colonia: 'Centro',
    municipio: 'Aguascalientes',
    estado: 'Aguascalientes',
    codigoPostal: '20000',
    userId: 10,
    user: { username: 'testuser' },
    status: null,
    representations: [],
    createdBy: 'admin',
    updatedBy: null,
    createdDate: '2026-01-01T00:00:00',
    updatedDate: null,
  }
}

describe('resolveFolioAccess', () => {
  it('allows REGISTER when myFolio matches the folio param', () => {
    const result = resolveFolioAccess({
      role: 'REGISTER',
      folioParam: '002',
      myFolio: buildFolio(24, '002'),
    })

    expect(result).toEqual({ status: 'ok', folioId: 24 })
  })

  it('denies REGISTER when myFolio does not match the folio param', () => {
    const result = resolveFolioAccess({
      role: 'REGISTER',
      folioParam: '003',
      myFolio: buildFolio(24, '002'),
    })

    expect(result).toEqual({ status: 'denied' })
  })

  it('denies REGISTER when myFolio is missing', () => {
    const result = resolveFolioAccess({
      role: 'REGISTER',
      folioParam: '002',
      myFolio: null,
    })

    expect(result).toEqual({ status: 'denied' })
  })

  it('allows ADMIN when the folio exists in the list', () => {
    const result = resolveFolioAccess({
      role: 'ADMIN',
      folioParam: '002',
      folios: [buildFolio(23, '001'), buildFolio(24, '002')],
    })

    expect(result).toEqual({ status: 'ok', folioId: 24 })
  })

  it('allows VALIDATOR when the folio exists in the list', () => {
    const result = resolveFolioAccess({
      role: 'VALIDATOR',
      folioParam: '002',
      folios: [buildFolio(24, '002')],
    })

    expect(result).toEqual({ status: 'ok', folioId: 24 })
  })

  it('returns not_found for ADMIN/VALIDATOR when the folio is not in the list', () => {
    const result = resolveFolioAccess({
      role: 'ADMIN',
      folioParam: '999',
      folios: [buildFolio(24, '002')],
    })

    expect(result).toEqual({ status: 'not_found' })
  })

  it('returns not_found when the folio list is empty', () => {
    const result = resolveFolioAccess({
      role: 'VALIDATOR',
      folioParam: '002',
      folios: [],
    })

    expect(result).toEqual({ status: 'not_found' })
  })

  it('denies when role is undefined', () => {
    const result = resolveFolioAccess({ role: undefined, folioParam: '002' })

    expect(result).toEqual({ status: 'denied' })
  })

  it('denies unknown roles', () => {
    const result = resolveFolioAccess({
      role: 'GUEST',
      folioParam: '002',
      folios: [buildFolio(24, '002')],
    })

    expect(result).toEqual({ status: 'denied' })
  })
})
