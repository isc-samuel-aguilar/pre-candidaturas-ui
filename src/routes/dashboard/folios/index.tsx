import { createFileRoute } from '@tanstack/react-router'
import { Box, Divider, Snackbar, Alert } from '@mui/material'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFolios } from '../../../hooks/useFolios'
import { FolioForm } from './components/FolioForm'
import { FolioList } from './components/FolioList'
import {
  generateDummyData,
  registerDummyDataProvider,
  type DummyFolioData,
} from '../../../utils/dummyData'
import type { Folio, CreateFolioRequest, UpdateFolioRequest } from '../../../types/folio'

export const Route = createFileRoute('/dashboard/folios/')({
  component: FoliosPage,
})

function computeNextFolio(folios: Folio[]): string {
  if (folios.length === 0) return ''
  const sorted = [...folios].sort((a, b) => {
    const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0
    const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0
    return dateB - dateA
  })
  const lastFolio = sorted[0]
  if (!lastFolio) return ''
  const num = parseInt(lastFolio.folio, 10)
  if (isNaN(num)) return ''
  return (num + 1).toString().padStart(3, '0')
}

function FoliosPage() {
  const {
    folios,
    representations,
    loading,
    error,
    fetchFolios,
    fetchRepresentations,
    create,
    update,
    remove,
  } = useFolios()

  const [editingFolio, setEditingFolio] = useState<Folio | null>(null)
  const [dummyDataToFill, setDummyDataToFill] = useState<DummyFolioData | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const nextFolio = useMemo(() => computeNextFolio(folios), [folios])

  useEffect(() => {
    fetchRepresentations()
    fetchFolios()
  }, [fetchRepresentations, fetchFolios])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    return registerDummyDataProvider('folios', () => {
      const data = generateDummyData('folios', nextFolio)
      if (data) {
        setDummyDataToFill(data)
      }
    })
  }, [nextFolio])

  const handleDummyDataConsumed = useCallback(() => {
    setDummyDataToFill(null)
  }, [])

  const handleSubmit = useCallback(
    async (data: CreateFolioRequest | UpdateFolioRequest) => {
      let result: Folio | null = null

      if (editingFolio) {
        result = await update(editingFolio.id, data as UpdateFolioRequest)
      } else {
        result = await create(data as CreateFolioRequest)
      }

      if (result) {
        setSnackbar({
          open: true,
          message: editingFolio
            ? 'Folio actualizado correctamente'
            : 'Folio registrado correctamente',
          severity: 'success',
        })
        setEditingFolio(null)
      } else if (error) {
        setSnackbar({
          open: true,
          message: error.message || 'Error al procesar la solicitud',
          severity: 'error',
        })
      }
    },
    [editingFolio, create, update, error]
  )

  const handleEdit = useCallback((folio: Folio) => {
    setEditingFolio(folio)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingFolio(null)
  }, [])

  const handleDelete = useCallback(
    async (id: number) => {
      const success = await remove(id)
      if (success) {
        setSnackbar({
          open: true,
          message: 'Folio eliminado correctamente',
          severity: 'success',
        })
        if (editingFolio?.id === id) {
          setEditingFolio(null)
        }
      } else if (error) {
        setSnackbar({
          open: true,
          message: error.message || 'Error al eliminar el folio',
          severity: 'error',
        })
      }
    },
    [remove, editingFolio, error]
  )

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  return (
    <Box>
      <FolioForm
        representations={representations}
        editingFolio={editingFolio}
        defaultFolio={nextFolio}
        dummyDataToFill={dummyDataToFill}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
        onDummyDataConsumed={handleDummyDataConsumed}
        loading={loading}
        error={error?.message ?? null}
      />

      <Divider sx={{ my: 4 }} />

      <FolioList
        folios={folios}
        loading={loading}
        error={null}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
