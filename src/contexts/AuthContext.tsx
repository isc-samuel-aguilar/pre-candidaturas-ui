import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { login as authLogin, getCurrentUser, isAuthError, type AuthError } from '../services/authService'
import { apiClient } from '../services/apiClient'

interface User {
  userId: number
  username: string
  role: string
}

interface SessionData {
  token: string
  expiresAt: number
}

interface AuthContextType {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  clearError: () => void
}

const SESSION_KEY = 'precandidaturas_session'
const TOKEN_EXPIRY_HOURS = 8

function getSessionFromStorage(): SessionData | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const session: SessionData = JSON.parse(stored)
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }

    return session
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function saveSessionToStorage(token: string): void {
  const session: SessionData = {
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function removeSessionFromStorage(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const session = getSessionFromStorage()
    return session?.token ?? null
  })

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    apiClient.setToken(token)
  }, [token])

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null)
      setUser(null)
      setError(null)
      removeSessionFromStorage()
      apiClient.setToken(null)
    }

    apiClient.setOnUnauthorized(handleUnauthorized)
    return () => apiClient.setOnUnauthorized(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    getCurrentUser(token)
      .then((userData) => {
        if (!cancelled) setUser(userData)
      })
      .catch((err) => {
        if (cancelled) return
        if (isAuthError(err) && err.type === 'token') {
          setToken(null)
          removeSessionFromStorage()
        }
        setError(err as AuthError)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [token])

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    setIsLoading(true)
    setError(null)

    try {
      const loginResponse = await authLogin(username, password)
      setToken(loginResponse.token)
      saveSessionToStorage(loginResponse.token)

      const userData = await getCurrentUser(loginResponse.token)
      setUser(userData)
      setIsLoading(false)
      return userData
    } catch (err) {
      setError(err as AuthError)
      setIsLoading(false)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setError(null)
    removeSessionFromStorage()
    apiClient.setToken(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const isAuthenticated = token !== null && user !== null

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}