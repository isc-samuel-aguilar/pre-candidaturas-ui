import { useCallback, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Link,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useAuth } from '../../../../contexts/AuthContext'
import {
  DEMO_FILES_CATALOG,
  type DemoFileType,
} from '../../../../services/demoFilesCatalog'
import {
  DEMO_FILE_ERROR_MESSAGES,
  downloadDemoFile,
  isDemoFileError,
} from '../../../../services/demoFilesService'

export function ExamplesSection() {
  const { token } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDownload = useCallback(
    async (id: string, type: DemoFileType) => {
      try {
        await downloadDemoFile(token, id, type)
      } catch (error) {
        setErrorMessage(
          isDemoFileError(error) ? error.message : DEMO_FILE_ERROR_MESSAGES.service
        )
      }
    },
    [token]
  )

  const handleCloseError = useCallback(() => setErrorMessage(null), [])

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
        <TableContainer>
          <Table size="small" aria-label="Ejemplos de archivos">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Archivos de ejemplo
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Archivos Limpios
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DEMO_FILES_CATALOG.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Box
                      component={Link}
                      onClick={() => handleDownload(entry.id, 'example')}
                      sx={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{ '&:hover': { textDecoration: 'underline' } }}
                      >
                        {entry.exampleFilename}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      component={Link}
                      onClick={() => handleDownload(entry.id, 'clean')}
                      sx={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{ '&:hover': { textDecoration: 'underline' } }}
                      >
                        {entry.cleanFilename}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
      <Snackbar
        open={errorMessage !== null}
        autoHideDuration={4000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" variant="filled">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Accordion>
  )
}
