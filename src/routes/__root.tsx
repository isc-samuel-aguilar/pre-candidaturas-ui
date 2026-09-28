import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import type { RouterContext } from '../main'
import { resolvePostLoginRoute } from '../utils/redirect'

export const Route = createRootRoute({
  beforeLoad: async ({ context, location }) => {
    const { auth } = context as RouterContext
    await auth.whenReady()

    const isLoginPage = location.pathname === '/login'

    if (auth.isAuthenticated && isLoginPage) {
      const redirectTarget = (location.search as { redirect?: string }).redirect
      throw redirect({ href: resolvePostLoginRoute(redirectTarget, auth.user?.role) })
    }

    if (!auth.isAuthenticated && !isLoginPage) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: () => <Outlet />,
})
