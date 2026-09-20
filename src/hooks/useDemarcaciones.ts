import { useState, useCallback } from 'react'
import type {
  DemarcacionCatalogo,
  FolioDemarcacion,
  DemarcacionRow,
  DemarcacionStatus,
} from '../types/demarcacion'
import type { Folio } from '../types/folio'
import type { DemarcacionError } from '../services/demarcacionService'
import {
  getMyFolio,
  getCatalogoDemarcaciones,
  getDemarcacionesByFolio,
  createDemarcacion,
  deleteDemarcacion,
  uploadExcel,
  getPrecandidatos,
} from '../services/demarcacionService'

export function useDemarcaciones() {
  const [folio, setFolio] = useState<Folio | null>(null)
  const [catalogo, setCatalogo] = useState<DemarcacionCatalogo[]>([])
  const [folioDemarcaciones, setFolioDemarcaciones] = useState<FolioDemarcacion[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingIds, setUploadingIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<DemarcacionError | null>(null)
  const [precandidatosCounts, setPrecandidatosCounts] = useState<Map<string, number>>(new Map())

  const mergeDemarcaciones = useCallback(
    (
      catalogoList: DemarcacionCatalogo[],
      folioList: FolioDemarcacion[],
      counts: Map<string, number>
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
          precandidatoCount: counts.get(cat.demarcacion),
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
        getMyFolio(),
        getCatalogoDemarcaciones(),
      ])

      setFolio(folioData)
      setCatalogo(catalogoData)

      if (folioData.id) {
        const fdData = await getDemarcacionesByFolio(folioData.id)
        setFolioDemarcaciones(fdData)

        const counts = new Map<string, number>()
        await Promise.all(
          fdData.map(async (fd) => {
            try {
              const precandidatos = await getPrecandidatos(folioData.id, fd.demarcacion)
              counts.set(fd.demarcacion, precandidatos.length)
            } catch {
              counts.set(fd.demarcacion, 0)
            }
          })
        )
        setPrecandidatosCounts(counts)
      }
    } catch (err) {
      setError(err as DemarcacionError)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const demarcaciones = mergeDemarcaciones(catalogo, folioDemarcaciones, precandidatosCounts)

  const getStatusColor = (status: DemarcacionStatus) => {
    switch (status) {
      case 'POR_VALIDAR':
        return { bg: '#FFD100', color: '#000000' }
      case 'VALIDO':
        return { bg: '#4CAF50', color: '#FFFFFF' }
      case 'ERROR':
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
    getStatusColor,
  }
}
