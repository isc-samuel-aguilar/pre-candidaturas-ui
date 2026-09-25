import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateDummyData,
  registerDummyDataProvider,
  resolveDummySection,
  runDummyData,
} from './dummyData'

describe('resolveDummySection', () => {
  it('returns the last section of a nested path', () => {
    expect(resolveDummySection('/parte1/parte2/parte3')).toBe('parte3')
  })

  it('returns the last section ignoring the trailing slash', () => {
    expect(resolveDummySection('/dashboard/folios/')).toBe('folios')
  })

  it('returns the only section of a short path', () => {
    expect(resolveDummySection('/dashboard')).toBe('dashboard')
  })

  it('returns an empty string for the root path', () => {
    expect(resolveDummySection('/')).toBe('')
    expect(resolveDummySection('')).toBe('')
  })

  it('uses window.location.pathname by default, ignoring query string and hash', () => {
    window.history.pushState({}, '', '/parte1/parte2/parte3?aux=test#frag')
    expect(resolveDummySection()).toBe('parte3')
    window.history.pushState({}, '', '/')
  })
})

describe('registerDummyDataProvider / runDummyData', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    warn.mockRestore()
    window.history.pushState({}, '', '/')
  })

  it('invokes the provider registered for the section', () => {
    const provider = vi.fn()
    const unregister = registerDummyDataProvider('folios', provider)

    runDummyData('folios')

    expect(provider).toHaveBeenCalledTimes(1)
    unregister()
  })

  it('stops invoking the provider after unregister', () => {
    const provider = vi.fn()
    const unregister = registerDummyDataProvider('folios', provider)
    unregister()

    runDummyData('folios')

    expect(provider).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      'dummyData: no provider registered for section "folios"'
    )
  })

  it('does not remove a newer provider when an old cleanup runs', () => {
    const oldProvider = vi.fn()
    const newProvider = vi.fn()
    const oldCleanup = registerDummyDataProvider('folios', oldProvider)
    const newCleanup = registerDummyDataProvider('folios', newProvider)

    oldCleanup()
    runDummyData('folios')

    expect(oldProvider).not.toHaveBeenCalled()
    expect(newProvider).toHaveBeenCalledTimes(1)
    newCleanup()
  })

  it('derives the section from the current URL when no argument is given', () => {
    window.history.pushState({}, '', '/dashboard/folios')
    const provider = vi.fn()
    const unregister = registerDummyDataProvider('folios', provider)

    runDummyData()

    expect(provider).toHaveBeenCalledTimes(1)
    unregister()
  })

  it('derives the section from the URL ignoring the query string', () => {
    window.history.pushState({}, '', '/dashboard/folios?foo=bar')
    const provider = vi.fn()
    const unregister = registerDummyDataProvider('folios', provider)

    runDummyData()

    expect(provider).toHaveBeenCalledTimes(1)
    unregister()
  })

  it('gives precedence to the explicit section over the URL', () => {
    window.history.pushState({}, '', '/dashboard/excel')
    const provider = vi.fn()
    const unregister = registerDummyDataProvider('folios', provider)

    runDummyData('folios')

    expect(provider).toHaveBeenCalledTimes(1)
    unregister()
  })

  it('warns without throwing when there is no provider for the URL section', () => {
    window.history.pushState({}, '', '/dashboard')

    expect(() => runDummyData()).not.toThrow()
    expect(warn).toHaveBeenCalledWith(
      'dummyData: no provider registered for section "dashboard"'
    )
  })

  it('warns when the requested section has no provider', () => {
    expect(() => runDummyData('excel')).not.toThrow()
    expect(warn).toHaveBeenCalledWith(
      'dummyData: no provider registered for section "excel"'
    )
  })
})

describe('generateDummyData', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('returns folio dummy data for the "folios" path', () => {
    const data = generateDummyData('folios', '007')

    expect(data).not.toBeNull()
    expect(data?.folio).toBe('007')
    expect(data?.user.username).toBe('AGS')
    expect(data?.representations).toHaveLength(3)
    expect(data?.representations[0]?.representation).toBe('PROPIETARIA')
  })

  it('returns null and warns for an unknown path', () => {
    expect(generateDummyData('excel', '007')).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      'dummyData: no data generator for path "excel"'
    )
  })
})
