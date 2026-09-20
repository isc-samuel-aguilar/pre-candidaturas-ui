import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { getMyFolio, getDemarcacionById } from '../../../services/demarcacionService'
import type { FolioDemarcacion } from '../../../types/demarcacion'

export const Route = createFileRoute('/dashboard/demarcaciones/$id')({
  component: DemarcacionDetailPage,
})

function DemarcacionDetailPage() {
  const { id } = Route.useParams()
  const [demarcacion, setDemarcacion] = useState<FolioDemarcacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const folio = await getMyFolio()
        const fd = await getDemarcacionById(folio.id, parseInt(id))
        setDemarcacion(fd)
      } catch {
        setError('No se pudo cargar la información de la demarcación')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'POR_VALIDAR':
        return 'Por Validar'
      case 'VALIDO':
        return 'Válido'
      case 'ERROR':
        return 'Error'
      default:
        return 'Sin cargar'
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'POR_VALIDAR':
        return 'warning'
      case 'VALIDO':
        return 'success'
      case 'ERROR':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !demarcacion) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          {error || 'Demarcación no encontrada'}
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => window.history.back()}
          sx={{ mt: 2 }}
        >
          Volver
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => window.history.back()}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Typography variant="h5" gutterBottom>
        Detalle de Demarcación
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Ámbito
            </Typography>
            <Typography variant="body1">{demarcacion.ambito}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Demarcación
            </Typography>
            <Typography variant="body1">{demarcacion.demarcacion}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Alias
            </Typography>
            <Typography variant="body1">{demarcacion.alias || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={getStatusLabel(demarcacion.status)}
              color={getStatusColor(demarcacion.status) as 'warning' | 'success' | 'error' | 'default'}
              size="small"
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Descripción de Status
            </Typography>
            <Typography variant="body1">
              {demarcacion.statusDescription || 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Fecha de Creación
            </Typography>
            <Typography variant="body1">
              {new Date(demarcacion.createdDate).toLocaleDateString('es-MX')}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Precandidatos
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Apellido Paterno</TableCell>
              <TableCell>Apellido Materno</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Clave INE</TableCell>
              <TableCell>CURP</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Typography variant="body2" color="text.secondary">
                  Los precandidatos se mostrarán aquí cuando se carguen
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
