import { describe, it, expect } from 'vitest'
import { resolvePostLoginRoute } from './redirect'

describe('resolvePostLoginRoute', () => {
  it('returns the redirect target for valid internal paths', () => {
    expect(resolvePostLoginRoute('/dashboard/excel/002AGS', 'VALIDATOR')).toBe('/dashboard/excel/002AGS')
  })

  it('keeps query strings and hashes of internal paths', () => {
    expect(resolvePostLoginRoute('/dashboard/folios?tab=1', 'ADMIN')).toBe('/dashboard/folios?tab=1')
  })

  it('falls back to folios for non-REGISTER roles when redirect is missing', () => {
    expect(resolvePostLoginRoute(undefined, 'VALIDATOR')).toBe('/dashboard/folios')
    expect(resolvePostLoginRoute(undefined, 'ADMIN')).toBe('/dashboard/folios')
    expect(resolvePostLoginRoute(undefined, undefined)).toBe('/dashboard/folios')
  })

  it('falls back to excel for REGISTER when redirect is missing', () => {
    expect(resolvePostLoginRoute(undefined, 'REGISTER')).toBe('/dashboard/excel')
  })

  it('rejects external URLs', () => {
    expect(resolvePostLoginRoute('https://evil.example', 'VALIDATOR')).toBe('/dashboard/folios')
    expect(resolvePostLoginRoute('javascript:alert(1)', 'VALIDATOR')).toBe('/dashboard/folios')
  })

  it('rejects protocol-relative URLs', () => {
    expect(resolvePostLoginRoute('//evil.example', 'VALIDATOR')).toBe('/dashboard/folios')
  })

  it('rejects redirects back to the login page to avoid loops', () => {
    expect(resolvePostLoginRoute('/login', 'ADMIN')).toBe('/dashboard/folios')
    expect(resolvePostLoginRoute('/login?redirect=%2Fdashboard', 'ADMIN')).toBe('/dashboard/folios')
  })

  it('falls back when the redirect is the root path, which has no route', () => {
    expect(resolvePostLoginRoute('/', 'ADMIN')).toBe('/dashboard/folios')
    expect(resolvePostLoginRoute('/', undefined)).toBe('/dashboard/folios')
    expect(resolvePostLoginRoute('/?tab=1', 'REGISTER')).toBe('/dashboard/excel')
  })

  it('uses excel fallback for REGISTER even with an invalid redirect', () => {
    expect(resolvePostLoginRoute('https://evil.example', 'REGISTER')).toBe('/dashboard/excel')
  })
})
