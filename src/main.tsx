import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './index.css'

export interface RouterAuth {
  isAuthenticated: boolean
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
    },
  },
})

function InnerApp() {
  const auth = useAuth()

  return (
    <RouterProvider
      router={router}
      context={{ auth } as RouterContext}
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
