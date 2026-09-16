import { Link } from '@tanstack/react-router'
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material'
import { ThemeToggle } from '../../../components/ThemeToggle'

interface NavItem {
  label: string
  to: string
  roles: string[]
}

interface HeaderProps {
  navItems: NavItem[]
  user: { username: string; role: string } | null
  onLogout: () => void
  isDarkMode: boolean
  onToggleTheme: () => void
}

export function Header({ navItems, user, onLogout, isDarkMode, onToggleTheme }: HeaderProps) {
  const visibleItems = navItems.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  )

  return (
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

        <ThemeToggle isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />

        <Button color="inherit" onClick={onLogout} sx={{ textTransform: 'none' }}>
          Cerrar Sesión
        </Button>
      </Toolbar>
    </AppBar>
  )
}
