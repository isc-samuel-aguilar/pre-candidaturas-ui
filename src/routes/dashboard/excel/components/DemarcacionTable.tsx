import { useState, useRef, useMemo, Fragment } from 'react'
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  IconButton,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import PeopleIcon from '@mui/icons-material/People'
import { useNavigate, Link } from '@tanstack/react-router'
import type { DemarcacionRow, DemarcacionStatus } from '../../../../types/demarcacion'
import { StatusEnum } from '../../../../types/enums'
import { PrecandidatosTable } from '../../../../components/PrecandidatosTable'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '__null__', label: 'Sin Cargar' },
  { value: StatusEnum.POR_VALIDAR, label: 'Por Validar' },
  { value: StatusEnum.VALIDO, label: 'Válido' },
  { value: StatusEnum.ERROR, label: 'Error' },
]

interface DemarcacionTableProps {
  demarcaciones: DemarcacionRow[]
  loading: boolean
  uploadingIds: Set<number>
  onUpload: (demarcacion: DemarcacionRow, file: File) => Promise<void>
  onDelete: (folioDemarcacionId: number) => Promise<void>
  getStatusColor: (status: DemarcacionStatus) => { bg: string; color: string }
  mode?: 'upload' | 'validate'
  onSaveStatus?: (
    demarcacion: DemarcacionRow,
    status: StatusEnum,
    statusDescription: string | null
  ) => Promise<void>
}

interface RowEditState {
  status: StatusEnum | ''
  comment: string
  saving: boolean
}

function deriveRowEdit(row: DemarcacionRow): RowEditState {
  const currentStatus = row.folioDemarcacion?.status
  return {
    status:
      currentStatus === StatusEnum.VALIDO || currentStatus === StatusEnum.ERROR
        ? currentStatus
        : '',
    comment: row.folioDemarcacion?.statusDescription ?? '',
    saving: false,
  }
}

export function DemarcacionTable({
  demarcaciones,
  loading,
  uploadingIds,
  onUpload,
  onDelete,
  getStatusColor,
  mode = 'upload',
  onSaveStatus,
}: DemarcacionTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDemarcacion, setSelectedDemarcacion] = useState<DemarcacionRow | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [rowEdits, setRowEdits] = useState<Map<number, RowEditState>>(new Map())
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map())
  const navigate = useNavigate()

  const isValidateMode = mode === 'validate'
  const totalColumns = isValidateMode ? 7 : 6

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

  const getRowEdit = (row: DemarcacionRow): RowEditState =>
    rowEdits.get(row.catalogo.id) ?? deriveRowEdit(row)

  const patchRowEdit = (row: DemarcacionRow, patch: Partial<RowEditState>) => {
    setRowEdits((prev) => {
      const next = new Map(prev)
      const base = prev.get(row.catalogo.id) ?? deriveRowEdit(row)
      next.set(row.catalogo.id, { ...base, ...patch })
      return next
    })
  }

  const clearRowEdit = (row: DemarcacionRow) => {
    setRowEdits((prev) => {
      const next = new Map(prev)
      next.delete(row.catalogo.id)
      return next
    })
  }

  const isRowDirty = (row: DemarcacionRow) => {
    const edit = getRowEdit(row)
    const base = deriveRowEdit(row)
    return edit.status !== base.status || edit.comment !== base.comment
  }

  const handleSaveStatus = async (row: DemarcacionRow) => {
    const edit = getRowEdit(row)
    if (!row.folioDemarcacion || !edit.status || !onSaveStatus) return

    patchRowEdit(row, { saving: true })
    try {
      await onSaveStatus(row, edit.status, edit.comment.trim() || null)
      clearRowEdit(row)
    } catch {
      patchRowEdit(row, { saving: false })
    }
  }

  const handleCancelRowEdit = (row: DemarcacionRow) => {
    clearRowEdit(row)
  }

  const getStatusLabel = (status: DemarcacionStatus) => {
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
              {!isValidateMode && <TableCell align="center">Subir</TableCell>}
              {!isValidateMode && <TableCell align="center">Eliminar</TableCell>}
              <TableCell align="center">Status</TableCell>
              {isValidateMode && <TableCell align="center">Validar</TableCell>}
              {isValidateMode && <TableCell>Comentarios</TableCell>}
              {isValidateMode && <TableCell align="center">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDemarcaciones.map((row) => {
              const statusColors = getStatusColor(row.status)
              const hasStatus = row.status !== null
              const isUploading = uploadingIds.has(row.catalogo.id)
              const isExpanded = expandedRows.has(row.catalogo.id)

              return (
                <Fragment key={row.catalogo.id}>
                  <TableRow hover>
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
                      {row.folioDemarcacion ? (
                        <Link
                          to="/dashboard/$folio/demarcaciones/$alias"
                          params={{
                            folio: row.folioDemarcacion.folio,
                            alias: row.catalogo.alias || row.catalogo.demarcacion,
                          }}
                          target="_blank"
                          rel="opener"
                          style={{
                            color: '#003366',
                            fontWeight: 500,
                            textDecoration: 'underline',
                          }}
                        >
                          {row.catalogo.alias || row.catalogo.demarcacion}
                        </Link>
                      ) : (
                        row.catalogo.alias || row.catalogo.demarcacion
                      )}
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
                              to: '/dashboard/$folio/demarcaciones/$alias',
                              params: {
                                folio: row.folioDemarcacion.folio,
                                alias: row.catalogo.alias || row.catalogo.demarcacion,
                              },
                            })
                          }
                        }}
                      >
                        Pre Candidatos
                      </Button>
                    </TableCell>
                    {!isValidateMode && (
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
                    )}
                    {!isValidateMode && (
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
                    )}
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
                    {isValidateMode && (
                      <TableCell align="center">
                        <TextField
                          select
                          size="small"
                          label="Validar"
                          value={getRowEdit(row).status}
                          disabled={!row.folioDemarcacion || getRowEdit(row).saving}
                          onChange={(e) =>
                            patchRowEdit(row, {
                              status: e.target.value as StatusEnum | '',
                            })
                          }
                          sx={{ minWidth: 130 }}
                        >
                          <MenuItem value="">
                            <em>Seleccionar</em>
                          </MenuItem>
                          <MenuItem value={StatusEnum.VALIDO}>Válido</MenuItem>
                          <MenuItem value={StatusEnum.ERROR}>Error</MenuItem>
                        </TextField>
                      </TableCell>
                    )}
                    {isValidateMode && (
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          maxRows={3}
                          placeholder="Comentario..."
                          value={getRowEdit(row).comment}
                          disabled={!row.folioDemarcacion || getRowEdit(row).saving}
                          onChange={(e) => patchRowEdit(row, { comment: e.target.value })}
                        />
                      </TableCell>
                    )}
                    {isValidateMode && (
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleSaveStatus(row)}
                            disabled={
                              !row.folioDemarcacion ||
                              !getRowEdit(row).status ||
                              !isRowDirty(row) ||
                              getRowEdit(row).saving
                            }
                          >
                            {getRowEdit(row).saving ? 'Guardando...' : 'Guardar'}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleCancelRowEdit(row)}
                            disabled={
                              !row.folioDemarcacion ||
                              !isRowDirty(row) ||
                              getRowEdit(row).saving
                            }
                          >
                            Cancelar
                          </Button>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${row.catalogo.id}-expanded`}>
                      <TableCell colSpan={totalColumns} sx={{ p: 0, backgroundColor: '#f5f5f5' }}>
                        {row.folioDemarcacion ? (
                          <PrecandidatosTable
                            folioId={row.folioDemarcacion.folioId}
                            demarcacionName={row.catalogo.demarcacion}
                            mode="excel"
                            demarcacionStatus={row.status}
                            allowDocActions={!isValidateMode}
                            allowDocValidation={isValidateMode}
                            groupDocuments
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            No hay datos disponibles para esta demarcación
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
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
