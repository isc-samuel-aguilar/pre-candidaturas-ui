import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { getMyFolio, getDemarcacionesByFolio } from '../../../../services/demarcacionService'
import { getFolios } from '../../../../services/folioService'
import { resolveFolioAccess } from '../../../../utils/folioAccess'
import type { FolioAccessResult } from '../../../../utils/folioAccess'
import { useAuth } from '../../../../contexts/AuthContext'
import type { FolioDemarcacion } from '../../../../types/demarcacion'
import { StatusEnum } from '../../../../types/enums'
import { PrecandidatosTable } from '../../../../components/PrecandidatosTable'

export const Route = createFileRoute('/dashboard/$folio/demarcaciones/$alias')({
  component: DemarcacionDetailPage,
})

function DemarcacionDetailPage() {
  const { folio, alias } = Route.useParams()
  const { user } = useAuth()
  const [demarcacion, setDemarcacion] = useState<FolioDemarcacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [precandidatoCount, setPrecandidatoCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const fetchData = async () => {
      try {
        let access: FolioAccessResult
        if (user.role === 'REGISTER') {
          const myFolio = await getMyFolio()
          access = resolveFolioAccess({ role: user.role, folioParam: folio, myFolio })
        } else {
          const folios = await getFolios()
          access = resolveFolioAccess({ role: user.role, folioParam: folio, folios })
        }

        if (access.status === 'denied') {
          setError('No tienes permiso para ver este registro')
          return
        }
        if (access.status === 'not_found') {
          setError('Folio no encontrado')
          return
        }

        const demarcaciones = await getDemarcacionesByFolio(access.folioId)
        const found = demarcaciones.find(
          (d) => d.alias === alias || d.demarcacion === alias
        )

        if (!found) {
          setError('Demarcación no encontrada')
          return
        }

        if (!cancelled) setDemarcacion(found)
      } catch {
        if (!cancelled) setError('No se pudo cargar la información de la demarcación')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [folio, alias, user])

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case StatusEnum.POR_VALIDAR:
        return 'Por Validar'
      case StatusEnum.VALIDO:
        return 'Válido'
      case StatusEnum.ERROR:
        return 'Error'
      default:
        return 'Sin cargar'
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case StatusEnum.POR_VALIDAR:
        return 'warning'
      case StatusEnum.VALIDO:
        return 'success'
      case StatusEnum.ERROR:
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

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" component="span">
              Ámbito:{' '}
            </Typography>
            <Typography variant="body2" component="span">{demarcacion.ambito}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" component="span">
              Demarcación:{' '}
            </Typography>
            <Typography variant="body2" component="span">{demarcacion.demarcacion}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" component="span">
              Alias:{' '}
            </Typography>
            <Typography variant="body2" component="span">{demarcacion.alias || 'N/A'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" color="text.secondary" component="span">
              Status:{' '}
            </Typography>
            <Chip
              label={getStatusLabel(demarcacion.status)}
              color={getStatusColor(demarcacion.status) as 'warning' | 'success' | 'error' | 'default'}
              size="small"
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" component="span">
              Descripción:{' '}
            </Typography>
            <Typography variant="body2" component="span">
              {demarcacion.statusDescription || 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" component="span">
              Creación:{' '}
            </Typography>
            <Typography variant="body2" component="span">
              {new Date(demarcacion.createdDate).toLocaleDateString('es-MX')}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Precandidatos{precandidatoCount !== null ? ` (${precandidatoCount})` : ''}
      </Typography>

      <PrecandidatosTable
        folioId={demarcacion.folioId}
        demarcacionName={demarcacion.demarcacion}
        mode="detail"
        demarcacionStatus={demarcacion.status}
        onCountChange={setPrecandidatoCount}
        allowDocActions={user?.role !== 'VALIDATOR'}
      />
    </Box>
  )
}
