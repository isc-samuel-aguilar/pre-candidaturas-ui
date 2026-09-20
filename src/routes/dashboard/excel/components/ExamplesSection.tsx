import { useState } from 'react'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Link,
  Box,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

const EXAMPLE_LINKS = [
  { label: 'DESCARGAR EJEMPLO LLENADO GUBERNATURA', url: 'https://www.calendarlabs.com/templates/2026/2026-excel-monthly-calendar-with-notes-01.xlsx' },
  { label: 'DESCARGAR EJEMPLO LLENADO AYTO', url: 'https://www.calendarlabs.com/templates/2026/2026-excel-monthly-calendar-with-notes-01.xlsx' },
  { label: 'DESCARGAR EJEMPLO LLENADO DTTO MR', url: 'https://www.calendarlabs.com/templates/2026/2026-excel-monthly-calendar-with-notes-01.xlsx' },
  { label: 'DESCARGAR EJEMPLO LLENADO DIP RP', url: 'https://www.calendarlabs.com/templates/2026/2026-excel-monthly-calendar-with-notes-01.xlsx' },
]

export function ExamplesSection() {
  const [expanded, setExpanded] = useState(false)

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight="bold">
          Ejemplos de archivos
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {EXAMPLE_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              sx={{ textDecoration: 'none' }}
            >
              <Typography
                variant="body2"
                color="primary"
                sx={{
                  '&:hover': { textDecoration: 'underline' },
                  cursor: 'pointer',
                }}
              >
                {link.label}
              </Typography>
            </Link>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
