import { useLayoutEffect, useState, type ReactElement, type RefObject } from 'react'
import { Box } from '@mui/material'

const FIELD_WIDTH = 136
const FIELD_GAP = 8
const FORM_PADDING = 16

interface EditField {
  id: string
  input: ReactElement
  columns: number
}

interface PrecandidatoEditRowsProps {
  viewportRef: RefObject<HTMLDivElement>
  fields: EditField[]
}

export default function PrecandidatoEditRows({ viewportRef, fields }: PrecandidatoEditRowsProps) {
  const [viewportWidth, setViewportWidth] = useState(0)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const measure = () => setViewportWidth(viewport.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [viewportRef])

  return (
    <Box
      role="group"
      aria-label="Campos del precandidato"
      sx={{
        position: 'sticky',
        left: 0,
        width: viewportWidth || '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: `${FIELD_GAP}px`,
        p: `${FORM_PADDING}px`,
      }}
    >
      {fields.map(({ id, input, columns }) => (
        <Box
          key={id}
          sx={{
            flex: `0 1 ${FIELD_WIDTH * columns + FIELD_GAP * (columns - 1)}px`,
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          {input}
        </Box>
      ))}
    </Box>
  )
}
