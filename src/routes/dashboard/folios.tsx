import { createFileRoute, redirect } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import type { RouterContext } from '../../main'

export const Route = createFileRoute('/dashboard/folios')({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    if (auth.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => <Outlet />,
})
