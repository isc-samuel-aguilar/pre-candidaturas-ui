import { TextField, Stack } from '@mui/material'

interface FolioInfoData {
  folio: string
  email: string
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
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
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
          label="Correo Electrónico"
          type="email"
          value={values.email}
          onChange={(e) => onChange('email', e.target.value)}
          required
          error={!!errors.email}
          helperText={errors.email}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField
          label="Calle"
          value={values.calle}
          onChange={(e) => onChange('calle', e.target.value)}
          required
          error={!!errors.calle}
          helperText={errors.calle}
          size="small"
          sx={{ width: 300 }}
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
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField
          label="Colonia"
          value={values.colonia}
          onChange={(e) => onChange('colonia', e.target.value)}
          required
          error={!!errors.colonia}
          helperText={errors.colonia}
          size="small"
          sx={{ width: 200 }}
        />
        <TextField
          label="Municipio"
          value={values.municipio}
          onChange={(e) => onChange('municipio', e.target.value)}
          required
          error={!!errors.municipio}
          helperText={errors.municipio}
          size="small"
          sx={{ width: 200 }}
        />
      </Stack>
      <Stack direction="row" spacing={1.5}>
        <TextField
          label="Estado"
          value={values.estado}
          onChange={(e) => onChange('estado', e.target.value)}
          required
          error={!!errors.estado}
          helperText={errors.estado}
          size="small"
          sx={{ width: 180 }}
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
      </Stack>
    </>
  )
}
