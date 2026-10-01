const INTERNAL_PREFIX = '/'
const PROTOCOL_RELATIVE_PREFIX = '//'
const LOGIN_PATH = '/login'

export function resolvePostLoginRoute(redirect: string | undefined, role: string | undefined): string {
  const fallback = role === 'REGISTER' ? '/dashboard/excel' : '/dashboard/folios'

  if (!redirect || !redirect.startsWith(INTERNAL_PREFIX) || redirect.startsWith(PROTOCOL_RELATIVE_PREFIX)) {
    return fallback
  }

  const pathname = redirect.split(/[?#]/)[0] ?? ''
  if (pathname === LOGIN_PATH || pathname === '/') {
    return fallback
  }

  return redirect
}
