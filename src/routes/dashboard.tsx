import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Box } from '@mui/material'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { runDummyData } from '../utils/dummyData'
import { Header } from './dashboard/components/Header'

interface NavItem {
  label: string
  to: string
  roles: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Captura de Folio', to: '/dashboard/folios', roles: ['ADMIN', 'VALIDATOR'] },
  { label: 'Registrar con Excel', to: '/dashboard/excel', roles: ['ADMIN', 'REGISTER'] },
  { label: 'Consultar', to: '/dashboard', roles: ['ADMIN', 'REGISTER', 'VALIDATOR'] },
  { label: 'Configurar', to: '/dashboard/configuracion', roles: ['ADMIN'] },
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

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.dummyData = runDummyData
    return () => {
      delete window.dummyData
    }
  }, [])

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
