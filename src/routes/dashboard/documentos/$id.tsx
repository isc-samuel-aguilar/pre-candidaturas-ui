import { createFileRoute } from '@tanstack/react-router'
import { Typography, Box } from '@mui/material'

export const Route = createFileRoute('/dashboard/documentos/$id')({
  component: DocumentosPage,
})

function DocumentosPage() {
  const { id } = Route.useParams()

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Documentos del Registro #{id}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Esta seccion se implementara en task-ui-05.
      </Typography>
    </Box>
  )
}
