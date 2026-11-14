import { createFileRoute, redirect } from '@tanstack/react-router'
import type { RouterContext } from '../../../main'
import UsersPage from './-UsersPage'

export const Route = createFileRoute('/dashboard/usuarios/')({
  beforeLoad: ({ context }) => {
    if ((context as RouterContext).auth.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: UsersPage,
})
