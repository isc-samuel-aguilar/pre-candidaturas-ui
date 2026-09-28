import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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
  email: string
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
    email: '',
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
    email: folio.email,
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

  const isEditing = editingFolio !== null

  useEffect(() => {
    if (editingFolio) {
      setFolioData(mapFolioToFormData(editingFolio))
      setRepresentationsData(mapFolioToRepresentations(editingFolio, representations))
      const fullUsername = editingFolio.user?.username ?? ''
      const usuarioSuffix = fullUsername.replace(editingFolio.folio, '')
      setUserData({
        username: usuarioSuffix,
        password: '',
        name: '',
        lastName: '',
        motherLastName: '',
        email: '',
        phone: '',
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
        email: dummyDataToFill.email,
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
    if (!folioData.email.trim()) errors.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(folioData.email))
      errors.email = 'Correo electrónico inválido'
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
      if (!userData.email.trim()) errors.userEmail = 'El correo es requerido'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email))
        errors.userEmail = 'Correo electrónico inválido'
      if (!userData.phone.trim()) errors.phone = 'El teléfono es requerido'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [folioData, representationsData, userData, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    if (isEditing && editingFolio) {
      const updateData: UpdateFolioRequest = {
        folio: folioData.folio,
        email: folioData.email,
        calle: folioData.calle,
        numero: folioData.numero,
        colonia: folioData.colonia,
        municipio: folioData.municipio,
        estado: folioData.estado,
        codigoPostal: folioData.codigoPostal,
        representations: representationsData.map((rep) => ({
          representation: rep.representation,
          paternalLastName: rep.paternalLastName,
          maternalLastName: rep.maternalLastName,
          name: rep.name,
          voterKey: rep.voterKey,
          phone: rep.phone,
        })),
      }
      await onSubmit(updateData)
    } else {
      const createData: CreateFolioRequest = {
        folio: folioData.folio,
        email: folioData.email,
        calle: folioData.calle,
        numero: folioData.numero,
        colonia: folioData.colonia,
        municipio: folioData.municipio,
        estado: folioData.estado,
        codigoPostal: folioData.codigoPostal,
        user: {
          username: `${folioData.folio}${userData.username}`,
          password: userData.password,
          name: userData.name,
          lastName: userData.lastName,
          motherLastName: userData.motherLastName,
          email: userData.email,
          phone: userData.phone,
        },
        representations: representationsData.map((rep) => ({
          representation: rep.representation,
          paternalLastName: rep.paternalLastName,
          maternalLastName: rep.maternalLastName,
          name: rep.name,
          voterKey: rep.voterKey,
          phone: rep.phone,
        })),
      }
      await onSubmit(createData)
    }
  }

  const getFieldError = (field: string): string | undefined => {
    return validationErrors[field]
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">Datos del Folio</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ py: 1.5, px: 2 }}>
          <FolioInfoSection
            values={folioData}
            onChange={handleFolioChange}
            errors={{
              folio: getFieldError('folio'),
              email: getFieldError('email'),
              calle: getFieldError('calle'),
              numero: getFieldError('numero'),
              colonia: getFieldError('colonia'),
              municipio: getFieldError('municipio'),
              estado: getFieldError('estado'),
              codigoPostal: getFieldError('codigoPostal'),
            }}
            isEditing={isEditing}
          />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">Representaciones</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ py: 1.5, px: 2 }}>
          <RepresentationSection
            representations={representations}
            values={representationsData}
            onChange={handleRepresentationChange}
            errors={getRepresentationErrors()}
          />
        </AccordionDetails>
      </Accordion>

      {!isEditing && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">Datos del Usuario</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ py: 1.5, px: 2 }}>
            <UserInfoSection
              folio={folioData.folio}
              values={userData}
              onChange={handleUserChange}
              errors={{
                username: getFieldError('username'),
                password: getFieldError('password'),
                name: getFieldError('name'),
                lastName: getFieldError('lastName'),
                motherLastName: getFieldError('motherLastName'),
                email: getFieldError('userEmail'),
                phone: getFieldError('phone'),
              }}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {isEditing && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">Datos del Usuario (solo lectura)</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ py: 1.5, px: 2 }}>
            <UserInfoSection
              folio={folioData.folio}
              values={userData}
              onChange={handleUserChange}
              errors={{}}
              isEditing
            />
          </AccordionDetails>
        </Accordion>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {isEditing ? 'Actualizar' : 'Registrar'}
        </Button>
        {isEditing && (
          <Button variant="outlined" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
      </Box>
    </Box>
  )
}
