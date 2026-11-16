import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { routeTree } from '../routeTree.gen'
import { NAV_ITEMS } from '../routes/dashboard'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'session-token' }) }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('uses the session token and reports unavailable services independently', async () => {
  const whenReady = vi.fn()
  const fetchVersion = vi.fn(async (url: string) => {
    if (url === `${import.meta.env.VITE_AUTH_URL.replace(/\/$/, '')}/version`) {
      return new Response(null, { status: 503 })
    }
    return new Response(JSON.stringify({ version: '2.0.1', buildTime: '2026-11-15 10-20' }))
  })
  vi.stubGlobal('fetch', fetchVersion)
  vi.stubGlobal('scrollTo', vi.fn())
  const history = createMemoryHistory({ initialEntries: ['/version'] })
  const router = createRouter({
    routeTree,
    history,
    context: { auth: { isAuthenticated: true, whenReady } },
  })

  await router.load()
  render(<RouterProvider router={router} />)

  expect(await screen.findByRole('columnheader', { name: 'Compilación (CST)' })).toBeInTheDocument()
  const auth = await screen.findByRole('row', { name: /Auth/ })
  const backend = screen.getByRole('row', { name: /Backend/ })
  const ui = screen.getByRole('row', { name: /^UI / })
  expect(await within(auth).findByText('No disponible')).toBeInTheDocument()
  expect(await within(backend).findByText('2.0.1')).toBeInTheDocument()
  expect(within(backend).getByText('2026-11-15 10-20')).toBeInTheDocument()
  expect(within(ui).getByText(__UI_BUILD_INFO__.version)).toBeInTheDocument()
  expect(within(ui).getByText(__UI_BUILD_INFO__.buildTime)).toBeInTheDocument()
  expect(fetchVersion).toHaveBeenCalledWith(
    `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/version`,
    expect.objectContaining({ cache: 'no-store', headers: { Authorization: 'Bearer session-token' } }),
  )
  expect(whenReady).toHaveBeenCalled()
  expect(history.location.pathname).toBe('/version')
}, 30_000)

it('redirects to login when a user opens /version without a session', async () => {
  const history = createMemoryHistory({ initialEntries: ['/version'] })
  const router = createRouter({
    routeTree,
    history,
    context: { auth: { isAuthenticated: false, whenReady: vi.fn() } },
  })

  await router.load()

  expect(history.location.pathname).toBe('/login')
  expect(history.location.search).toContain('redirect=%2Fversion')
}, 30_000)

it('adds the admin-only version link immediately after Configurar', () => {
  const config = NAV_ITEMS.findIndex(({ label }) => label === 'Configurar')
  expect(config).toBeGreaterThanOrEqual(0)
  expect(NAV_ITEMS[config + 1]).toEqual({
    label: 'Versión', to: '/dashboard/version', roles: ['ADMIN'],
  })
})
