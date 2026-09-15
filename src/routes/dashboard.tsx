import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { Box, AppBar, Toolbar, Typography, IconButton, Button } from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  label: string
  to: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Registrar', to: '/dashboard', roles: ['ADMIN', 'REGISTER'] },
  { label: 'Registrar con Excel', to: '/dashboard/excel', roles: ['ADMIN', 'REGISTER'] },
  { label: 'Consultar', to: '/dashboard', roles: ['ADMIN', 'REGISTER'] },
]

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const { isDarkMode, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const visibleItems = NAV_ITEMS.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  )

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
            Precandidaturas
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
            {visibleItems.map((item) => (
              <Button
                key={item.label}
                color="inherit"
                component={Link}
                to={item.to}
                sx={{ textTransform: 'none' }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username || 'Usuario'}
          </Typography>

          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          <Button color="inherit" onClick={handleLogout} sx={{ textTransform: 'none' }}>
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}