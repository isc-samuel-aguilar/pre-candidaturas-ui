import { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import {
  DEMO_FILE_ERROR_MESSAGES,
  downloadDemoFileByName,
  isDemoFileAvailable,
  isDemoFileError,
} from '../../../../services/demoFilesService'

interface DemarcacionDownloadButtonProps {
  filename?: string
  downloadFilename?: string
  label: string
  token: string | null
  onError: (message: string) => void
}

export default function DemarcacionDownloadButton({
  filename,
  downloadFilename,
  label,
  token,
  onError,
}: DemarcacionDownloadButtonProps) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!filename) {
      setAvailable(false)
      return
    }
    const controller = new AbortController()
    setAvailable(null)

    const updateAvailability = (exists: boolean) => {
      if (!controller.signal.aborted) setAvailable(exists)
    }

    void isDemoFileAvailable(filename, controller.signal).then(
      updateAvailability,
      () => updateAvailability(false)
    )

    return () => controller.abort()
  }, [filename])

  const handleDownload = async () => {
    if (!filename) return
    setDownloading(true)
    try {
      await downloadDemoFileByName(token, filename, downloadFilename)
    } catch (error) {
      if (isDemoFileError(error)) {
        if (error.type === 'missing') setAvailable(false)
        onError(error.message)
      } else {
        onError(DEMO_FILE_ERROR_MESSAGES.service)
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button
      variant="outlined"
      size="small"
      disabled={available !== true || downloading}
      onClick={handleDownload}
    >
      {available === false ? 'No disponible' : label}
    </Button>
  )
}
