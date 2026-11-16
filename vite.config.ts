import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'path'
import { demoFilesPlugin } from './server/demoFilesPlugin'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const { year, month, day, hour, minute } = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value]),
  )

  return {
  define: {
    __UI_BUILD_INFO__: JSON.stringify({
      version,
      buildTime: `${year}-${month}-${day} ${hour}-${minute}`,
    }),
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePattern: 'components',
    }),
    react(),
    demoFilesPlugin({ demoFilesDir: env.DEMO_FILES_DIR }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 9000,
    strictPort: true,
    proxy: {
      '/api/v1/auth/': 'http://localhost:9001',
      '/api/v1/': 'http://localhost:9002',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [...configDefaults.exclude, '**/e2e/**'],
  },
  optimizeDeps: {
    cache: command === 'serve' ? false : true,
  },
  }
})
