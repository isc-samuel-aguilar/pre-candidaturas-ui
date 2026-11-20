import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Typography, Snackbar, Alert } from '@mui/material'
import { useDemarcaciones } from '../../../hooks/useDemarcaciones'
import { FolioSection } from './components/FolioSection'
import { ExamplesSection } from './components/ExamplesSection'
import { DemarcacionTable } from './components/DemarcacionTable'
import type { DemarcacionRow } from '../../../types/demarcacion'
import type { StatusEnum } from '../../../types/enums'
import type { RouterContext } from '../../../main'

export const Route = createFileRoute('/dashboard/excel/')({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    const role = auth.user?.role
    if (role !== 'REGISTER') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ExcelPage,
})

function ExcelPage() {
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
  } = useDemarcaciones()

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const didFetch = useRef(false)

  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true
    fetchData()
  }, [fetchData])

  const handleUploadWithFeedback = useCallback(
    async (demarcacion: DemarcacionRow, file: File) => {
      try {
        await handleUpload(demarcacion.catalogo, file)
        setSnackbar({
          open: true,
          message: `Archivo cargado exitosamente para ${demarcacion.catalogo.demarcacion}`,
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
      } catch {
        setSnackbar({
          open: true,
          message: error?.message || 'Error al eliminar la demarcación',
          severity: 'error',
        })
      }
    },
    [handleDelete, error]
  )

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  // Sólo lo usa ADMIN (columnas Validar/Acciones de la vista de subida)
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
        await fetchData()
      } catch (err) {
        setSnackbar({
          open: true,
          message: (err as { message?: string }).message || 'Error al guardar los cambios',
          severity: 'error',
        })
        throw err
      }
    },
    [updateStatus, fetchData]
  )

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Registrar con Excel
      </Typography>

      <FolioSection folio={folio} demarcaciones={demarcaciones} loading={loading} />

      <ExamplesSection />

      <DemarcacionTable
        demarcaciones={demarcaciones}
        loading={loading}
        uploadingIds={uploadingIds}
        onUpload={handleUploadWithFeedback}
        onDelete={handleDeleteWithFeedback}
        getStatusColor={getStatusColor}
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
