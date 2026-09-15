import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import type { RouterContext } from '../main'

export const Route = createRootRoute({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    if (!auth.isAuthenticated && location.pathname !== '/login') {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})
