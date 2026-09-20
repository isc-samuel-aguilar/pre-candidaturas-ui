import { Box, Typography, Chip } from '@mui/material'
import type { Folio } from '../../../../types/folio'
import type { DemarcacionRow } from '../../../../types/demarcacion'

interface FolioSectionProps {
  folio: Folio | null
  demarcaciones: DemarcacionRow[]
  loading: boolean
}

export function FolioSection({ folio, demarcaciones, loading }: FolioSectionProps) {
  const cargados = demarcaciones.filter((d) => d.status !== null).length
  const porValidar = demarcaciones.filter((d) => d.status === 'POR_VALIDAR').length
  const validos = demarcaciones.filter((d) => d.status === 'VALIDO').length
  const erroneos = demarcaciones.filter((d) => d.status === 'ERROR').length

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        p: 1.5,
        bgcolor: 'grey.100',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold">
        Folio:
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">Cargando...</Typography>
      ) : folio ? (
        <>
          <Typography variant="subtitle1" color="primary" fontWeight="bold">
            {folio.folio}
          </Typography>

          <Box sx={{ mx: 1, borderLeft: 1, borderColor: 'grey.400', height: 24 }} />

          <Chip label={`${cargados} Cargados`} size="small" variant="outlined" />
          <Chip label={`${porValidar} Por Validar`} size="small" color="warning" variant="outlined" />
          <Chip label={`${validos} Válidos`} size="small" color="success" variant="outlined" />
          <Chip label={`${erroneos} Erróneos`} size="small" color="error" variant="outlined" />
        </>
      ) : (
        <Typography variant="body2" color="error">No se pudo cargar el folio</Typography>
      )}
    </Box>
  )
}
