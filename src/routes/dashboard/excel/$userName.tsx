import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Typography, Snackbar, Alert } from '@mui/material'
import { useDemarcaciones } from '../../../hooks/useDemarcaciones'
import { FolioSection } from './components/FolioSection'
import { DemarcacionTable } from './components/DemarcacionTable'
import type { RouterContext } from '../../../main'
import type { DemarcacionRow } from '../../../types/demarcacion'
import type { StatusEnum } from '../../../types/enums'

export const Route = createFileRoute('/dashboard/excel/$userName')({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    const role = auth.user?.role
    if (role !== 'ADMIN' && role !== 'VALIDATOR') {
      throw redirect({ to: '/dashboard/excel' })
    }
  },
  component: ExcelValidationPage,
})

function ExcelValidationPage() {
  const { userName } = Route.useParams()
  const {
    folio,
    demarcaciones,
    loading,
    uploadingIds,
    error,
    fetchData,
    handleUpload,
    handleDelete,
    updateStatus,
    getStatusColor,
  } = useDemarcaciones({ userName })

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const didFetch = useRef<string | null>(null)

  useEffect(() => {
    if (didFetch.current === userName) return
    didFetch.current = userName
    fetchData()
  }, [fetchData, userName])

  const handleSaveStatus = useCallback(
    async (
      demarcacion: DemarcacionRow,
      status: StatusEnum,
      statusDescription: string | null
    ) => {
      if (!demarcacion.folioDemarcacion) return

      try {
        await updateStatus(demarcacion.folioDemarcacion, status, statusDescription)
        setSnackbar({
          open: true,
          message: `Demarcación ${
            demarcacion.catalogo.alias || demarcacion.catalogo.demarcacion
          } actualizada correctamente`,
          severity: 'success',
        })
      } catch (err) {
        setSnackbar({
          open: true,
          message: (err as { message?: string }).message || 'Error al guardar los cambios',
          severity: 'error',
        })
        throw err
      }
    },
    [updateStatus]
  )

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  // Sólo los usa ADMIN (columnas Excel/Eliminar de la vista de validación;
  // VALIDATOR no las ve porque showUploadCols es false)
  const handleUploadWithFeedback = useCallback(
    async (demarcacion: DemarcacionRow, file: File) => {
      try {
        await handleUpload(demarcacion.catalogo, file)
        setSnackbar({
          open: true,
          message: `Archivo cargado exitosamente para ${
            demarcacion.catalogo.alias || demarcacion.catalogo.demarcacion
          }`,
          severity: 'success',
        })
      } catch (err) {
        setSnackbar({
          open: true,
          message: (err as { message?: string }).message || 'Error al cargar el archivo',
          severity: 'error',
        })
      }
    },
    [handleUpload]
  )

  const handleDeleteWithFeedback = useCallback(
    async (folioDemarcacionId: number) => {
      try {
        await handleDelete(folioDemarcacionId)
        setSnackbar({
          open: true,
          message: 'Demarcación eliminada correctamente',
          severity: 'success',
        })
      } catch (err) {
        setSnackbar({
          open: true,
          message: (err as { message?: string }).message || 'Error al eliminar la demarcación',
          severity: 'error',
        })
      }
    },
    [handleDelete]
  )

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Validación de Folio
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Usuario: {userName}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || 'No se pudo cargar el folio del usuario'}
        </Alert>
      )}

      <FolioSection folio={folio} demarcaciones={demarcaciones} loading={loading} />

      <DemarcacionTable
        demarcaciones={demarcaciones}
        loading={loading}
        uploadingIds={uploadingIds}
        onUpload={handleUploadWithFeedback}
        onDelete={handleDeleteWithFeedback}
        getStatusColor={getStatusColor}
        mode="validate"
        onSaveStatus={handleSaveStatus}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? null : 4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ whiteSpace: 'pre-line', maxHeight: '50vh', overflowY: 'auto' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
