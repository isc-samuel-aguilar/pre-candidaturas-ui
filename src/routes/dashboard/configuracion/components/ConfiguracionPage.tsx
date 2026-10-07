import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  deletePdfTemplate,
  getPdfTemplates,
  reloadPdfTemplates,
  uploadPdfTemplate,
  type PdfTemplate,
  type PdfTemplateError,
} from '../../../../services/pdfTemplateService'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const DOCUMENTO_MAX_WIDTH = 140
const PLANTILLA_MAX_WIDTH = 215
const CAMPOS_MAX_WIDTH = 390

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateUpload(file: File | null, mappings: string): string | null {
  if (!file) return 'Selecciona un archivo PDF'
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'El archivo debe tener extensión .pdf'
  if (file.size > MAX_UPLOAD_BYTES) return 'El archivo supera el máximo de 5 MB'

  const trimmed = mappings.trim()
  if (!trimmed) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return 'El contenido de mappings no es JSON válido'
  }
  if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) {
    return 'El contenido de mappings debe ser un objeto JSON no vacío'
  }

  for (const [clave, entrada] of Object.entries(parsed)) {
    if (!/^[A-Z0-9_]+$/.test(clave)) {
      return `La clave "${clave}" no es válida (usa A-Z, 0-9 y _)`
    }
    if (!isPlainObject(entrada)) {
      return `La entrada "${clave}" debe ser un objeto JSON`
    }
    if (typeof entrada.salida !== 'string' || !entrada.salida.trim()) {
      return `Falta "salida" (nombre del documento de salida) en ${clave}`
    }
    if (!isPlainObject(entrada.campos)) {
      return `Falta "campos" como objeto en ${clave}`
    }
    if (Object.keys(entrada.campos).length === 0) {
      return `El "campos" de ${clave} debe ser un objeto no vacío`
    }
  }

  return null
}

export function formatCampos(campos: string): string {
  try {
    return JSON.stringify(JSON.parse(campos), null, 2)
  } catch {
    return campos
  }
}

export function formatDateTime(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso)
  if (!match) return iso
  return `${match[1]} ${match[2]}`
}

export function formatLastUpdate(template: PdfTemplate): string {
  if (!template.actualizadoPor && !template.actualizadoFecha) return '—'
  const who = template.actualizadoPor ?? '—'
  const when = template.actualizadoFecha ? formatDateTime(template.actualizadoFecha) : '—'
  return `${who} · ${when}`
}

export function buildUpdateMappings(template: PdfTemplate): string {
  let campos: unknown
  try {
    campos = JSON.parse(template.campos)
  } catch {
    campos = template.campos
  }
  return JSON.stringify({ [template.documento]: { campos, salida: template.salida } }, null, 2)
}

function getErrorMessage(error: unknown): string {
  const mapped = error as PdfTemplateError
  return mapped?.message || 'Error inesperado'
}

function ConfiguracionPage() {
  const [templates, setTemplates] = useState<PdfTemplate[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [confirmReloadOpen, setConfirmReloadOpen] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [mappings, setMappings] = useState('')
  const [uploading, setUploading] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<PdfTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const mappingsRef = useRef<HTMLTextAreaElement | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }, [])

  const loadTemplates = useCallback(async () => {
    setLoadingList(true)
    try {
      setTemplates(await getPdfTemplates())
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setLoadingList(false)
    }
  }, [showSnackbar])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  const handleReloadConfirm = useCallback(async () => {
    setConfirmReloadOpen(false)
    setReloading(true)
    try {
      await reloadPdfTemplates()
      showSnackbar('Plantillas recargadas', 'success')
      await loadTemplates()
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setReloading(false)
    }
  }, [loadTemplates, showSnackbar])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
  }, [])

  const handleUpload = useCallback(async () => {
    const validationError = validateUpload(file, mappings)
    if (validationError) {
      showSnackbar(validationError, 'error')
      return
    }

    setUploading(true)
    try {
      const updated = await uploadPdfTemplate(file as File, mappings.trim() || undefined)
      setTemplates(updated)
      showSnackbar('Plantilla actualizada', 'success')
      setFile(null)
      setMappings('')
      setInputKey((prev) => prev + 1)
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setUploading(false)
    }
  }, [file, mappings, showSnackbar])

  const handlePrefill = useCallback((template: PdfTemplate) => {
    setMappings(buildUpdateMappings(template))
    setFile(null)
    setInputKey((prev) => prev + 1)
    const textarea = mappingsRef.current
    textarea?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    textarea?.focus()
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    setDeleting(true)
    try {
      await deletePdfTemplate(target.documento)
      showSnackbar('Plantilla borrada', 'success')
      await loadTemplates()
    } catch (error) {
      showSnackbar(getErrorMessage(error), 'error')
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, loadTemplates, showSnackbar])

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Configurar
      </Typography>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Plantillas PDF
      </Typography>

      <Box sx={{ mb: 2, mt: 1 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={
            reloading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />
          }
          onClick={() => setConfirmReloadOpen(true)}
          disabled={reloading || loadingList}
        >
          Actualizar template
        </Button>
      </Box>

      {loadingList ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Plantillas PDF">
            <TableHead>
              <TableRow>
                <TableCell>Documento</TableCell>
                <TableCell>Plantilla</TableCell>
                <TableCell>Última carga</TableCell>
                <TableCell>Versión</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell>Última modificación</TableCell>
                <TableCell sx={{ maxWidth: CAMPOS_MAX_WIDTH }}>Campos</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>Sin plantillas cargadas</TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.documento}>
                    <TableCell>
                      <Box sx={{ maxWidth: DOCUMENTO_MAX_WIDTH, overflowWrap: 'break-word' }}>
                        {template.documento}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: PLANTILLA_MAX_WIDTH, overflowWrap: 'break-word' }}>
                        {template.plantilla}
                      </Box>
                    </TableCell>
                    <TableCell>{formatDateTime(template.ultimaCarga)}</TableCell>
                    <TableCell>{template.version}</TableCell>
                    <TableCell>{template.activo ? 'Sí' : 'No'}</TableCell>
                    <TableCell>{formatLastUpdate(template)}</TableCell>
                    <TableCell sx={{ maxWidth: CAMPOS_MAX_WIDTH, verticalAlign: 'top' }}>
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          maxHeight: 200,
                          overflow: 'auto',
                          whiteSpace: 'pre',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                      >
                        {formatCampos(template.campos)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handlePrefill(template)}
                        disabled={deleting}
                      >
                        Actualizar…
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setPendingDelete(template)}
                        disabled={deleting}
                      >
                        Borrar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="h6" sx={{ mt: 4 }}>
        Plantilla PDF
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, maxWidth: 600 }}>
        <Box>
          <Button variant="outlined" color="primary" component="label" startIcon={<CloudUploadIcon />}>
            Seleccionar PDF
            <input
              key={inputKey}
              type="file"
              accept=".pdf,application/pdf"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {file.name}
            </Typography>
          )}
        </Box>

        <TextField
          inputRef={mappingsRef}
          label="mappings.json (opcional)"
          multiline
          rows={8}
          value={mappings}
          onChange={(event) => setMappings(event.target.value)}
          placeholder='{"CLAVE": {"campos": {"TOKEN": "campo"}, "salida": "Nombre Documento.pdf"}}'
          helperText='Cada clave necesita "campos" (objeto no vacío) y "salida" (nombre del documento de salida, p. ej. "CV PUBLICO APP.pdf").'
          fullWidth
        />

        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={
              uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />
            }
            onClick={() => void handleUpload()}
            disabled={uploading}
          >
            Subir plantilla
          </Button>
        </Box>
      </Box>

      <Dialog open={confirmReloadOpen} onClose={() => setConfirmReloadOpen(false)}>
        <DialogTitle>Actualizar plantillas</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se recargarán las plantillas PDF desde el servidor. ¿Deseas continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReloadOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void handleReloadConfirm()} autoFocus>
            Actualizar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Borrar plantilla</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se eliminará la plantilla &quot;{pendingDelete?.documento}&quot; (fila, PDF y entrada
            del catálogo). ¿Deseas continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleDeleteConfirm()}
            autoFocus
          >
            Borrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ConfiguracionPage
