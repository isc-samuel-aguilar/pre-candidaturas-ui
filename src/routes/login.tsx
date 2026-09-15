import { createFileRoute, redirect } from '@tanstack/react-router'
import { Box, Card, CardContent, Typography, TextField, Button, Alert, CircularProgress, IconButton } from '@mui/material'
import { useState } from 'react'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import type { RouterContext } from '../main'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    if (auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = Route.useNavigate()
  const { isDarkMode, toggleTheme } = useTheme()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    // TODO: Implement login logic in task-ui-02
    console.log('Login attempt:', { username, password })
    login('dummy-token', { userId: 1, username, role: 'ADMIN' })
    setLoading(false)
    navigate({ to: '/dashboard' })
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
      <IconButton
        onClick={toggleTheme}
        sx={{ position: 'absolute', top: 16, right: 16 }}
        color="inherit"
      >
        {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>

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
              Precandidaturas PRD
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
            />
            <TextField
              fullWidth
              label="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Iniciar Sesion'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
