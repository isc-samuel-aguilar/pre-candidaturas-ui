import { IconButton } from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'

interface ThemeToggleProps {
  isDarkMode: boolean
  onToggleTheme: () => void
}

export function ThemeToggle({ isDarkMode, onToggleTheme }: ThemeToggleProps) {
  return (
    <IconButton color="inherit" onClick={onToggleTheme} sx={{ mr: 1 }}>
      {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  )
}
