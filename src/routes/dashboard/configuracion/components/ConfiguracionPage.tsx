import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
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
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  getPdfTemplates,
  reloadPdfTemplates,
  uploadPdfTemplate,
  type PdfTemplate,
  type PdfTemplateError,
} from '../../../../services/pdfTemplateService'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function validateUpload(file: File | null, mappings: string): string | null {
  if (!file) return 'Selecciona un archivo PDF'
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'El archivo debe tener extensión .pdf'
  if (file.size > MAX_UPLOAD_BYTES) return 'El archivo supera el máximo de 5 MB'

  const trimmed = mappings.trim()
  if (trimmed) {
    try {
      JSON.parse(trimmed)
    } catch {
      return 'El contenido de mappings no es JSON válido'
    }
  }

  return null
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
                <TableCell>Tokens</TableCell>
                <TableCell>Última carga</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>Sin plantillas cargadas</TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.documento}>
                    <TableCell>{template.documento}</TableCell>
                    <TableCell>{template.plantilla}</TableCell>
                    <TableCell>{template.tokens}</TableCell>
                    <TableCell>{template.ultimaCarga}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="h6" sx={{ mt: 4 }}>
        Subir plantilla
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
          label="mappings.json (opcional)"
          multiline
          rows={4}
          value={mappings}
          onChange={(event) => setMappings(event.target.value)}
          placeholder='{"TOKEN": "campo"}'
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
