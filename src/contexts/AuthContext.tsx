import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface User {
  userId: number
  username: string
  role: string
}

interface AuthContextType {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    // Token is stored in memory only, not localStorage
    return null
  })

  const [user, setUser] = useState<User | null>(null)

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const isAuthenticated = token !== null

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout }}>
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
