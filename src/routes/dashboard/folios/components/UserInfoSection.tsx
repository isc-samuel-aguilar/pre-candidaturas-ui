import { Box, TextField } from '@mui/material'
import { folioFieldRowStyles, representationNameFieldWidth } from './folioFieldLayout'

interface UserInfoData {
  username: string
  password: string
  name: string
  lastName: string
  motherLastName: string
  email: string
  phone: string
}

interface UserInfoSectionProps {
  values: UserInfoData
  onChange: (field: keyof UserInfoData, value: string) => void
  errors: Partial<Record<keyof UserInfoData, string>>
  isEditing?: boolean
}

export function UserInfoSection({
  values,
  onChange,
  errors,
  isEditing = false,
}: UserInfoSectionProps) {
  return (
    <Box sx={folioFieldRowStyles}>
      <TextField
        label="Usuario"
        value={values.username}
        onChange={(e) => onChange('username', e.target.value)}
        required
        error={!!errors.username}
        helperText={errors.username}
        disabled={isEditing}
        size="small"
        sx={{ width: representationNameFieldWidth }}
      />
      {!isEditing && (
        <TextField
          label="Contraseña"
          type="password"
          value={values.password}
          onChange={(e) => onChange('password', e.target.value)}
          required
          error={!!errors.password}
          helperText={errors.password}
          size="small"
          sx={{ width: representationNameFieldWidth }}
        />
      )}
      <TextField
        label="Correo Electrónico"
        type="email"
        value={values.email}
        onChange={(e) => onChange('email', e.target.value)}
        required
        error={!!errors.email}
        helperText={errors.email}
        size="small"
        sx={{ width: representationNameFieldWidth * 2 }}
      />
      {!isEditing && (
        <>
          <TextField
            label="Apellido Paterno"
            value={values.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            required
            error={!!errors.lastName}
            helperText={errors.lastName}
            size="small"
            sx={{ width: representationNameFieldWidth }}
          />
          <TextField
            label="Apellido Materno"
            value={values.motherLastName}
            onChange={(e) => onChange('motherLastName', e.target.value)}
            error={!!errors.motherLastName}
            helperText={errors.motherLastName}
            size="small"
            sx={{ width: representationNameFieldWidth }}
          />
          <TextField
            label="Nombre(s)"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
            error={!!errors.name}
            helperText={errors.name}
            size="small"
            sx={{ width: representationNameFieldWidth }}
          />
        </>
      )}
      <TextField
        label="Teléfono"
        value={values.phone}
        onChange={(e) => onChange('phone', e.target.value)}
        required
        error={!!errors.phone}
        helperText={errors.phone}
        size="small"
        sx={{ width: representationNameFieldWidth }}
      />
    </Box>
  )
}
