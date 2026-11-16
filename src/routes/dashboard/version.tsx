import { createFileRoute, redirect } from '@tanstack/react-router'
import { VersionPage } from '../../components/VersionPage'
import type { RouterContext } from '../../main'

export const Route = createFileRoute('/dashboard/version')({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    if (auth.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: VersionPage,
})
