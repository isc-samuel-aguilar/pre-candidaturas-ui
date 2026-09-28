import { useState, useMemo } from 'react'
import {
  Box,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Alert,
  Link,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import type { Folio, FolioRepresentation } from '../../../../types/folio'
import { StatusEnum } from '../../../../types/enums'

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  [StatusEnum.POR_VALIDAR]: { label: 'Por Validar', bg: '#FFD100', color: '#000000' },
  [StatusEnum.VALIDO]: { label: 'Válido', bg: '#4CAF50', color: '#FFFFFF' },
  [StatusEnum.ERROR]: { label: 'Error', bg: '#F44336', color: '#FFFFFF' },
}

const DEFAULT_STATUS_STYLE = { label: 'Sin cargar', bg: '#E0E0E0', color: '#757575' }

function getStatusStyle(status: StatusEnum | null) {
  return (status && STATUS_STYLES[status]) || DEFAULT_STATUS_STYLE
}

interface FolioListProps {
  folios: Folio[]
  loading: boolean
  error: string | null
  onEdit?: (folio: Folio) => void
  onDelete?: (id: number) => Promise<void>
  showActions?: boolean
}

function getFullName(rep: FolioRepresentation): string {
  return `${rep.paternalLastName} ${rep.maternalLastName} ${rep.name}`
}

export function FolioList({
  folios,
  loading,
  error,
  onEdit,
  onDelete,
  showActions = true,
}: FolioListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [folioToDelete, setFolioToDelete] = useState<Folio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reprDialogOpen, setReprDialogOpen] = useState(false)
  const [reprFolio, setReprFolio] = useState<Folio | null>(null)

  const totalColumns = 7 + (showActions ? 1 : 0)

  const sortedFolios = useMemo(() => {
    return [...folios].sort((a, b) => {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0
      return dateB - dateA
    })
  }, [folios])

  const filteredFolios = useMemo(() => {
    if (!searchTerm.trim()) return sortedFolios
    const term = searchTerm.toLowerCase()
    return sortedFolios.filter(
      (folio) =>
        folio.folio.toLowerCase().includes(term) ||
        folio.email.toLowerCase().includes(term) ||
        folio.municipio.toLowerCase().includes(term) ||
        folio.estado.toLowerCase().includes(term) ||
        folio.colonia.toLowerCase().includes(term)
    )
  }, [sortedFolios, searchTerm])

  const handleDeleteClick = (folio: Folio) => {
    setFolioToDelete(folio)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!folioToDelete) return
    setDeleting(true)
    await onDelete?.(folioToDelete.id)
    setDeleting(false)
    setDeleteDialogOpen(false)
    setFolioToDelete(null)
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setFolioToDelete(null)
  }

  const handleReprClick = (folio: Folio) => {
    setReprFolio(folio)
    setReprDialogOpen(true)
  }

  const handleReprClose = () => {
    setReprDialogOpen(false)
    setReprFolio(null)
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Folios Registrados
      </Typography>

      <TextField
        fullWidth
        placeholder="Buscar por folio, email, municipio, estado o colonia..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        slotProps={{
          input: {
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          },
        }}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Folio</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Municipio</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Representaciones</TableCell>
              <TableCell>Status</TableCell>
              {showActions && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={totalColumns} align="center">
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredFolios.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalColumns} align="center">
                  {searchTerm
                    ? 'No se encontraron folios con ese criterio de búsqueda'
                    : 'No hay folios registrados'}
                </TableCell>
              </TableRow>
            )}
            {filteredFolios.map((folio) => (
              <TableRow key={folio.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {folio.folio}
                  </Typography>
                </TableCell>
                <TableCell>
                  {folio.user?.username ? (
                    <Link
                      href={`/dashboard/excel/${encodeURIComponent(folio.user.username)}`}
                      target="_blank"
                      rel="opener"
                      underline="hover"
                    >
                      {folio.user.username}
                    </Link>
                  ) : (
                    folio.userId
                  )}
                </TableCell>
                <TableCell>{folio.email}</TableCell>
                <TableCell>{folio.municipio}</TableCell>
                <TableCell>{folio.estado}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {folio.representations.map((rep) => (
                      <Tooltip
                        key={rep.id ?? rep.representation}
                        title={getFullName(rep)}
                        arrow
                      >
                        <Chip
                          label={rep.representation}
                          size="small"
                          variant="outlined"
                          onClick={() => handleReprClick(folio)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusStyle(folio.status).label}
                    size="small"
                    sx={{
                      backgroundColor: getStatusStyle(folio.status).bg,
                      color: getStatusStyle(folio.status).color,
                      fontWeight: 'bold',
                    }}
                  />
                </TableCell>
                {showActions && (
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => onEdit?.(folio)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(folio)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el folio <strong>{folioToDelete?.folio}</strong>?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reprDialogOpen} onClose={handleReprClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Representaciones — Folio {reprFolio?.folio}
        </DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {reprFolio?.representations.map((rep) => (
              <ListItem key={rep.id ?? rep.representation} sx={{ px: 0 }}>
                <ListItemText
                  primary={rep.representation}
                  secondary={getFullName(rep)}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReprClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
