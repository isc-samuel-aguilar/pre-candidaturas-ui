import { createFileRoute } from '@tanstack/react-router'
import { VersionPage } from '../components/VersionPage'

export const Route = createFileRoute('/version')({
  component: VersionPage,
})
