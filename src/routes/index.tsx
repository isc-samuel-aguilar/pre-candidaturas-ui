import { createFileRoute, redirect } from '@tanstack/react-router'
import { resolvePostLoginRoute } from '../utils/redirect'
import type { RouterContext } from '../main'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    const { auth } = context as RouterContext
    throw redirect({ href: resolvePostLoginRoute(undefined, auth.user?.role) })
  },
})
