import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material'
import { encryptCredential } from '../../../../services/credentialService'
import { RepresentationSection } from './RepresentationSection'
import { FolioInfoSection } from './FolioInfoSection'
import { UserInfoSection } from './UserInfoSection'
import type { Folio, CreateFolioRequest, UpdateFolioRequest } from '../../../../types/folio'
import type { KeyValueCatalog } from '../../../../types/demarcacion'
import type { DummyFolioData } from '../../../../utils/dummyData'

interface RepresentationData {
  representation: string
  paternalLastName: string
  maternalLastName: string
  name: string
  voterKey: string
  phone: string
}

interface FolioFormData {
  folio: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  estado: string
  codigoPostal: string
}

interface UserData {
  username: string
  password: string
  name: string
  lastName: string
  motherLastName: string
  email: string
  phone: string
}

interface FolioFormProps {
  representations: KeyValueCatalog[]
  editingFolio: Folio | null
  defaultFolio: string
  dummyDataToFill: DummyFolioData | null
  onSubmit: (data: CreateFolioRequest | UpdateFolioRequest) => Promise<void>
  onCancel: () => void
  onDummyDataConsumed: () => void
  loading: boolean
  error: string | null
}

function createEmptyRepresentations(configs: KeyValueCatalog[]): RepresentationData[] {
  return configs.map((config) => ({
    representation: config.value,
    paternalLastName: '',
    maternalLastName: '',
    name: '',
    voterKey: '',
    phone: '',
  }))
}

function createEmptyFormData(): FolioFormData {
  return {
    folio: '',
    calle: '',
    numero: '',
    colonia: '',
    municipio: '',
    estado: '',
    codigoPostal: '',
  }
}

function createEmptyUserData(): UserData {
  return {
    username: '',
    password: '',
    name: '',
    lastName: '',
    motherLastName: '',
    email: '',
    phone: '',
  }
}

function mapFolioToFormData(folio: Folio): FolioFormData {
  return {
    folio: folio.folio,
    calle: folio.calle,
    numero: folio.numero,
    colonia: folio.colonia,
    municipio: folio.municipio,
    estado: folio.estado,
    codigoPostal: folio.codigoPostal,
  }
}

function mapFolioToRepresentations(folio: Folio, configs: KeyValueCatalog[]): RepresentationData[] {
  return configs.map((config) => {
    const rep = folio.representations.find(
      (r) => r.representation === config.value
    )
    return {
      representation: config.value,
      paternalLastName: rep?.paternalLastName ?? '',
      maternalLastName: rep?.maternalLastName ?? '',
      name: rep?.name ?? '',
      voterKey: rep?.voterKey ?? '',
      phone: rep?.phone ?? '',
    }
  })
}

export function FolioForm({
  representations,
  editingFolio,
  defaultFolio,
  dummyDataToFill,
  onSubmit,
  onCancel,
  onDummyDataConsumed,
  loading,
  error,
}: FolioFormProps) {
  const [folioData, setFolioData] = useState<FolioFormData>(createEmptyFormData)
  const [representationsData, setRepresentationsData] = useState<RepresentationData[]>([])
  const [userData, setUserData] = useState<UserData>(createEmptyUserData)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isEditing = editingFolio !== null

  useEffect(() => {
    if (editingFolio) {
      setFolioData(mapFolioToFormData(editingFolio))
      setRepresentationsData(mapFolioToRepresentations(editingFolio, representations))
      setUserData({
        username: editingFolio.user?.username ?? '',
        password: '',
        name: '',
        lastName: '',
        motherLastName: '',
        email: editingFolio.user?.email ?? editingFolio.email,
        phone: editingFolio.user?.phone ?? editingFolio.telefono ?? '',
      })
    } else {
      setFolioData({ ...createEmptyFormData(), folio: defaultFolio })
      setRepresentationsData(createEmptyRepresentations(representations))
      setUserData(createEmptyUserData())
    }
    setValidationErrors({})
  }, [editingFolio, representations, defaultFolio])

  useEffect(() => {
    if (dummyDataToFill) {
      setFolioData({
        folio: dummyDataToFill.folio,
        calle: dummyDataToFill.calle,
        numero: dummyDataToFill.numero,
        colonia: dummyDataToFill.colonia,
        municipio: dummyDataToFill.municipio,
        estado: dummyDataToFill.estado,
        codigoPostal: dummyDataToFill.codigoPostal,
      })
      setRepresentationsData(
        dummyDataToFill.representations.map((rep) => ({ ...rep }))
      )
      setUserData({
        username: dummyDataToFill.user.username,
        password: dummyDataToFill.user.password,
        name: dummyDataToFill.user.name,
        lastName: dummyDataToFill.user.lastName,
        motherLastName: dummyDataToFill.user.motherLastName,
        email: dummyDataToFill.user.email,
        phone: dummyDataToFill.user.phone,
      })
      setValidationErrors({})
      onDummyDataConsumed()
    }
  }, [dummyDataToFill, onDummyDataConsumed])

  const handleFolioChange = useCallback(
    (field: keyof FolioFormData, value: string) => {
      setFolioData((prev) => ({ ...prev, [field]: value }))
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
    },
    [validationErrors]
  )

  const handleRepresentationChange = useCallback(
    (index: number, field: keyof RepresentationData, value: string) => {
      setRepresentationsData((prev) => {
        const next = [...prev]
        const current = next[index]
        if (current) {
          next[index] = { ...current, [field]: value }
        }
        return next
      })
    },
    []
  )

  const handleUserChange = useCallback(
    (field: keyof UserData, value: string) => {
      setUserData((prev) => ({ ...prev, [field]: value }))
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
    },
    [validationErrors]
  )

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    if (!folioData.folio.trim()) errors.folio = 'El folio es requerido'
    if (!userData.email.trim()) errors.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email))
      errors.email = 'Correo electrónico inválido'
    if (!userData.phone.trim()) errors.phone = 'El teléfono es requerido'
    if (!folioData.calle.trim()) errors.calle = 'La calle es requerida'
    if (!folioData.numero.trim()) errors.numero = 'El número es requerido'
    if (!folioData.colonia.trim()) errors.colonia = 'La colonia es requerida'
    if (!folioData.municipio.trim()) errors.municipio = 'El municipio es requerido'
    if (!folioData.estado.trim()) errors.estado = 'El estado es requerido'
    if (!folioData.codigoPostal.trim()) errors.codigoPostal = 'El código postal es requerido'
    else if (!/^\d{5}$/.test(folioData.codigoPostal))
      errors.codigoPostal = 'Código postal debe tener 5 dígitos'

    representationsData.forEach((rep, index) => {
      if (!rep.name.trim()) errors[`rep_${index}_name`] = 'Nombre requerido'
      if (!rep.paternalLastName.trim())
        errors[`rep_${index}_paternalLastName`] = 'Apellido paterno requerido'
      if (!rep.voterKey.trim())
        errors[`rep_${index}_voterKey`] = 'Clave de elector requerida'
      if (!rep.phone.trim()) errors[`rep_${index}_phone`] = 'Teléfono requerido'
    })

    if (!isEditing) {
      if (!userData.username.trim()) errors.username = 'El usuario es requerido'
      if (!userData.password.trim()) errors.password = 'La contraseña es requerida'
      else if (userData.password.length < 8)
        errors.password = 'La contraseña debe tener al menos 8 caracteres'
      if (!userData.name.trim()) errors.name = 'El nombre es requerido'
      if (!userData.lastName.trim()) errors.lastName = 'El apellido paterno es requerido'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [folioData, representationsData, userData, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !validate()) return
    setSubmissionError(null)
    setSubmitting(true)
    try {
      const data: UpdateFolioRequest = {
        ...folioData,
        email: userData.email,
        telefono: userData.phone,
        representations: representationsData,
      }
      if (isEditing) {
        await onSubmit(data)
      } else {
        const createData: CreateFolioRequest = {
          ...data,
          user: { ...userData, password: await encryptCredential(userData.password) },
        }
        await onSubmit(createData)
      }
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : 'No se pudo enviar el folio.')
    } finally {
      setSubmitting(false)
    }
  }

  const getRepresentationErrors = (): string[] => {
    return representationsData.map(
      (_, index) =>
        validationErrors[`rep_${index}_name`] ||
        validationErrors[`rep_${index}_paternalLastName`] ||
        validationErrors[`rep_${index}_voterKey`] ||
        validationErrors[`rep_${index}_phone`] ||
        ''
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" gutterBottom>
        {isEditing ? 'Editar Folio' : 'Captura de Folio'}
      </Typography>

      {(error || submissionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || submissionError}
        </Alert>
      )}

      <Box component="section" sx={{ mb: 3 }}>
        <Typography component="h2" variant="h6" gutterBottom>Datos del Usuario</Typography>
        <UserInfoSection
          values={userData}
          onChange={handleUserChange}
          errors={validationErrors}
          isEditing={isEditing}
        />
      </Box>

      <Box component="section" sx={{ mb: 3 }}>
        <Typography component="h2" variant="h6" gutterBottom>Datos del Folio</Typography>
        <FolioInfoSection
          values={folioData}
          onChange={handleFolioChange}
          errors={validationErrors}
          isEditing={isEditing}
        />
      </Box>

      <Box component="section" sx={{ mb: 3 }}>
        <Typography component="h2" variant="h6" gutterBottom>Representaciones</Typography>
        <RepresentationSection
          representations={representations}
          values={representationsData}
          onChange={handleRepresentationChange}
          errors={getRepresentationErrors()}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || submitting}
          startIcon={loading || submitting ? <CircularProgress size={20} /> : undefined}
        >
          {isEditing ? 'Actualizar' : 'Registrar'}
        </Button>
        {isEditing && (
          <Button variant="outlined" onClick={onCancel} disabled={loading || submitting}>
            Cancelar
          </Button>
        )}
      </Box>
    </Box>
  )
}
