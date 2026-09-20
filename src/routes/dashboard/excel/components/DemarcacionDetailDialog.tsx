import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import type { DemarcacionRow } from '../../../../types/demarcacion'

interface DemarcacionDetailDialogProps {
  open: boolean
  demarcacion: DemarcacionRow | null
  onClose: () => void
}

export function DemarcacionDetailDialog({
  open,
  demarcacion,
  onClose,
}: DemarcacionDetailDialogProps) {
  if (!demarcacion) return null

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Detalle de Demarcación</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Ámbito
            </Typography>
            <Typography variant="body1">
              {demarcacion.catalogo.ambito}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Demarcación
            </Typography>
            <Typography variant="body1">
              {demarcacion.catalogo.demarcacion}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Alias
            </Typography>
            <Typography variant="body1">
              {demarcacion.catalogo.alias || 'N/A'}
            </Typography>
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
          {demarcacion.folioDemarcacion && (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Descripción de Status
                </Typography>
                <Typography variant="body1">
                  {demarcacion.folioDemarcacion.statusDescription || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Fecha de Creación
                </Typography>
                <Typography variant="body1">
                  {new Date(demarcacion.folioDemarcacion.createdDate).toLocaleDateString('es-MX')}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
