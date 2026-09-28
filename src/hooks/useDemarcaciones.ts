import { useState, useCallback } from 'react'
import type {
  DemarcacionCatalogo,
  FolioDemarcacion,
  DemarcacionRow,
  DemarcacionStatus,
} from '../types/demarcacion'
import type { Folio } from '../types/folio'
import type { DemarcacionError } from '../services/demarcacionService'
import { StatusEnum } from '../types/enums'
import { getFoliosByUser } from '../services/folioService'
import {
  getMyFolio,
  getCatalogoDemarcaciones,
  getDemarcacionesByFolio,
  createDemarcacion,
  deleteDemarcacion,
  updateDemarcacionStatus,
  uploadExcel,
} from '../services/demarcacionService'

interface UseDemarcacionesOptions {
  userName?: string
}

export function useDemarcaciones(options?: UseDemarcacionesOptions) {
  const userName = options?.userName
  const [folio, setFolio] = useState<Folio | null>(null)
  const [catalogo, setCatalogo] = useState<DemarcacionCatalogo[]>([])
  const [folioDemarcaciones, setFolioDemarcaciones] = useState<FolioDemarcacion[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingIds, setUploadingIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<DemarcacionError | null>(null)

  const mergeDemarcaciones = useCallback(
    (
      catalogoList: DemarcacionCatalogo[],
      folioList: FolioDemarcacion[]
    ): DemarcacionRow[] => {
      return catalogoList.map((cat) => {
        const fd = folioList.find(
          (f) =>
            f.demarcacionId === cat.id ||
            (f.demarcacion === cat.demarcacion && f.ambito === cat.ambito)
        )
        return {
          catalogo: cat,
          folioDemarcacion: fd || null,
          status: fd?.status || null,
        }
      })
    },
    []
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [folioData, catalogoData] = await Promise.all([
        userName ? getFoliosByUser(userName) : getMyFolio(),
        getCatalogoDemarcaciones(),
      ])

      setFolio(folioData)
      setCatalogo(catalogoData)

      if (folioData.id) {
        const fdData = await getDemarcacionesByFolio(folioData.id)
        setFolioDemarcaciones(fdData)
      }
    } catch (err) {
      setError(err as DemarcacionError)
    } finally {
      setLoading(false)
    }
  }, [userName])

  const handleUpload = useCallback(
    async (demarcacion: DemarcacionCatalogo, file: File) => {
      if (!folio?.id) return

      setError(null)
      setUploadingIds((prev) => new Set(prev).add(demarcacion.id))

      try {
        await createDemarcacion(folio.id, demarcacion.demarcacion, demarcacion.ambito)
        await uploadExcel(folio.id, demarcacion.demarcacion, file)

        const fdData = await getDemarcacionesByFolio(folio.id)
        setFolioDemarcaciones(fdData)
      } catch (err) {
        setError(err as DemarcacionError)
        throw err
      } finally {
        setUploadingIds((prev) => {
          const next = new Set(prev)
          next.delete(demarcacion.id)
          return next
        })
      }
    },
    [folio]
  )

  const handleDelete = useCallback(
    async (folioDemarcacionId: number) => {
      if (!folio?.id) return

      setLoading(true)
      setError(null)

      try {
        await deleteDemarcacion(folio.id, folioDemarcacionId)

        const fdData = await getDemarcacionesByFolio(folio.id)
        setFolioDemarcaciones(fdData)
      } catch (err) {
        setError(err as DemarcacionError)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [folio]
  )

  const updateStatus = useCallback(
    async (
      folioDemarcacion: FolioDemarcacion,
      status: StatusEnum,
      statusDescription: string | null
    ) => {
      setError(null)

      try {
        await updateDemarcacionStatus(folioDemarcacion.folioId, folioDemarcacion.id, {
          status,
          statusDescription,
        })

        const fdData = await getDemarcacionesByFolio(folioDemarcacion.folioId)
        setFolioDemarcaciones(fdData)
      } catch (err) {
        setError(err as DemarcacionError)
        throw err
      }
    },
    []
  )

  const demarcaciones = mergeDemarcaciones(catalogo, folioDemarcaciones)

  const getStatusColor = (status: DemarcacionStatus) => {
    switch (status) {
      case StatusEnum.POR_VALIDAR:
        return { bg: '#FFD100', color: '#000000' }
      case StatusEnum.VALIDO:
        return { bg: '#4CAF50', color: '#FFFFFF' }
      case StatusEnum.ERROR:
        return { bg: '#F44336', color: '#FFFFFF' }
      default:
        return { bg: '#E0E0E0', color: '#757575' }
    }
  }

  return {
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
  }
}
