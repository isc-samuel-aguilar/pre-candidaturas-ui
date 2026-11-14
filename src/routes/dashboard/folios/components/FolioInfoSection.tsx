import { Box, TextField } from '@mui/material'
import { folioFieldRowStyles, representationNameFieldWidth } from './folioFieldLayout'

interface FolioInfoData {
  folio: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  estado: string
  codigoPostal: string
}

interface FolioInfoSectionProps {
  values: FolioInfoData
  onChange: (field: keyof FolioInfoData, value: string) => void
  errors: Partial<Record<keyof FolioInfoData, string>>
  isEditing?: boolean
}

export function FolioInfoSection({
  values,
  onChange,
  errors,
  isEditing = false,
}: FolioInfoSectionProps) {
  return (
    <Box sx={folioFieldRowStyles}>
      <TextField
        label="Folio"
        value={values.folio}
        onChange={(e) => onChange('folio', e.target.value)}
        required
        error={!!errors.folio}
        helperText={errors.folio}
        disabled={isEditing}
        size="small"
        sx={{ width: 150 }}
      />
      <TextField
        label="Calle"
        value={values.calle}
        onChange={(e) => onChange('calle', e.target.value)}
        required
        error={!!errors.calle}
        helperText={errors.calle}
        size="small"
        sx={{ width: representationNameFieldWidth }}
      />
      <TextField
        label="Número"
        value={values.numero}
        onChange={(e) => onChange('numero', e.target.value)}
        required
        error={!!errors.numero}
        helperText={errors.numero}
        size="small"
        sx={{ width: 80 }}
        inputProps={{ maxLength: 5 }}
      />
      <TextField
        label="Colonia"
        value={values.colonia}
        onChange={(e) => onChange('colonia', e.target.value)}
        required
        error={!!errors.colonia}
        helperText={errors.colonia}
        size="small"
        sx={{ width: representationNameFieldWidth }}
      />
      <TextField
        label="Municipio"
        value={values.municipio}
        onChange={(e) => onChange('municipio', e.target.value)}
        required
        error={!!errors.municipio}
        helperText={errors.municipio}
        size="small"
        sx={{ width: representationNameFieldWidth }}
      />
      <TextField
        label="Estado"
        value={values.estado}
        onChange={(e) => onChange('estado', e.target.value)}
        required
        error={!!errors.estado}
        helperText={errors.estado}
        size="small"
        sx={{ width: representationNameFieldWidth }}
      />
      <TextField
        label="Código Postal"
        value={values.codigoPostal}
        onChange={(e) => onChange('codigoPostal', e.target.value)}
        required
        error={!!errors.codigoPostal}
        helperText={errors.codigoPostal}
        size="small"
        sx={{ width: 90 }}
        inputProps={{ maxLength: 5 }}
      />
    </Box>
  )
}
