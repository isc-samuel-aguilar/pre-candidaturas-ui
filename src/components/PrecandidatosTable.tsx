import { useState, useEffect } from 'react'
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
  Collapse,
  IconButton,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import DescriptionIcon from '@mui/icons-material/Description'
import { getPrecandidatos } from '../services/demarcacionService'
import type { Precandidato, DemarcacionStatus } from '../types/demarcacion'

interface PrecandidatosTableProps {
  folioId: number
  demarcacionName: string
  mode?: 'excel' | 'detail'
  demarcacionStatus?: DemarcacionStatus
  onCountChange?: (count: number) => void
}

function getStatusLabel(status?: string | null) {
  switch (status) {
    case 'POR_VALIDAR':
      return 'Por Validar'
    case 'VALIDO':
      return 'Válido'
    case 'ERROR':
      return 'Error'
    default:
      return 'Por Validar'
  }
}

function getStatusColor(status?: string | null) {
  switch (status) {
    case 'POR_VALIDAR':
      return { bg: '#FFD100', color: '#000000' }
    case 'VALIDO':
      return { bg: '#4CAF50', color: '#FFFFFF' }
    case 'ERROR':
      return { bg: '#F44336', color: '#FFFFFF' }
    default:
      return { bg: '#FFD100', color: '#000000' }
  }
}

export function PrecandidatosTable({
  folioId,
  demarcacionName,
  mode = 'excel',
  demarcacionStatus,
  onCountChange,
}: PrecandidatosTableProps) {
  const [precandidatos, setPrecandidatos] = useState<Precandidato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchPrecandidatos = async () => {
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
    }

    fetchPrecandidatos()
  }, [folioId, demarcacionName])

  const formatFullName = (p: Precandidato) =>
    `${p.apellidoPaterno} ${p.apellidoMaterno} ${p.nombre}`.trim()

  const handleToggleDocs = (precandidatoId: number) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(precandidatoId)) {
        next.delete(precandidatoId)
      } else {
        next.add(precandidatoId)
      }
      return next
    })
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
  const docsEnabled = demarcacionStatus === 'VALIDO'

  return (
    <Box sx={{ p: 2 }}>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {isDetailMode && <TableCell padding="checkbox" />}
              {isDetailMode && <TableCell>Documentos</TableCell>}
              <TableCell align="center">Status</TableCell>
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
              const isDocsExpanded = expandedDocs.has(precandidatoId)
              const statusColors = getStatusColor(p.status)

              return (
                <TableRow key={precandidatoId} hover>
                  {isDetailMode && (
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={() => handleToggleDocs(precandidatoId)}
                      >
                        {isDocsExpanded ? (
                          <KeyboardArrowDownIcon />
                        ) : (
                          <KeyboardArrowRightIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  )}
                  {isDetailMode && (
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<DescriptionIcon />}
                        disabled={!docsEnabled}
                        sx={{ textTransform: 'none' }}
                      >
                        Documentos
                      </Button>
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <Chip
                      label={getStatusLabel(p.status)}
                      size="small"
                      sx={{
                        backgroundColor: statusColors.bg,
                        color: statusColors.color,
                        fontWeight: 500,
                      }}
                    />
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
                  {isDetailMode && <TableCell>{p.ocr}</TableCell>}
                  <TableCell>{p.telefono}</TableCell>
                  <TableCell>{p.correoElectronico}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {isDetailMode && precandidatos.map((p, index) => {
        const precandidatoId = p.id || index
        const isDocsExpanded = expandedDocs.has(precandidatoId)

        return (
          <Collapse key={`docs-${precandidatoId}`} in={isDocsExpanded}>
            <Box sx={{ py: 1, pl: 4, backgroundColor: '#f5f5f5', borderRadius: 1, mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Documentos - Próximamente
              </Typography>
            </Box>
          </Collapse>
        )
      })}
    </Box>
  )
}
