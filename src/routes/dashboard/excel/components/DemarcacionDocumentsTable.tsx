import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import { getDemarcationDocumentTypes } from '../../../../services/documentService'
import type { KeyValueCatalog } from '../../../../types/demarcacion'
import { StatusEnum } from '../../../../types/enums'

const EMPTY_STATUS_STYLE = { bg: '#E0E0E0', color: '#757575' }

interface DemarcacionDocumentsTableProps {
  mode?: 'upload' | 'validate'
}

export function DemarcacionDocumentsTable({ mode = 'upload' }: DemarcacionDocumentsTableProps) {
  const isValidateMode = mode === 'validate'
  const allowDocActions = !isValidateMode
  const allowDocValidation = isValidateMode

  const [documentTypes, setDocumentTypes] = useState<KeyValueCatalog[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    getDemarcationDocumentTypes()
      .then((types) => {
        if (!cancelled) setDocumentTypes(types)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loadError) {
    return (
      <Alert severity="warning" sx={{ m: 1 }}>
        No se pudieron cargar los documentos de la demarcación
      </Alert>
    )
  }

  if (documentTypes === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    )
  }

  return (
    <Table size="small" data-testid="demarcacion-documents-table">
      <TableHead>
        <TableRow>
          <TableCell>Tipo</TableCell>
          <TableCell>Nombre</TableCell>
          {allowDocActions && <TableCell align="center">Subir</TableCell>}
          {allowDocActions && <TableCell align="center">Eliminar</TableCell>}
          <TableCell align="center">Status</TableCell>
          {allowDocValidation && <TableCell align="center">Validar</TableCell>}
          {allowDocValidation && <TableCell>Comentario</TableCell>}
          {allowDocValidation && <TableCell align="center">Acciones</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {documentTypes.map((type) => (
          <TableRow key={type.id} hover>
            <TableCell>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {type.value}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                -
              </Typography>
            </TableCell>
            {allowDocActions && (
              <TableCell align="center">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                  disabled
                  sx={{ textTransform: 'none' }}
                >
                  Subir
                </Button>
              </TableCell>
            )}
            {allowDocActions && (
              <TableCell align="center">
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled
                  sx={{ textTransform: 'none' }}
                >
                  Eliminar
                </Button>
              </TableCell>
            )}
            <TableCell align="center">
              <Chip
                label="Sin Cargar"
                size="small"
                sx={{
                  backgroundColor: EMPTY_STATUS_STYLE.bg,
                  color: EMPTY_STATUS_STYLE.color,
                  fontWeight: 500,
                  height: 20,
                  fontSize: '0.7rem',
                }}
              />
            </TableCell>
            {allowDocValidation && (
              <TableCell align="center">
                <TextField
                  select
                  size="small"
                  label="Validar"
                  value=""
                  disabled
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="">
                    <em>Seleccionar</em>
                  </MenuItem>
                  <MenuItem value={StatusEnum.VALIDO}>Válido</MenuItem>
                  <MenuItem value={StatusEnum.ERROR}>Error</MenuItem>
                </TextField>
              </TableCell>
            )}
            {allowDocValidation && (
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  maxRows={3}
                  placeholder="Comentario..."
                  value=""
                  disabled
                />
              </TableCell>
            )}
            {allowDocValidation && (
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button variant="contained" size="small" disabled sx={{ textTransform: 'none' }}>
                    Guardar
                  </Button>
                  <Button variant="outlined" size="small" disabled sx={{ textTransform: 'none' }}>
                    Cancelar
                  </Button>
                </Box>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
