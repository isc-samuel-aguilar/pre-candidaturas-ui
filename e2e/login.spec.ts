import { test, expect } from '@playwright/test'

test.describe('Login (P11)', () => {
  test('shows the login form', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Precandidaturas' })).toBeVisible()
    await expect(page.getByLabel('Usuario')).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible()
  })

  test('valid credentials redirect to the dashboard', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login/)
    await page.getByLabel('Usuario').fill('admin')
    await page.getByLabel('Contraseña').fill('adminPassword')
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()

    await expect(page).toHaveURL(/\/dashboard\/folios/)
    await expect(page.getByRole('heading', { name: 'Captura de Folio', level: 5 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cerrar Sesión' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Consultar' })).toBeVisible()
    await expect(page.getByRole('banner').getByText('admin', { exact: true })).toBeVisible()
  })

  test('invalid credentials show an error message', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Usuario').fill('admin')
    await page.getByLabel('Contraseña').fill('wrong-password')
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()

    await expect(page.getByRole('alert')).toContainText('Credenciales incorrectas')
    await expect(page).toHaveURL(/\/login/)
  })
})
