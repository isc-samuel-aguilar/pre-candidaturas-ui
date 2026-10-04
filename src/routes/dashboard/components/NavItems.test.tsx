import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from '../../dashboard'

describe('NAV_ITEMS', () => {
  it('incluye el ítem Configurar sólo para el rol ADMIN', () => {
    const item = NAV_ITEMS.find((navItem) => navItem.label === 'Configurar')

    expect(item).toBeDefined()
    expect(item).toEqual({
      label: 'Configurar',
      to: '/dashboard/configuracion',
      roles: ['ADMIN'],
    })
  })

  it('ningún otro ítem navega a /dashboard/configuracion', () => {
    const targets = NAV_ITEMS.filter((navItem) => navItem.to === '/dashboard/configuracion')

    expect(targets).toHaveLength(1)
    expect(targets[0]).toEqual(
      expect.objectContaining({ label: 'Configurar', roles: ['ADMIN'] })
    )
  })
})
