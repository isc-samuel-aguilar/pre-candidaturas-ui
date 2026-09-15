import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { Box, AppBar, Toolbar, Typography, IconButton, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const { isDarkMode, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    logout()
    navigate({ to: '/login' })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenuOpen}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Precandidaturas PRD
          </Typography>

          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username || 'Usuario'}
          </Typography>

          <IconButton color="inherit" onClick={toggleTheme}>
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { handleMenuClose(); navigate({ to: '/dashboard' }) }}>
              Registrar
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate({ to: '/dashboard/excel' }) }}>
              Registrar con Excel
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate({ to: '/dashboard' }) }}>
              Consultar
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              Cerrar Sesion
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
