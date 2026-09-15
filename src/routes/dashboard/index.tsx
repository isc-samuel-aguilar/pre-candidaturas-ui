import { createFileRoute } from '@tanstack/react-router'
import { Typography, Box } from '@mui/material'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Consulta de Registros
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Esta seccion se implementara en task-ui-05.
      </Typography>
    </Box>
  )
}
