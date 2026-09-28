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
    error,
    fetchData,
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
        uploadingIds={new Set<number>()}
        onUpload={async () => {}}
        onDelete={async () => {}}
        getStatusColor={getStatusColor}
        mode="validate"
        onSaveStatus={handleSaveStatus}
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
