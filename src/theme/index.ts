import { createTheme } from '@mui/material/styles'

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#003366', // Azul Marino PRD
      light: '#1a4d80',
      dark: '#002244',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#FFD100', // Amarillo PRD
      light: '#FFE033',
      dark: '#CCB000',
      contrastText: '#000000',
    },
    error: {
      main: '#CC0000', // Rojo PRD
      light: '#FF3333',
      dark: '#990000',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
})

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4d94ff', // Azul Marino PRD (claro para dark mode)
      light: '#80b3ff',
      dark: '#003366',
      contrastText: '#000000',
    },
    secondary: {
      main: '#FFD100', // Amarillo PRD
      light: '#FFE033',
      dark: '#CCB000',
      contrastText: '#000000',
    },
    error: {
      main: '#FF6666', // Rojo PRD (claro para dark mode)
      light: '#FF9999',
      dark: '#CC0000',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
})
