import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Snackbar,
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
import {
  DEMARCATION_DOCUMENT_KEY,
  deleteDemarcationDocument,
  downloadDemarcationDocumentFile,
  generateDemarcationDocument,
  getDemarcationDocumentTypes,
  getDemarcationDocuments,
  toDocumentoKey,
  updateDemarcationDocumentStatus,
  uploadDemarcationDocument,
  type UpdateDocumentStatusPayload,
} from '../../../../services/documentService'
import { useAuth } from '../../../../contexts/AuthContext'
import type {
  DemarcacionStatus,
  DemarcationDocument,
  KeyValueCatalog,
} from '../../../../types/demarcacion'
import { StatusEnum } from '../../../../types/enums'
import { compressImage, isImageFile, validateFile } from '../../../../utils/fileUtils'

const EMPTY_STATUS_STYLE = { bg: '#E0E0E0', color: '#757575' }

export const FUR_DOCUMENT_KEY = 'FORMATO_UNICO_DE_REGISTRO_FUR_APP'

interface DocumentRow {
  catalogType: string
  document: DemarcationDocument | null
}

interface DocEditState {
  status: StatusEnum | ''
  comment: string
  saving: boolean
}

interface DemarcacionDocumentsTableProps {
  folioId: number
  folioDemarcacionId: number
  demarcacionStatus: DemarcacionStatus
  mode?: 'upload' | 'validate'
}

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

function mergeDocs(
  documentTypes: KeyValueCatalog[],
  existingDocs: DemarcationDocument[]
): DocumentRow[] {
  return documentTypes.map((type) => {
    const found = existingDocs.find((d) => d.keyValueCatalogValue === type.value)
    return { catalogType: type.value, document: found || null }
  })
}

function isFurRow(catalogType: string): boolean {
  return toDocumentoKey(catalogType) === FUR_DOCUMENT_KEY
}

function getInitialDocStatus(doc: DemarcationDocument | null): StatusEnum | '' {
  if (doc?.status === StatusEnum.VALIDO || doc?.status === StatusEnum.ERROR) {
    return doc.status
  }
  return ''
}

function getInitialDocEdit(doc: DemarcationDocument | null): DocEditState {
  return {
    status: getInitialDocStatus(doc),
    comment: doc?.statusDescription ?? '',
    saving: false,
  }
}

export function DemarcacionDocumentsTable({
  folioId,
  folioDemarcacionId,
  demarcacionStatus,
  mode = 'upload',
}: DemarcacionDocumentsTableProps) {
  const { user, token } = useAuth()
  const role = user?.role

  const canUpload = role === 'ADMIN' || role === 'REGISTER'
  const canDelete = canUpload
  const canValidate = role === 'ADMIN' || role === 'VALIDATOR'

  const isValidateMode = mode === 'validate'
  const isDemarcationValid = demarcacionStatus === StatusEnum.VALIDO

  const allowSubir = canUpload && isDemarcationValid
  const allowEliminar = canDelete
  const allowValidar = canValidate && isDemarcationValid
  const allowGenerate = isDemarcationValid

  const [documentTypes, setDocumentTypes] = useState<KeyValueCatalog[] | null>(null)
  const [documents, setDocuments] = useState<DemarcationDocument[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [docsError, setDocsError] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set())
  const [downloadingTypes, setDownloadingTypes] = useState<Set<string>>(new Set())
  const [generatingTypes, setGeneratingTypes] = useState<Set<string>>(new Set())
  const [docEdits, setDocEdits] = useState<Map<string, DocEditState>>(new Map())
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({ open: false, message: '', severity: 'success' })
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const refreshDocs = useCallback(async () => {
    try {
      const existing = await getDemarcationDocuments(folioId, folioDemarcacionId)
      setDocuments(existing)
      setDocsError(false)
    } catch {
      setDocuments(null)
      setDocsError(true)
    }
  }, [folioId, folioDemarcacionId])

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

  useEffect(() => {
    refreshDocs()
  }, [refreshDocs])

  const getDocEdit = (key: string, doc: DemarcationDocument | null): DocEditState =>
    docEdits.get(key) ?? getInitialDocEdit(doc)

  const patchDocEdit = (
    key: string,
    doc: DemarcationDocument | null,
    patch: Partial<DocEditState>
  ) => {
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

  const getInitialDocComment = (doc: DemarcationDocument | null) => doc?.statusDescription ?? ''

  const isDocEditDirty = (key: string, doc: DemarcationDocument | null) => {
    const edit = getDocEdit(key, doc)
    return (
      doc !== null &&
      (edit.status !== getInitialDocStatus(doc) ||
        edit.comment !== getInitialDocComment(doc))
    )
  }

  const handleFileSelect = async (catalogType: string, file: File | null) => {
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

    setUploadingTypes((prev) => new Set(prev).add(catalogType))

    try {
      await uploadDemarcationDocument(
        folioId,
        folioDemarcacionId,
        catalogType,
        finalFile,
        DEMARCATION_DOCUMENT_KEY
      )
      await refreshDocs()
    } catch (err) {
      setSnackbar({
        open: true,
        message: (err as { message?: string }).message || 'Error al subir el documento',
        severity: 'error',
      })
    } finally {
      setUploadingTypes((prev) => {
        const next = new Set(prev)
        next.delete(catalogType)
        return next
      })
      const input = fileInputRefs.current.get(catalogType)
      if (input) input.value = ''
    }
  }

  const handleDeleteDoc = async (catalogType: string, documentId: number) => {
    try {
      await deleteDemarcationDocument(folioId, folioDemarcacionId, documentId)
      cancelDocEdit(catalogType)
      await refreshDocs()
      setSnackbar({
        open: true,
        message: 'Documento eliminado correctamente',
        severity: 'success',
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: (err as { message?: string }).message || 'Error al eliminar el documento',
        severity: 'error',
      })
    }
  }

  const handleDownloadFile = async (catalogType: string, doc: DemarcationDocument) => {
    if (!token) return

    setDownloadingTypes((prev) => new Set(prev).add(catalogType))
    try {
      await downloadDemarcationDocumentFile(folioId, folioDemarcacionId, doc, token)
    } catch (err) {
      setSnackbar({
        open: true,
        message: (err as { message?: string }).message || 'Error al descargar el documento',
        severity: 'error',
      })
    } finally {
      setDownloadingTypes((prev) => {
        const next = new Set(prev)
        next.delete(catalogType)
        return next
      })
    }
  }

  const handleGenerate = async (catalogType: string) => {
    if (!token) return

    const documentoKey = toDocumentoKey(catalogType)
    setGeneratingTypes((prev) => new Set(prev).add(catalogType))

    try {
      await generateDemarcationDocument(folioId, folioDemarcacionId, documentoKey, token)
      setSnackbar({ open: true, message: 'Documento generado', severity: 'success' })
    } catch (err) {
      setSnackbar({
        open: true,
        message: (err as { message?: string }).message || 'Error al generar el documento',
        severity: 'error',
      })
    } finally {
      setGeneratingTypes((prev) => {
        const next = new Set(prev)
        next.delete(catalogType)
        return next
      })
    }
  }

  const handleSaveDocStatus = async (catalogType: string, doc: DemarcationDocument | null) => {
    if (!doc) return
    const edit = getDocEdit(catalogType, doc)
    if (!edit.status) return

    const payload: UpdateDocumentStatusPayload = { status: edit.status }
    if (edit.comment !== getInitialDocComment(doc)) {
      payload.statusDescription = edit.comment
    }

    patchDocEdit(catalogType, doc, { saving: true })

    try {
      await updateDemarcationDocumentStatus(folioId, folioDemarcacionId, doc.id, payload)
      cancelDocEdit(catalogType)
      await refreshDocs()
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
        if (!prev.has(catalogType)) return prev
        const next = new Map(prev)
        next.set(catalogType, { ...prev.get(catalogType)!, saving: false })
        return next
      })
    }
  }

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

  if (docsError) {
    return (
      <Alert severity="warning" sx={{ m: 1 }}>
        No se pudieron cargar los documentos de la demarcación
      </Alert>
    )
  }

  if (documentTypes === null || documents === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    )
  }

  const rows = mergeDocs(documentTypes, documents)

  return (
    <Box sx={{ width: '100%' }}>
      {uploadError && (
        <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}
      <Table size="small" data-testid="demarcacion-documents-table">
        <TableHead>
          <TableRow>
            <TableCell>Tipo</TableCell>
            <TableCell>Nombre</TableCell>
            {!isValidateMode && <TableCell align="center">Subir</TableCell>}
            {!isValidateMode && <TableCell align="center">Eliminar</TableCell>}
            <TableCell align="center">Status</TableCell>
            {isValidateMode && <TableCell align="center">Validar</TableCell>}
            {isValidateMode && <TableCell>Comentario</TableCell>}
            {isValidateMode && <TableCell align="center">Acciones</TableCell>}
            <TableCell align="center">Generar</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const doc = row.document
            const status = doc?.status ?? null
            const hasFile = doc !== null
            const edit = getDocEdit(row.catalogType, doc)
            const isUploading = uploadingTypes.has(row.catalogType)
            const isDownloading = downloadingTypes.has(row.catalogType)
            const isGenerating = generatingTypes.has(row.catalogType)
            const showGenerar = isFurRow(row.catalogType)

            let tipoAction: 'download' | 'generate' | null = null
            if (!(showGenerar && !allowGenerate)) {
              if (hasFile && doc) {
                tipoAction = 'download'
              } else if (showGenerar) {
                tipoAction = 'generate'
              }
            }

            return (
              <TableRow key={row.catalogType} hover>
                <TableCell>
                  {tipoAction === 'download' && doc ? (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleDownloadFile(row.catalogType, doc)}
                      disabled={isDownloading}
                      startIcon={
                        isDownloading ? <CircularProgress size={14} /> : undefined
                      }
                      sx={{
                        textTransform: 'none',
                        color: 'primary.main',
                        fontWeight: 500,
                        justifyContent: 'flex-start',
                      }}
                    >
                      {row.catalogType}
                    </Button>
                  ) : tipoAction === 'generate' ? (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleGenerate(row.catalogType)}
                      disabled={isGenerating}
                      startIcon={
                        isGenerating ? <CircularProgress size={14} /> : undefined
                      }
                      sx={{
                        textTransform: 'none',
                        color: 'primary.main',
                        fontWeight: 500,
                        justifyContent: 'flex-start',
                      }}
                    >
                      {row.catalogType}
                    </Button>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {row.catalogType}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {hasFile && doc ? (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleDownloadFile(row.catalogType, doc)}
                      disabled={isDownloading}
                      startIcon={
                        isDownloading ? <CircularProgress size={14} /> : undefined
                      }
                      sx={{
                        textTransform: 'none',
                        color: 'primary.main',
                        justifyContent: 'flex-start',
                      }}
                    >
                      {doc.originalFilename || row.catalogType}
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                {!isValidateMode && (
                  <TableCell align="center">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                      style={{ display: 'none' }}
                      ref={(el) => {
                        if (el) fileInputRefs.current.set(row.catalogType, el)
                      }}
                      onChange={(e) =>
                        handleFileSelect(row.catalogType, e.target.files?.[0] || null)
                      }
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={isUploading ? <CircularProgress size={14} /> : <CloudUploadIcon />}
                      onClick={() => fileInputRefs.current.get(row.catalogType)?.click()}
                      disabled={!allowSubir || isUploading || hasFile}
                      sx={{ textTransform: 'none' }}
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
                      disabled={!allowEliminar || !hasFile || !doc}
                      onClick={() => doc && handleDeleteDoc(row.catalogType, doc.id)}
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
                {isValidateMode && (
                  <TableCell align="center">
                    {hasFile && doc ? (
                      <TextField
                        select
                        size="small"
                        label="Validar"
                        value={edit.status}
                        disabled={!allowValidar || edit.saving}
                        onChange={(e) =>
                          patchDocEdit(row.catalogType, doc, {
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
                {isValidateMode && (
                  <TableCell>
                    {hasFile && doc ? (
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        maxRows={3}
                        placeholder="Comentario..."
                        value={edit.comment}
                        disabled={!allowValidar || edit.saving}
                        onChange={(e) =>
                          patchDocEdit(row.catalogType, doc, { comment: e.target.value })
                        }
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                )}
                {isValidateMode && (
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSaveDocStatus(row.catalogType, doc)}
                        disabled={
                          !hasFile ||
                          !doc ||
                          !allowValidar ||
                          !edit.status ||
                          !isDocEditDirty(row.catalogType, doc) ||
                          edit.saving
                        }
                        sx={{ textTransform: 'none' }}
                      >
                        {edit.saving ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => cancelDocEdit(row.catalogType)}
                        disabled={
                          !isDocEditDirty(row.catalogType, doc) || edit.saving
                        }
                        sx={{ textTransform: 'none' }}
                      >
                        Cancelar
                      </Button>
                    </Box>
                  </TableCell>
                )}
                <TableCell align="center">
                  {showGenerar && allowGenerate ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleGenerate(row.catalogType)}
                      disabled={isGenerating}
                      startIcon={
                        isGenerating ? <CircularProgress size={14} /> : undefined
                      }
                      sx={{ textTransform: 'none' }}
                    >
                      Generar
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
