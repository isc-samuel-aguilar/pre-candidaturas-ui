import { IconButton, InputAdornment, TextField } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useState } from 'react'

export interface PasswordFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label?: string
  margin?: 'none' | 'dense' | 'normal'
  required?: boolean
  autoComplete?: string
  fullWidth?: boolean
}

export default function PasswordField({
  value,
  onChange,
  disabled = false,
  label = 'Contraseña',
  margin,
  required,
  autoComplete = 'current-password',
  fullWidth,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <TextField
      fullWidth={fullWidth}
      label={label}
      type={showPassword ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      margin={margin}
      required={required}
      autoComplete={autoComplete}
      disabled={disabled}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((prev) => !prev)}
              edge="end"
              disabled={disabled}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}
