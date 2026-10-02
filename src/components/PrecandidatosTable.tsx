import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  TextField,
  MenuItem,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import { getPrecandidatos } from '../services/demarcacionService'
import {
  getDocumentsByPrecandidato,
  getDocumentTypes,
  getGeneratedDocumentTypes,
  uploadDocument,
  deleteDocument,
  downloadDocumentFile,
  updateDocumentStatus,
  GENERATED_DOCUMENT_KEY,
  type UpdateDocumentStatusPayload,
} from '../services/documentService'
import { useAuth } from '../contexts/AuthContext'
import type { Precandidato, DemarcacionStatus, Documento, KeyValueCatalog } from '../types/demarcacion'
import { StatusEnum } from '../types/enums'
import { validateFile, isImageFile, compressImage } from '../utils/fileUtils'

interface DocumentRow {
  catalogType: string
  document: Documento | null
}

interface DocEditState {
  status: StatusEnum | ''
  comment: string
  saving: boolean
}

interface PrecandidatosTableProps {
  folioId: number
  demarcacionName: string
  mode?: 'excel' | 'detail'
  autoLoad?: boolean
  demarcacionStatus?: DemarcacionStatus
  onCountChange?: (count: number) => void
  allowDocActions?: boolean
  allowDocValidation?: boolean
  groupDocuments?: boolean
}

type DocRowKey = 'validate' | 'sign'

function getStatusLabel(status?: StatusEnum | null) {
  switch (status) {
    case StatusEnum.POR_VALIDAR:
      return 'Por Validar'
    case StatusEnum.VALIDO:
      return 'Válido'
    case StatusEnum.ERROR:
      return 'Error'
    default:
      return 'Por Validar'
  }
}

function getStatusColor(status?: StatusEnum | null) {
  switch (status) {
    case StatusEnum.POR_VALIDAR:
      return { bg: '#FFD100', color: '#000000' }
    case StatusEnum.VALIDO:
      return { bg: '#4CAF50', color: '#FFFFFF' }
    case StatusEnum.ERROR:
      return { bg: '#F44336', color: '#FFFFFF' }
    default:
      return { bg: '#FFD100', color: '#000000' }
  }
}

const EMPTY_STATUS_STYLE = { bg: '#E0E0E0', color: '#757575' }

function getDocsValidColor(validDocs: number, totalDocs: number) {
  if (totalDocs === 0) return EMPTY_STATUS_STYLE
  if (validDocs === totalDocs) return getStatusColor(StatusEnum.VALIDO)
  if (validDocs === 0) return EMPTY_STATUS_STYLE
  return getStatusColor(StatusEnum.POR_VALIDAR)
}

function mergeDocs(documentTypes: KeyValueCatalog[], existingDocs: Documento[]): DocumentRow[] {
  return documentTypes.map((type) => {
    const found = existingDocs.find((d) => d.keyValueCatalogValue === type.value)
    return { catalogType: type.value, document: found || null }
  })
}

function areAllDocsValid(rows: DocumentRow[] | undefined): boolean {
  if (!rows) return false
  return rows.every((row) => row.document !== null && row.document.status === StatusEnum.VALIDO)
}

export function PrecandidatosTable({
  folioId,
  demarcacionName,
  mode = 'excel',
  autoLoad = true,
  demarcacionStatus,
  onCountChange,
  allowDocActions = true,
  allowDocValidation = false,
  groupDocuments = false,
}: PrecandidatosTableProps) {
  const { token } = useAuth()
  const [precandidatos, setPrecandidatos] = useState<Precandidato[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [expandedPrecandidato, setExpandedPrecandidato] = useState<number | null>(null)
  const [expandedDocRow, setExpandedDocRow] = useState<DocRowKey | null>(null)
  const [documentsMap, setDocumentsMap] = useState<Map<number, DocumentRow[]>>(new Map())
  const [rawDocsMap, setRawDocsMap] = useState<Map<number, Documento[]>>(new Map())
  const [loadingDocs, setLoadingDocs] = useState<Set<number>>(new Set())
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set())
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [docsErrorIds, setDocsErrorIds] = useState<Set<number>>(new Set())
  const [docEdits, setDocEdits] = useState<Map<string, DocEditState>>(new Map())
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({ open: false, message: '', severity: 'success' })
  const [documentTypes, setDocumentTypes] = useState<KeyValueCatalog[]>([])
  const [generatedTypes, setGeneratedTypes] = useState<KeyValueCatalog[] | null>(null)
  const [loadingGeneratedTypes, setLoadingGeneratedTypes] = useState(false)
  const [generatedTypesError, setGeneratedTypesError] = useState(false)
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const isDocsEnabled =
    (allowDocActions || allowDocValidation) && demarcacionStatus === StatusEnum.VALIDO

  const fetchPrecandidatos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPrecandidatos(folioId, demarcacionName)
      setPrecandidatos(data)
      onCountChange?.(data.length)
    } catch {
      setError('Error al cargar los precandidatos')
    } finally {
      setLoading(false)
    }
  }, [folioId, demarcacionName, onCountChange])

  useEffect(() => {
    if (autoLoad) {
      fetchPrecandidatos()
    }
  }, [autoLoad, fetchPrecandidatos])

  useEffect(() => {
    getDocumentTypes()
      .then(setDocumentTypes)
      .catch(() => {})
  }, [])

  const refreshDocs = useCallback(
    async (precandidatoId: number) => {
      try {
        const existingDocs = await getDocumentsByPrecandidato(precandidatoId)
        setRawDocsMap((prev) => new Map(prev).set(precandidatoId, existingDocs))
        setDocumentsMap((prev) => new Map(prev).set(precandidatoId, mergeDocs(documentTypes, existingDocs)))
        setDocsErrorIds((prev) => {
          const next = new Set(prev)
          next.delete(precandidatoId)
          return next
        })
      } catch {
        setRawDocsMap((prev) => {
          const next = new Map(prev)
          next.delete(precandidatoId)
          return next
        })
        setDocumentsMap((prev) => {
          const next = new Map(prev)
          next.delete(precandidatoId)
          return next
        })
        setDocsErrorIds((prev) => new Set(prev).add(precandidatoId))
      }
    },
    [documentTypes]
  )

  const formatFullName = (p: Precandidato) =>
    `${p.apellidoPaterno} ${p.apellidoMaterno} ${p.nombre}`.trim()

  const handleTogglePrecandidato = async (precandidatoId: number) => {
    setExpandedDocRow(null)

    if (expandedPrecandidato === precandidatoId) {
      setExpandedPrecandidato(null)
      return
    }

    setExpandedPrecandidato(precandidatoId)

    if (!documentsMap.has(precandidatoId) && !loadingDocs.has(precandidatoId)) {
      setLoadingDocs((prev) => new Set(prev).add(precandidatoId))
      try {
        await refreshDocs(precandidatoId)
      } finally {
        setLoadingDocs((prev) => {
          const next = new Set(prev)
          next.delete(precandidatoId)
          return next
        })
      }
    }
  }

  const handleToggleDocRow = async (row: DocRowKey) => {
    if (row === 'sign') {
      const merged = expandedPrecandidato !== null ? documentsMap.get(expandedPrecandidato) : undefined
      if (!areAllDocsValid(merged)) return

      if (generatedTypes === null && !loadingGeneratedTypes) {
        setGeneratedTypesError(false)
        setLoadingGeneratedTypes(true)
        try {
          const types = await getGeneratedDocumentTypes()
          setGeneratedTypes(types)
        } catch {
          setGeneratedTypesError(true)
        } finally {
          setLoadingGeneratedTypes(false)
        }
      }
    }

    setExpandedDocRow((prev) => (prev === row ? null : row))
  }

  const handleDownloadForSign = () => {
    setSnackbar({ open: true, message: 'funcionalidad no implementada', severity: 'info' })
  }

  const getDocEditKey = (precandidatoId: number, catalogType: string) =>
    `${precandidatoId}-${catalogType}`

  const getInitialDocStatus = (doc: Documento | null): StatusEnum | '' => {
    if (doc?.status === StatusEnum.VALIDO || doc?.status === StatusEnum.ERROR) {
      return doc.status
    }
    return ''
  }

  const getInitialDocEdit = (doc: Documento | null): DocEditState => ({
    status: getInitialDocStatus(doc),
    comment: doc?.statusDescription ?? '',
    saving: false,
  })

  const getDocEdit = (key: string, doc: Documento | null): DocEditState =>
    docEdits.get(key) ?? getInitialDocEdit(doc)

  const patchDocEdit = (key: string, doc: Documento | null, patch: Partial<DocEditState>) => {
    setDocEdits(
      (prev) => new Map(prev).set(key, { ...(prev.get(key) ?? getInitialDocEdit(doc)), ...patch })
    )
  }

  const cancelDocEdit = (key: string) => {
    setDocEdits((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }

  const isDocEditDirty = (key: string, doc: Documento | null) => {
    const edit = getDocEdit(key, doc)
    return (
      doc !== null &&
      (edit.status !== getInitialDocStatus(doc) ||
        edit.comment !== (doc.statusDescription ?? ''))
    )
  }

  const handleSaveDocStatus = async (
    precandidatoId: number,
    key: string,
    doc: Documento | null
  ) => {
    if (!doc) return
    const edit = getDocEdit(key, doc)
    if (!edit.status) return

    const payload: UpdateDocumentStatusPayload = { status: edit.status }
    if (edit.comment !== (doc.statusDescription ?? '')) {
      payload.statusDescription = edit.comment
    }

    patchDocEdit(key, doc, { saving: true })

    try {
      await updateDocumentStatus(doc.id, payload)
      cancelDocEdit(key)
      await refreshDocs(precandidatoId)
      await fetchPrecandidatos()
      setSnackbar({
        open: true,
        message: 'Documento actualizado correctamente',
        severity: 'success',
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: (err as { message?: string }).message || 'Error al guardar los cambios',
        severity: 'error',
      })
    } finally {
      setDocEdits((prev) => {
        if (!prev.has(key)) return prev
        const next = new Map(prev)
        next.set(key, { ...prev.get(key)!, saving: false })
        return next
      })
    }
  }

  const handleFileSelect = async (
    precandidatoId: number,
    docType: string,
    file: File | null,
    catalogKey?: string
  ) => {
    if (!file) return

    setUploadError(null)

    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Archivo no válido')
      return
    }

    let finalFile = file
    if (isImageFile(file)) {
      try {
        finalFile = await compressImage(file)
      } catch {
        setUploadError('Error al procesar la imagen')
        return
      }
    }

    const uploadKey = `${precandidatoId}-${docType}`
    setUploadingDocs((prev) => new Set(prev).add(uploadKey))

    try {
      await uploadDocument(precandidatoId, docType, finalFile, catalogKey)
      await refreshDocs(precandidatoId)
    } catch {
      // error handled by parent
    } finally {
      setUploadingDocs((prev) => {
        const next = new Set(prev)
        next.delete(uploadKey)
        return next
      })
      const input = fileInputRefs.current.get(uploadKey)
      if (input) input.value = ''
    }
  }

  const handleDeleteDoc = async (precandidatoId: number, documentId: number) => {
    try {
      await deleteDocument(documentId)
      await refreshDocs(precandidatoId)
      await fetchPrecandidatos()
    } catch {
      // error handled by parent
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    )
  }

  if (precandidatos.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No hay precandidatos registrados para esta demarcación
        </Typography>
      </Box>
    )
  }

  const isDetailMode = mode === 'detail'
  // 10 (excel) / 30 (detail): coincide con el nº real de celdas desde que se añadió
  // "Docs Válidos" (antes había drift: 9/29 celdas frente a colSpan 10/30)
  const totalColumns = isDetailMode ? 30 : 10

  const renderDocsTable = (rows: DocumentRow[], precandidatoId: number, showSignColumn: boolean) => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Tipo</TableCell>
          {showSignColumn && <TableCell align="center">Descargar para firmar</TableCell>}
          <TableCell>Nombre</TableCell>
          {allowDocActions && <TableCell align="center">Subir</TableCell>}
          {allowDocActions && <TableCell align="center">Eliminar</TableCell>}
          <TableCell align="center">Status</TableCell>
          {allowDocValidation && (
            <TableCell align="center">Validar</TableCell>
          )}
          {allowDocValidation && <TableCell>Comentario</TableCell>}
          {allowDocValidation && (
            <TableCell align="center">Acciones</TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const doc = row.document
          const status = doc?.status ?? null
          const uploadKey = `${precandidatoId}-${row.catalogType}`
          const editKey = getDocEditKey(precandidatoId, row.catalogType)
          const isUploading = uploadingDocs.has(uploadKey)
          const hasFile = doc !== null

          return (
            <TableRow key={row.catalogType} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {row.catalogType}
                </Typography>
              </TableCell>
              {showSignColumn && (
                <TableCell align="center">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleDownloadForSign}
                    sx={{ textTransform: 'none' }}
                  >
                    Descargar y firmar
                  </Button>
                </TableCell>
              )}
              <TableCell>
                {hasFile ? (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => doc && token && downloadDocumentFile(doc, token)}
                    sx={{ textTransform: 'none', color: 'primary.main', justifyContent: 'flex-start' }}
                  >
                    {doc?.originalFilename || row.catalogType}
                  </Button>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                )}
              </TableCell>
              {allowDocActions && (
                <TableCell align="center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    style={{ display: 'none' }}
                    ref={(el) => {
                      if (el) fileInputRefs.current.set(uploadKey, el)
                    }}
                    onChange={(e) =>
                      handleFileSelect(
                        precandidatoId,
                        row.catalogType,
                        e.target.files?.[0] || null,
                        showSignColumn ? GENERATED_DOCUMENT_KEY : undefined
                      )
                    }
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={isUploading ? <CircularProgress size={14} /> : <CloudUploadIcon />}
                    onClick={() => fileInputRefs.current.get(uploadKey)?.click()}
                    disabled={!isDocsEnabled || isUploading || hasFile}
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
                    disabled={!hasFile || !doc}
                    onClick={() => doc && handleDeleteDoc(precandidatoId, doc.id)}
                    sx={{ textTransform: 'none' }}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              )}
              <TableCell align="center">
                {hasFile ? (
                  <Chip
                    label={getStatusLabel(status)}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(status).bg,
                      color: getStatusColor(status).color,
                      fontWeight: 500,
                      height: 20,
                      fontSize: '0.7rem',
                    }}
                  />
                ) : (
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
                )}
              </TableCell>
              {allowDocValidation && (
                <TableCell align="center">
                  {hasFile && doc ? (
                    <TextField
                      select
                      size="small"
                      label="Validar"
                      value={getDocEdit(editKey, doc).status}
                      disabled={getDocEdit(editKey, doc).saving}
                      onChange={(e) =>
                        patchDocEdit(editKey, doc, {
                          status: e.target.value as StatusEnum | '',
                        })
                      }
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="">
                        <em>Seleccionar</em>
                      </MenuItem>
                      <MenuItem value={StatusEnum.VALIDO}>Válido</MenuItem>
                      <MenuItem value={StatusEnum.ERROR}>Error</MenuItem>
                    </TextField>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
              )}
              {allowDocValidation && (
                <TableCell>
                  {hasFile && doc ? (
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      maxRows={3}
                      placeholder="Comentario..."
                      value={getDocEdit(editKey, doc).comment}
                      disabled={getDocEdit(editKey, doc).saving}
                      onChange={(e) =>
                        patchDocEdit(editKey, doc, {
                          comment: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
              )}
              {allowDocValidation && (
                <TableCell align="center">
                  <Box
                    sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() =>
                        handleSaveDocStatus(precandidatoId, editKey, doc)
                      }
                      disabled={
                        !hasFile ||
                        !doc ||
                        !getDocEdit(editKey, doc).status ||
                        !isDocEditDirty(editKey, doc) ||
                        getDocEdit(editKey, doc).saving
                      }
                      sx={{ textTransform: 'none' }}
                    >
                      {getDocEdit(editKey, doc).saving
                        ? 'Guardando...'
                        : 'Guardar'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => cancelDocEdit(editKey)}
                      disabled={
                        !isDocEditDirty(editKey, doc) ||
                        getDocEdit(editKey, doc).saving
                      }
                      sx={{ textTransform: 'none' }}
                    >
                      Cancelar
                    </Button>
                  </Box>
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  const renderDocsFallback = (
    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
      Cargando tipos de documento...
    </Typography>
  )

  const renderDocsSection = (
    rows: DocumentRow[] | undefined,
    precandidatoId: number,
    showSignColumn: boolean
  ) =>
    rows && rows.length > 0 ? (
      renderDocsTable(rows, precandidatoId, showSignColumn)
    ) : (
      renderDocsFallback
    )

  const renderDocumentsGroup = (rows: DocumentRow[] | undefined, precandidatoId: number) => {
    const canSign = areAllDocsValid(rows)
    const rawDocs = rawDocsMap.get(precandidatoId)
    const generatedMerged = generatedTypes && rawDocs ? mergeDocs(generatedTypes, rawDocs) : null

    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Documentos</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow hover>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  aria-label="Expandir Documentos por validar"
                  onClick={() => handleToggleDocRow('validate')}
                >
                  {expandedDocRow === 'validate' ? (
                    <KeyboardArrowDownIcon />
                  ) : (
                    <KeyboardArrowRightIcon />
                  )}
                </IconButton>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Documentos por validar
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
          {expandedDocRow === 'validate' && (
            <TableRow>
              <TableCell sx={{ pl: 6 }}>
                {renderDocsSection(rows, precandidatoId, false)}
              </TableCell>
            </TableRow>
          )}
          <TableRow hover>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  aria-label="Expandir Documentos por firmar y validar"
                  disabled={!canSign}
                  onClick={() => handleToggleDocRow('sign')}
                >
                  {expandedDocRow === 'sign' ? (
                    <KeyboardArrowDownIcon />
                  ) : (
                    <KeyboardArrowRightIcon />
                  )}
                </IconButton>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: canSign ? 'text.primary' : 'text.disabled' }}
                >
                  Documentos por firmar y validar
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
          {expandedDocRow === 'sign' && canSign && (
            <TableRow>
              <TableCell sx={{ pl: 6 }}>
                {generatedTypesError ? (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    No se pudieron cargar los tipos de documento generados
                  </Alert>
                ) : generatedMerged === null ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : (
                  renderDocsSection(generatedMerged, precandidatoId, true)
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      {uploadError && (
        <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Nombre Completo</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Calidad</TableCell>
              <TableCell>Docs Válidos</TableCell>
              <TableCell>Clave INE</TableCell>
              {isDetailMode && <TableCell>OCR</TableCell>}
              <TableCell>CURP</TableCell>
              <TableCell>RFC Homoclave</TableCell>
              {isDetailMode && (
                <>
                  <TableCell>Acción Afirmativa</TableCell>
                  <TableCell>Interno/Externo</TableCell>
                  <TableCell>Municipio Nacimiento</TableCell>
                  <TableCell>Estado Nacimiento</TableCell>
                  <TableCell>Ocupación</TableCell>
                  <TableCell>Calle</TableCell>
                  <TableCell>Número</TableCell>
                  <TableCell>Colonia</TableCell>
                  <TableCell>Municipio Residencia</TableCell>
                  <TableCell>Estado Residencia</TableCell>
                  <TableCell>Código Postal</TableCell>
                  <TableCell>Tiempo Residencia</TableCell>
                  <TableCell>Género</TableCell>
                  <TableCell>Escolaridad</TableCell>
                  <TableCell>Carrera</TableCell>
                  <TableCell>Lugar de Trabajo</TableCell>
                  <TableCell>Puesto</TableCell>
                  <TableCell>Fecha Ingreso</TableCell>
                  <TableCell>Fecha Terminación</TableCell>
                </>
              )}
              <TableCell>Teléfono</TableCell>
              <TableCell>Correo Electrónico</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {precandidatos.map((p, index) => {
              const precandidatoId = p.id || index
              const isExpanded = expandedPrecandidato === precandidatoId
              const merged = documentsMap.get(precandidatoId)
              const isLoadingDocs = loadingDocs.has(precandidatoId)
              const hasDocsError = docsErrorIds.has(precandidatoId)
              const validDocs = p.validDocsCount ?? 0
              const totalDocs = documentTypes.length
              const docsValidStyle = getDocsValidColor(validDocs, totalDocs)

              return (
                <>
                  <TableRow key={precandidatoId} hover>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        disabled={!isDocsEnabled}
                        onClick={() => isDocsEnabled && handleTogglePrecandidato(precandidatoId)}
                      >
                        {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{formatFullName(p)}</TableCell>
                    <TableCell>{p.cargo}</TableCell>
                    <TableCell>{p.calidad}</TableCell>
                    <TableCell
                      style={{
                        backgroundColor: docsValidStyle.bg,
                        color: docsValidStyle.color,
                        fontWeight: 500,
                      }}
                    >
                      {validDocs} / {totalDocs}
                    </TableCell>
                    <TableCell>{p.claveIfe}</TableCell>
                    {isDetailMode && <TableCell>{p.ocr}</TableCell>}
                    <TableCell>{p.curp}</TableCell>
                    <TableCell>{p.rfcHomoclave}</TableCell>
                    {isDetailMode && (
                      <>
                        <TableCell>{p.accionAfirmativa}</TableCell>
                        <TableCell>{p.internoExterno}</TableCell>
                        <TableCell>{p.municipioDondeNacio}</TableCell>
                        <TableCell>{p.estadoDondeNacio}</TableCell>
                        <TableCell>{p.ocupacion}</TableCell>
                        <TableCell>{p.calleDondeVive}</TableCell>
                        <TableCell>{p.numeroDondeVive}</TableCell>
                        <TableCell>{p.coloniaDondeVive}</TableCell>
                        <TableCell>{p.municipioDondeVive}</TableCell>
                        <TableCell>{p.estadoDondeVive}</TableCell>
                        <TableCell>{p.codigoPostal}</TableCell>
                        <TableCell>{p.tiempoDeResidenciaEnDomicilio}</TableCell>
                        <TableCell>{p.genero}</TableCell>
                        <TableCell>{p.escolaridad}</TableCell>
                        <TableCell>{p.carrera}</TableCell>
                        <TableCell>{p.lugarDondeTrabaja}</TableCell>
                        <TableCell>{p.puestoEnSuTrabajo}</TableCell>
                        <TableCell>{p.fechaIngresoTrabajo}</TableCell>
                        <TableCell>{p.fechaTerminacionTrabajo}</TableCell>
                      </>
                    )}
                    <TableCell>{p.telefono}</TableCell>
                    <TableCell>{p.correoElectronico}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${precandidatoId}-expanded`}>
                      <TableCell colSpan={totalColumns} sx={{ p: 0, backgroundColor: '#f5f5f5' }}>
                        <Box sx={{ py: 1, pl: 4, pr: 2 }}>
                          {isLoadingDocs ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                              <CircularProgress size={20} />
                            </Box>
                          ) : hasDocsError ? (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              No se pudieron cargar los documentos
                            </Alert>
                          ) : groupDocuments ? (
                            renderDocumentsGroup(merged, precandidatoId)
                          ) : (
                            renderDocsSection(merged, precandidatoId, false)
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
