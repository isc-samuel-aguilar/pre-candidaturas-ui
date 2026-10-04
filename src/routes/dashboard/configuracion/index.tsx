import { createFileRoute, redirect } from '@tanstack/react-router'
import type { RouterContext } from '../../../main'
import ConfiguracionPage from './components/ConfiguracionPage'

export const Route = createFileRoute('/dashboard/configuracion/')({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    if (auth.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ConfiguracionPage,
})
