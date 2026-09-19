import { Box, TextField, Typography, Stack } from '@mui/material'
import type { Configuration } from '../../../../types/folio'

interface RepresentationData {
  representation: string
  paternalLastName: string
  maternalLastName: string
  name: string
  voterKey: string
  phone: string
}

interface RepresentationSectionProps {
  representations: Configuration[]
  values: RepresentationData[]
  onChange: (index: number, field: keyof RepresentationData, value: string) => void
  errors: string[]
}

export function RepresentationSection({
  representations,
  values,
  onChange,
  errors,
}: RepresentationSectionProps) {
  return (
    <Box>
      {representations.map((config, index) => {
        const data = values[index]
        if (!data) return null

        return (
          <Box key={config.id} sx={{ mb: index < representations.length - 1 ? 1.5 : 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                label="Representación"
                value={data.representation}
                size="small"
                sx={{ width: 160 }}
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                label="Apellido Paterno"
                value={data.paternalLastName}
                onChange={(e) => onChange(index, 'paternalLastName', e.target.value)}
                required
                size="small"
                sx={{ width: 180 }}
              />
              <TextField
                label="Apellido Materno"
                value={data.maternalLastName}
                onChange={(e) => onChange(index, 'maternalLastName', e.target.value)}
                size="small"
                sx={{ width: 180 }}
              />
              <TextField
                label="Nombre(s)"
                value={data.name}
                onChange={(e) => onChange(index, 'name', e.target.value)}
                required
                size="small"
                sx={{ width: 180 }}
              />
              <TextField
                label="Clave de Elector"
                value={data.voterKey}
                onChange={(e) => onChange(index, 'voterKey', e.target.value)}
                required
                size="small"
                sx={{ width: 200 }}
              />
              <TextField
                label="Teléfono"
                value={data.phone}
                onChange={(e) => onChange(index, 'phone', e.target.value)}
                required
                size="small"
                sx={{ width: 130 }}
              />
            </Stack>
            {errors[index] && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                {errors[index]}
              </Typography>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
