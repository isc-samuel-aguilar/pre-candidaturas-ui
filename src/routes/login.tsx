import { createFileRoute, redirect } from '@tanstack/react-router'
import { Box, Card, CardContent, Typography, TextField, Button, Alert, CircularProgress, Chip } from '@mui/material'
import { useState, useCallback, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { resolvePostLoginRoute } from '../utils/redirect'
import type { RouterContext } from '../main'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const { auth } = context as RouterContext
    if (auth.isAuthenticated) {
      throw redirect({ href: resolvePostLoginRoute(search.redirect, auth.user?.role) })
    }
  },
  component: LoginPage,
})

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000

const DEV_QUICK_FILL = [
  { label: 'Admin', username: 'admin', password: 'adminPassword' },
  { label: 'Validador', username: 'validator001', password: 'Test_123' },
  { label: 'Registro', username: '002AGS', password: 'Test_123' },
] as const

function LoginPage() {
  const navigate = Route.useNavigate()
  const { redirect: redirectTarget } = Route.useSearch()
  const { isDarkMode, toggleTheme } = useTheme()
  const { login, error, clearError, isLoading: authLoading, isAuthenticated, user } = useAuth()
  const [username, setUsername] = useState(import.meta.env.DEV ? 'admin' : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? 'adminPassword' : '')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate({ href: resolvePostLoginRoute(redirectTarget, user.role) })
    }
  }, [isAuthenticated, user, navigate, redirectTarget])

  const getLockoutTimeRemaining = useCallback(() => {
    if (!lockoutUntil) return 0
    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
    return remaining > 0 ? remaining : 0
  }, [lockoutUntil])

  const handleLockout = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS)
      setAttempts(0)
    }
  }, [attempts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLockedOut) return

    setLoading(true)
    clearError()

    try {
      await login(username, password)
    } catch {
      handleLockout()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
      </Box>

      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              Precandidaturas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ingrese sus credenciales para acceder
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoComplete="username"
              autoFocus
              disabled={isLockedOut || loading}
            />
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              disabled={isLockedOut || loading}
            />

            {import.meta.env.DEV && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {DEV_QUICK_FILL.map((cred) => (
                  <Chip
                    key={cred.label}
                    size="small"
                    label={cred.label}
                    disabled={isLockedOut || loading}
                    onClick={() => {
                      setUsername(cred.username)
                      setPassword(cred.password)
                      clearError()
                    }}
                  />
                ))}
              </Box>
            )}

            {isLockedOut && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Demasiados intentos. Intente nuevamente en {getLockoutTimeRemaining()} segundos.
              </Alert>
            )}

            {error && !isLockedOut && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error.message}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || authLoading || isLockedOut}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading || authLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}