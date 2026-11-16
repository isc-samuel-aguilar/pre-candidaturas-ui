import { useEffect, useState } from 'react'
import { Box, Container, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

type BuildInfo = { version: string; buildTime: string }
type Service = 'Auth' | 'Backend'

const services: { name: Service; baseUrl: string }[] = [
  { name: 'Auth', baseUrl: import.meta.env.VITE_AUTH_URL },
  { name: 'Backend', baseUrl: import.meta.env.VITE_API_URL },
]

async function loadBuildInfo(baseUrl: string, token: string, signal: AbortSignal): Promise<BuildInfo> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/version`, {
    signal,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Version endpoint unavailable')

  const data = await response.json()
  if (typeof data?.version !== 'string' || typeof data?.buildTime !== 'string') {
    throw new Error('Invalid build metadata')
  }
  return { version: data.version, buildTime: data.buildTime }
}

export function VersionPage() {
  const { token } = useAuth()
  const [builds, setBuilds] = useState<Partial<Record<Service, BuildInfo | null>>>({})

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    for (const { name, baseUrl } of services) {
      void loadBuildInfo(baseUrl, token, controller.signal)
        .catch(() => null)
        .then((info) => {
          if (!controller.signal.aborted) {
            setBuilds((previous) => ({ ...previous, [name]: info }))
          }
        })
    }
    return () => controller.abort()
  }, [token])

  const rows = [
    { name: 'UI', info: __UI_BUILD_INFO__ },
    ...services.map(({ name }) => ({ name, info: builds[name] })),
  ]

  return (
    <Container maxWidth="sm">
      <Box component="main" sx={{ py: 6 }}>
        <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
          Versiones en ejecución
        </Typography>
        <Paper variant="outlined">
          <Table aria-label="Versiones en ejecución" size="small">
            <TableHead>
              <TableRow>
                <TableCell>Proyecto</TableCell>
                <TableCell>Versión</TableCell>
                <TableCell>Compilación (CST)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody aria-live="polite">
              {rows.map(({ name, info }) => (
                <TableRow key={name}>
                  <TableCell component="th" scope="row">{name}</TableCell>
                  {info ? (
                    <>
                      <TableCell>{info.version}</TableCell>
                      <TableCell>{info.buildTime}</TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={2}>
                      {info === null ? 'No disponible' : 'Consultando…'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Container>
  )
}
