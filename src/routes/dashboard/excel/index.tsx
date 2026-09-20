import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Box, Typography, Snackbar, Alert } from '@mui/material'
import { useDemarcaciones } from '../../../hooks/useDemarcaciones'
import { FolioSection } from './components/FolioSection'
import { ExamplesSection } from './components/ExamplesSection'
import { DemarcacionTable } from './components/DemarcacionTable'
import type { DemarcacionRow } from '../../../types/demarcacion'

export const Route = createFileRoute('/dashboard/excel/')({
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
    getStatusColor,
  } = useDemarcaciones()

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
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
      } catch {
        setSnackbar({
          open: true,
          message: error?.message || 'Error al cargar el archivo',
          severity: 'error',
        })
      }
    },
    [handleUpload, error]
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
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
