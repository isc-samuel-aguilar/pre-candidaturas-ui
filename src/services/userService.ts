import { authClient } from './apiClient'
import { encryptCredential } from './credentialService'

export const administrativeRoles = ['ADMIN', 'VALIDATOR'] as const

export interface UserFields {
  username: string
  password: string
  name: string
  lastName: string
  motherLastName: string
  email: string
  phone: string
  roleName: string
}

export interface ManagedUser extends Omit<UserFields, 'password' | 'roleName'> {
  id: number
  enabled: boolean
  role: { name: string }
}

export async function listUsers(): Promise<ManagedUser[]> {
  return (await authClient.get<ManagedUser[]>('/users')).data
}

export async function createUser(fields: UserFields): Promise<void> {
  await authClient.post('/users', { ...fields, password: await encryptCredential(fields.password) })
}

export async function updateUser(user: ManagedUser, fields: UserFields): Promise<void> {
  const { password, roleName, ...profile } = fields
  await authClient.put(`/users/${user.id}`, {
    ...profile,
    roleName: roleName === user.role.name ? undefined : roleName,
    password: password.trim() ? await encryptCredential(password) : undefined,
  })
}

export async function deleteUser(userId: number): Promise<void> {
  await authClient.delete(`/users/${userId}`)
}
