import { authClient, type ApiError } from './apiClient'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

export interface UserResponse {
  userId: number
  username: string
  role: string
}

export interface AuthError {
  message: string
  status: number
  type: 'credentials' | 'network' | 'token' | 'server'
}

function mapApiErrorToAuthError(error: ApiError): AuthError {
  const base = {
    status: error.status,
    message: error.message,
  }

  if (error.status === 0) {
    return { ...base, type: 'network', message: 'Error de conexión con el servidor' }
  }

  if (error.status === 401) {
    return { ...base, type: 'credentials', message: 'Credenciales incorrectas' }
  }

  if (error.status >= 500) {
    return { ...base, type: 'server', message: 'Error del servidor' }
  }

  return { ...base, type: 'server' }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const response = await authClient.post<LoginResponse>(
      '/login',
      { username, password } as LoginRequest,
      { includeAuth: false }
    )
    return response.data
  } catch (error) {
    throw mapApiErrorToAuthError(error as ApiError)
  }
}

export async function getCurrentUser(token: string): Promise<UserResponse> {
  try {
    authClient.setToken(token)
    const response = await authClient.get<UserResponse>('/me')
    return response.data
  } catch (error) {
    throw mapApiErrorToAuthError(error as ApiError)
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'status' in error &&
    'message' in error
  )
}