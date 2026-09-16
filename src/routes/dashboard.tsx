import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { Box } from '@mui/material'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { Header } from './dashboard/components/Header'

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

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        navItems={NAV_ITEMS}
        user={user}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
