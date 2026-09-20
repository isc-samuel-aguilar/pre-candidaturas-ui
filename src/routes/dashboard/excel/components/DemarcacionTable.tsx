import { useState, useRef, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import PeopleIcon from '@mui/icons-material/People'
import { useNavigate } from '@tanstack/react-router'
import type { DemarcacionRow, DemarcacionStatus } from '../../../../types/demarcacion'
import { PrecandidatosTable } from '../../../../components/PrecandidatosTable'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '__null__', label: 'Sin Cargar' },
  { value: 'POR_VALIDAR', label: 'Por Validar' },
  { value: 'VALIDO', label: 'Válido' },
  { value: 'ERROR', label: 'Error' },
]

interface DemarcacionTableProps {
  demarcaciones: DemarcacionRow[]
  loading: boolean
  uploadingIds: Set<number>
  onUpload: (demarcacion: DemarcacionRow, file: File) => Promise<void>
  onDelete: (folioDemarcacionId: number) => Promise<void>
  getStatusColor: (status: DemarcacionStatus) => { bg: string; color: string }
}

export function DemarcacionTable({
  demarcaciones,
  loading,
  uploadingIds,
  onUpload,
  onDelete,
  getStatusColor,
}: DemarcacionTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDemarcacion, setSelectedDemarcacion] = useState<DemarcacionRow | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map())
  const navigate = useNavigate()

  const filteredDemarcaciones = useMemo(() => {
    return demarcaciones.filter((d) => {
      const matchesSearch =
        searchText === '' ||
        (d.catalogo.alias || d.catalogo.demarcacion)
          .toLowerCase()
          .includes(searchText.toLowerCase())

      let matchesStatus = true
      if (statusFilter === '__null__') {
        matchesStatus = d.status === null
      } else if (statusFilter !== '') {
        matchesStatus = d.status === statusFilter
      }

      return matchesSearch && matchesStatus
    })
  }, [demarcaciones, searchText, statusFilter])

  const handleFileSelect = async (demarcacion: DemarcacionRow, file: File | null) => {
    if (!file) return

    try {
      await onUpload(demarcacion, file)
    } catch {
      // Error handling is done in the hook
    }

    const input = fileInputRefs.current.get(demarcacion.catalogo.id)
    if (input) {
      input.value = ''
    }
  }

  const handleDeleteClick = (demarcacion: DemarcacionRow) => {
    setSelectedDemarcacion(demarcacion)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedDemarcacion?.folioDemarcacion) return

    try {
      await onDelete(selectedDemarcacion.folioDemarcacion.id)
      setDeleteDialogOpen(false)
      setSelectedDemarcacion(null)
    } catch {
      // Error handling is done in the hook
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setSelectedDemarcacion(null)
  }

  const handleToggleExpand = (catalogoId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(catalogoId)) {
        next.delete(catalogoId)
      } else {
        next.add(catalogoId)
      }
      return next
    })
  }

  const getStatusLabel = (status: DemarcacionStatus) => {
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

  if (loading && demarcaciones.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar demarcación..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Demarcación</TableCell>
              <TableCell align="center">Pre Candidatos</TableCell>
              <TableCell align="center">Subir</TableCell>
              <TableCell align="center">Eliminar</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDemarcaciones.map((row) => {
              const statusColors = getStatusColor(row.status)
              const hasStatus = row.status !== null
              const isUploading = uploadingIds.has(row.catalogo.id)
              const isExpanded = expandedRows.has(row.catalogo.id)

              return (
                <>
                  <TableRow key={row.catalogo.id} hover>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        disabled={!hasStatus}
                        onClick={() => handleToggleExpand(row.catalogo.id)}
                      >
                        {isExpanded ? (
                          <KeyboardArrowDownIcon />
                        ) : (
                          <KeyboardArrowRightIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      {row.catalogo.alias || row.catalogo.demarcacion}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PeopleIcon />}
                        disabled={!hasStatus}
                        onClick={() => {
                          if (row.folioDemarcacion) {
                            navigate({
                              to: '/dashboard/demarcaciones/' + row.folioDemarcacion.id,
                            })
                          }
                        }}
                      >
                        Pre Candidatos
                      </Button>
                    </TableCell>
                    <TableCell align="center">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        ref={(el) => {
                          if (el) fileInputRefs.current.set(row.catalogo.id, el)
                        }}
                        onChange={(e) => handleFileSelect(row, e.target.files?.[0] || null)}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />
                        }
                        onClick={() => fileInputRefs.current.get(row.catalogo.id)?.click()}
                        disabled={isUploading || hasStatus}
                      >
                        Subir
                      </Button>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(row)}
                        disabled={!hasStatus || isUploading}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          backgroundColor: statusColors.bg,
                          color: statusColors.color,
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          display: 'inline-block',
                        }}
                      >
                        <Typography variant="body2">
                          {getStatusLabel(row.status)}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${row.catalogo.id}-expanded`}>
                      <TableCell colSpan={6} sx={{ p: 0, backgroundColor: '#f5f5f5' }}>
                        {row.folioDemarcacion ? (
                          <PrecandidatosTable
                            folioId={row.folioDemarcacion.folioId}
                            demarcacionName={row.catalogo.demarcacion}
                            mode="excel"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            No hay datos disponibles para esta demarcación
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de eliminar la demarcación{' '}
            <strong>
              {selectedDemarcacion?.catalogo.alias || selectedDemarcacion?.catalogo.demarcacion}
            </strong>
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
