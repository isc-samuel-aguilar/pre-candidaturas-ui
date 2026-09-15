import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import type { RouterContext } from '../main'

export const Route = createRootRoute({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    const isLoginPage = location.pathname === '/login'

    if (auth.isAuthenticated && isLoginPage) {
      throw redirect({ to: '/dashboard' })
    }

    if (!auth.isAuthenticated && !isLoginPage) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})