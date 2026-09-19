import { useState, useCallback } from 'react'
import {
  getFolios,
  getFolioById,
  createFolio,
  updateFolio,
  deleteFolio,
  getRepresentations,
  type FolioError,
} from '../services/folioService'
import type {
  Folio,
  CreateFolioRequest,
  UpdateFolioRequest,
  Configuration,
} from '../types/folio'

export function useFolios() {
  const [folios, setFolios] = useState<Folio[]>([])
  const [representations, setRepresentations] = useState<Configuration[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<FolioError | null>(null)

  const fetchFolios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFolios()
      setFolios(data)
    } catch (err) {
      setError(err as FolioError)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRepresentations = useCallback(async () => {
    try {
      const data = await getRepresentations()
      setRepresentations(data)
    } catch (err) {
      setError(err as FolioError)
    }
  }, [])

  const fetchFolioById = useCallback(async (id: number): Promise<Folio | null> => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFolioById(id)
      return data
    } catch (err) {
      setError(err as FolioError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: CreateFolioRequest): Promise<Folio | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await createFolio(data)
      await fetchFolios()
      return result
    } catch (err) {
      setError(err as FolioError)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchFolios])

  const update = useCallback(async (id: number, data: UpdateFolioRequest): Promise<Folio | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await updateFolio(id, data)
      await fetchFolios()
      return result
    } catch (err) {
      setError(err as FolioError)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchFolios])

  const remove = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await deleteFolio(id)
      await fetchFolios()
      return true
    } catch (err) {
      setError(err as FolioError)
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchFolios])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    folios,
    representations,
    loading,
    error,
    fetchFolios,
    fetchRepresentations,
    fetchFolioById,
    create,
    update,
    remove,
    clearError,
  }
}
