import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Alert,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import { getPrecandidatos } from '../services/demarcacionService'
import {
  getDocumentsByPrecandidato,
  getDocumentTypes,
  uploadDocument,
  deleteDocument,
  downloadDocumentFile,
} from '../services/documentService'
import { useAuth } from '../contexts/AuthContext'
import type { Precandidato, DemarcacionStatus, Documento, KeyValueCatalog } from '../types/demarcacion'
import { StatusEnum } from '../types/enums'
import { validateFile, isImageFile, compressImage } from '../utils/fileUtils'

interface DocumentRow {
  catalogType: string
  document: Documento | null
}

interface PrecandidatosTableProps {
  folioId: number
  demarcacionName: string
  mode?: 'excel' | 'detail'
  autoLoad?: boolean
  demarcacionStatus?: DemarcacionStatus
  onCountChange?: (count: number) => void
}

function getStatusLabel(status?: StatusEnum | null) {
  switch (status) {
    case StatusEnum.POR_VALIDAR:
      return 'Por Validar'
    case StatusEnum.VALIDO:
      return 'Válido'
    case StatusEnum.ERROR:
      return 'Error'
    default:
      return 'Por Validar'
  }
}

function getStatusColor(status?: StatusEnum | null) {
  switch (status) {
    case StatusEnum.POR_VALIDAR:
      return { bg: '#FFD100', color: '#000000' }
    case StatusEnum.VALIDO:
      return { bg: '#4CAF50', color: '#FFFFFF' }
    case StatusEnum.ERROR:
      return { bg: '#F44336', color: '#FFFFFF' }
    default:
      return { bg: '#FFD100', color: '#000000' }
  }
}

function mergeDocs(documentTypes: KeyValueCatalog[], existingDocs: Documento[]): DocumentRow[] {
  return documentTypes.map((type) => {
    const found = existingDocs.find((d) => d.keyValueCatalogValue === type.value)
    return { catalogType: type.value, document: found || null }
  })
}

export function PrecandidatosTable({
  folioId,
  demarcacionName,
  mode = 'excel',
  autoLoad = true,
  demarcacionStatus,
  onCountChange,
}: PrecandidatosTableProps) {
  const { token } = useAuth()
  const [precandidatos, setPrecandidatos] = useState<Precandidato[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [expandedPrecandidato, setExpandedPrecandidato] = useState<number | null>(null)
  const [documentsMap, setDocumentsMap] = useState<Map<number, DocumentRow[]>>(new Map())
  const [loadingDocs, setLoadingDocs] = useState<Set<number>>(new Set())
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set())
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [documentTypes, setDocumentTypes] = useState<KeyValueCatalog[]>([])
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const isDocsEnabled = demarcacionStatus === StatusEnum.VALIDO

  const fetchPrecandidatos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPrecandidatos(folioId, demarcacionName)
      setPrecandidatos(data)
      onCountChange?.(data.length)
    } catch {
      setError('Error al cargar los precandidatos')
    } finally {
      setLoading(false)
    }
  }, [folioId, demarcacionName, onCountChange])

  useEffect(() => {
    if (autoLoad) {
      fetchPrecandidatos()
    }
  }, [autoLoad, fetchPrecandidatos])

  useEffect(() => {
    getDocumentTypes()
      .then(setDocumentTypes)
      .catch(() => {})
  }, [])

  const refreshDocs = useCallback(
    async (precandidatoId: number) => {
      try {
        const existingDocs = await getDocumentsByPrecandidato(precandidatoId)
        setDocumentsMap((prev) => new Map(prev).set(precandidatoId, mergeDocs(documentTypes, existingDocs)))
      } catch {
        setDocumentsMap((prev) =>
          new Map(prev).set(
            precandidatoId,
            documentTypes.map((t) => ({ catalogType: t.value, document: null }))
          )
        )
      }
    },
    [documentTypes]
  )

  const formatFullName = (p: Precandidato) =>
    `${p.apellidoPaterno} ${p.apellidoMaterno} ${p.nombre}`.trim()

  const handleTogglePrecandidato = async (precandidatoId: number) => {
    if (expandedPrecandidato === precandidatoId) {
      setExpandedPrecandidato(null)
      return
    }

    setExpandedPrecandidato(precandidatoId)

    if (!documentsMap.has(precandidatoId) && !loadingDocs.has(precandidatoId)) {
      setLoadingDocs((prev) => new Set(prev).add(precandidatoId))
      try {
        const existingDocs = await getDocumentsByPrecandidato(precandidatoId)
        setDocumentsMap((prev) => new Map(prev).set(precandidatoId, mergeDocs(documentTypes, existingDocs)))
      } catch {
        setDocumentsMap((prev) =>
          new Map(prev).set(
            precandidatoId,
            documentTypes.map((t) => ({ catalogType: t.value, document: null }))
          )
        )
      } finally {
        setLoadingDocs((prev) => {
          const next = new Set(prev)
          next.delete(precandidatoId)
          return next
        })
      }
    }
  }

  const handleFileSelect = async (precandidatoId: number, docType: string, file: File | null) => {
    if (!file) return

    setUploadError(null)

    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Archivo no válido')
      return
    }

    let finalFile = file
    if (isImageFile(file)) {
      try {
        finalFile = await compressImage(file)
      } catch {
        setUploadError('Error al procesar la imagen')
        return
      }
    }

    const uploadKey = `${precandidatoId}-${docType}`
    setUploadingDocs((prev) => new Set(prev).add(uploadKey))

    try {
      await uploadDocument(precandidatoId, docType, finalFile)
      await refreshDocs(precandidatoId)
    } catch {
      // error handled by parent
    } finally {
      setUploadingDocs((prev) => {
        const next = new Set(prev)
        next.delete(uploadKey)
        return next
      })
      const input = fileInputRefs.current.get(uploadKey)
      if (input) input.value = ''
    }
  }

  const handleDeleteDoc = async (precandidatoId: number, documentId: number) => {
    try {
      await deleteDocument(documentId)
      await refreshDocs(precandidatoId)
    } catch {
      // error handled by parent
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    )
  }

  if (precandidatos.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No hay precandidatos registrados para esta demarcación
        </Typography>
      </Box>
    )
  }

  const isDetailMode = mode === 'detail'
  const totalColumns = isDetailMode ? 30 : 10

  return (
    <Box sx={{ p: 2 }}>
      {uploadError && (
        <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Nombre Completo</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Calidad</TableCell>
              <TableCell>Clave INE</TableCell>
              {isDetailMode && <TableCell>OCR</TableCell>}
              <TableCell>CURP</TableCell>
              <TableCell>RFC Homoclave</TableCell>
              {isDetailMode && (
                <>
                  <TableCell>Acción Afirmativa</TableCell>
                  <TableCell>Interno/Externo</TableCell>
                  <TableCell>Municipio Nacimiento</TableCell>
                  <TableCell>Estado Nacimiento</TableCell>
                  <TableCell>Ocupación</TableCell>
                  <TableCell>Calle</TableCell>
                  <TableCell>Número</TableCell>
                  <TableCell>Colonia</TableCell>
                  <TableCell>Municipio Residencia</TableCell>
                  <TableCell>Estado Residencia</TableCell>
                  <TableCell>Código Postal</TableCell>
                  <TableCell>Tiempo Residencia</TableCell>
                  <TableCell>Género</TableCell>
                  <TableCell>Escolaridad</TableCell>
                  <TableCell>Carrera</TableCell>
                  <TableCell>Lugar de Trabajo</TableCell>
                  <TableCell>Puesto</TableCell>
                  <TableCell>Fecha Ingreso</TableCell>
                  <TableCell>Fecha Terminación</TableCell>
                </>
              )}
              <TableCell>Teléfono</TableCell>
              <TableCell>Correo Electrónico</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {precandidatos.map((p, index) => {
              const precandidatoId = p.id || index
              const isExpanded = expandedPrecandidato === precandidatoId
              const merged = documentsMap.get(precandidatoId)
              const isLoadingDocs = loadingDocs.has(precandidatoId)

              return (
                <>
                  <TableRow key={precandidatoId} hover>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        disabled={!isDocsEnabled}
                        onClick={() => isDocsEnabled && handleTogglePrecandidato(precandidatoId)}
                      >
                        {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{formatFullName(p)}</TableCell>
                    <TableCell>{p.cargo}</TableCell>
                    <TableCell>{p.calidad}</TableCell>
                    <TableCell>{p.claveIfe}</TableCell>
                    {isDetailMode && <TableCell>{p.ocr}</TableCell>}
                    <TableCell>{p.curp}</TableCell>
                    <TableCell>{p.rfcHomoclave}</TableCell>
                    {isDetailMode && (
                      <>
                        <TableCell>{p.accionAfirmativa}</TableCell>
                        <TableCell>{p.internoExterno}</TableCell>
                        <TableCell>{p.municipioDondeNacio}</TableCell>
                        <TableCell>{p.estadoDondeNacio}</TableCell>
                        <TableCell>{p.ocupacion}</TableCell>
                        <TableCell>{p.calleDondeVive}</TableCell>
                        <TableCell>{p.numeroDondeVive}</TableCell>
                        <TableCell>{p.coloniaDondeVive}</TableCell>
                        <TableCell>{p.municipioDondeVive}</TableCell>
                        <TableCell>{p.estadoDondeVive}</TableCell>
                        <TableCell>{p.codigoPostal}</TableCell>
                        <TableCell>{p.tiempoDeResidenciaEnDomicilio}</TableCell>
                        <TableCell>{p.genero}</TableCell>
                        <TableCell>{p.escolaridad}</TableCell>
                        <TableCell>{p.carrera}</TableCell>
                        <TableCell>{p.lugarDondeTrabaja}</TableCell>
                        <TableCell>{p.puestoEnSuTrabajo}</TableCell>
                        <TableCell>{p.fechaIngresoTrabajo}</TableCell>
                        <TableCell>{p.fechaTerminacionTrabajo}</TableCell>
                      </>
                    )}
                    <TableCell>{p.telefono}</TableCell>
                    <TableCell>{p.correoElectronico}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${precandidatoId}-expanded`}>
                      <TableCell colSpan={totalColumns} sx={{ p: 0, backgroundColor: '#f5f5f5' }}>
                        <Box sx={{ py: 1, pl: 4, pr: 2 }}>
                          {isLoadingDocs ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                              <CircularProgress size={20} />
                            </Box>
                          ) : merged && merged.length > 0 ? (
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Tipo</TableCell>
                                  <TableCell>Nombre</TableCell>
                                  <TableCell align="center">Subir</TableCell>
                                  <TableCell align="center">Eliminar</TableCell>
                                  <TableCell align="center">Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {merged.map((row) => {
                                  const doc = row.document
                                  const status = doc?.status ?? null
                                  const uploadKey = `${precandidatoId}-${row.catalogType}`
                                  const isUploading = uploadingDocs.has(uploadKey)
                                  const hasFile = doc !== null

                                  return (
                                    <TableRow key={row.catalogType} hover>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                          {row.catalogType}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        {hasFile ? (
                                          <Button
                                            variant="text"
                                            size="small"
                                            onClick={() => doc && token && downloadDocumentFile(doc, token)}
                                            sx={{ textTransform: 'none', color: 'primary.main', justifyContent: 'flex-start' }}
                                          >
                                            {doc?.originalFilename || row.catalogType}
                                          </Button>
                                        ) : (
                                          <Typography variant="body2" color="text.secondary">
                                            -
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="center">
                                        <input
                                          type="file"
                                          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                          style={{ display: 'none' }}
                                          ref={(el) => {
                                            if (el) fileInputRefs.current.set(uploadKey, el)
                                          }}
                                          onChange={(e) => handleFileSelect(precandidatoId, row.catalogType, e.target.files?.[0] || null)}
                                        />
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          startIcon={isUploading ? <CircularProgress size={14} /> : <CloudUploadIcon />}
                                          onClick={() => fileInputRefs.current.get(uploadKey)?.click()}
                                          disabled={!isDocsEnabled || isUploading || hasFile}
                                          sx={{ textTransform: 'none' }}
                                        >
                                          Subir
                                        </Button>
                                      </TableCell>
                                      <TableCell align="center">
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          color="error"
                                          startIcon={<DeleteIcon />}
                                          disabled={!hasFile || !doc}
                                          onClick={() => doc && handleDeleteDoc(precandidatoId, doc.id)}
                                          sx={{ textTransform: 'none' }}
                                        >
                                          Eliminar
                                        </Button>
                                      </TableCell>
                                      <TableCell align="center">
                                        {hasFile ? (
                                          <Chip
                                            label={getStatusLabel(status)}
                                            size="small"
                                            sx={{
                                              backgroundColor: getStatusColor(status).bg,
                                              color: getStatusColor(status).color,
                                              fontWeight: 500,
                                              height: 20,
                                              fontSize: '0.7rem',
                                            }}
                                          />
                                        ) : (
                                          <Chip
                                            label="Sin Cargar"
                                            size="small"
                                            sx={{
                                              backgroundColor: '#E0E0E0',
                                              color: '#757575',
                                              fontWeight: 500,
                                              height: 20,
                                              fontSize: '0.7rem',
                                            }}
                                          />
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                              Cargando tipos de documento...
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
