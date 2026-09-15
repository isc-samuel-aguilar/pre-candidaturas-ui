import { createFileRoute } from '@tanstack/react-router'
import { Typography, Box } from '@mui/material'

export const Route = createFileRoute('/dashboard/excel')({
  component: ExcelPage,
})

function ExcelPage() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Captura con Excel
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Esta seccion se implementara en task-ui-04.
      </Typography>
    </Box>
  )
}
