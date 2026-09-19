import { createFileRoute } from '@tanstack/react-router'
import { Typography, Box } from '@mui/material'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Bienvenido
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Seleccione una opción del menú superior para comenzar.
      </Typography>
    </Box>
  )
}
