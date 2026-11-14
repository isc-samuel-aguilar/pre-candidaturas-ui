import { authClient } from './apiClient'

const algorithm = { name: 'RSA-OAEP', hash: 'SHA-256' }
const encoder = new TextEncoder()

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(value: string): Uint8Array {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0))
}

function getCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Se requiere una conexión segura para proteger las credenciales.')
  }
  return globalThis.crypto.subtle
}

export async function encryptCredential(value: string, label?: string): Promise<string> {
  const subtle = getCrypto()
  const { data } = await authClient.get<{ publicKey: string }>('/credential-key', {
    includeAuth: false,
  })
  const key = await subtle.importKey('spki', decodeBase64Url(data.publicKey), algorithm, false, ['encrypt'])
  const options: RsaOaepParams = label === undefined
    ? { name: algorithm.name }
    : { name: algorithm.name, label: encoder.encode(label) }
  const encrypted = await subtle.encrypt(options, key, encoder.encode(value))
  return encodeBase64Url(new Uint8Array(encrypted))
}

export async function revealCredential(userId: number, recoveryPassword: string): Promise<string> {
  const subtle = getCrypto()
  const keys = await subtle.generateKey(
    { ...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    false,
    ['encrypt', 'decrypt'],
  )
  const publicKey = encodeBase64Url(new Uint8Array(await subtle.exportKey('spki', keys.publicKey)))
  const { data } = await authClient.post<{ password: string }>(`/users/${userId}/password/reveal`, {
    recoveryPassword: await encryptCredential(recoveryPassword, publicKey),
    publicKey,
  }, { cache: 'no-store' })
  const decrypted = await subtle.decrypt({ name: algorithm.name }, keys.privateKey, decodeBase64Url(data.password))
  return new TextDecoder().decode(decrypted)
}
