// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { login } from './authService'
import { revealCredential } from './credentialService'
import { updateUser, type ManagedUser, type UserFields } from './userService'

function decode(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (value) => value.charCodeAt(0))
}

function encode(value: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const algorithm = { name: 'RSA-OAEP', hash: 'SHA-256' }

async function setupServer() {
  const keys = await crypto.subtle.generateKey(
    { ...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    false,
    ['encrypt', 'decrypt'],
  )
  const publicKey = encode(await crypto.subtle.exportKey('spki', keys.publicKey))
  const handler = vi.fn(async (endpoint: string, request: RequestInit) => {
    if (endpoint.endsWith('/credential-key')) return Response.json({ publicKey })
    const body = JSON.parse(String(request.body))
    if (endpoint.endsWith('/login')) {
      expect(body.username).toBe('admin')
      expect(body.password).not.toBe('Example_123')
      expect(decoder.decode(await crypto.subtle.decrypt(algorithm, keys.privateKey, decode(body.password))))
        .toBe('Example_123')
      return Response.json({ token: 'test-token' })
    }
    if (endpoint.endsWith('/users/3/password/reveal')) {
      const label = encoder.encode(body.publicKey)
      expect(decoder.decode(await crypto.subtle.decrypt({ ...algorithm, label }, keys.privateKey, decode(body.recoveryPassword))))
        .toBe('recovery-secret')
      await expect(crypto.subtle.decrypt(algorithm, keys.privateKey, decode(body.recoveryPassword))).rejects.toThrow()
      const clientKey = await crypto.subtle.importKey('spki', decode(body.publicKey), algorithm, false, ['encrypt'])
      const encrypted = await crypto.subtle.encrypt(algorithm, clientKey, encoder.encode('Existing_123'))
      return Response.json({ password: encode(encrypted) })
    }
    if (endpoint.endsWith('/users/3')) {
      expect(body).not.toHaveProperty('password')
      expect(body).not.toHaveProperty('roleName')
      return new Response(null, { status: 204 })
    }
    throw new Error('Unexpected endpoint')
  })
  vi.stubGlobal('fetch', handler)
  return handler
}

describe('credential transport', () => {
  it('sends only the encrypted password in the login body', async () => {
    const fetch = await setupServer()
    const encrypt = vi.spyOn(crypto.subtle, 'encrypt')
    try {
      await expect(login('admin', 'Example_123')).resolves.toEqual({ token: 'test-token' })
      expect(fetch.mock.calls[1]?.[0]).toMatch(/\/login$/)
      expect(encrypt.mock.calls[0]?.[0]).not.toHaveProperty('label')
    } finally {
      encrypt.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('reveals a single credential using a browser-generated response key bound to the recovery request', async () => {
    await setupServer()
    try {
      await expect(revealCredential(3, 'recovery-secret')).resolves.toBe('Existing_123')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('omits a whitespace-only password when editing a user', async () => {
    const fetch = await setupServer()
    const profile = {
      username: 'existing', name: 'Ana', lastName: 'López', motherLastName: '',
      email: 'ana@example.test', phone: '4490001111',
    }
    const user: ManagedUser = { ...profile, id: 3, enabled: true, role: { name: 'REGISTER' } }
    const fields: UserFields = { ...profile, password: '   ', roleName: 'REGISTER' }
    try {
      await updateUser(user, fields)
      expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
