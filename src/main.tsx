import React, { useRef, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './index.css'

export interface RouterAuth {
  isAuthenticated: boolean
  user: { userId: number; username: string; role: string } | null
  whenReady: () => Promise<void>
}

export interface RouterContext {
  auth: RouterAuth
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const router = createRouter({
  routeTree,
  context: {
    auth: {
      isAuthenticated: false,
      whenReady: () => Promise.resolve(),
    },
  },
})

function InnerApp() {
  const auth = useAuth()
  const authRef = useRef(auth)
  authRef.current = auth

  const routerAuth = useMemo<RouterAuth>(
    () => ({
      get isAuthenticated() {
        return authRef.current.isAuthenticated
      },
      get user() {
        return authRef.current.user
      },
      whenReady: () => authRef.current.whenReady(),
    }),
    []
  )

  return (
    <RouterProvider
      router={router}
      context={{ auth: routerAuth } as RouterContext}
    />
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
