import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { conSesion, renderApp } from '../test/utilidades.ts'

function menu() {
  return screen.getByRole('navigation', { name: 'Principal' })
}

describe('Rutas protegidas y menú por rol', () => {
  it('manda al login a quien no ha iniciado sesión', () => {
    renderApp('/prospectos')

    expect(
      screen.getByRole('button', { name: 'Entrar al CRM' }),
    ).toBeInTheDocument()
  })

  it('al vendedor le muestra Prospectos y Registrar, pero no Usuarios', () => {
    conSesion('VENTAS')
    renderApp('/')

    expect(menu()).toHaveTextContent('Prospectos')
    expect(menu()).toHaveTextContent('Registrar')
    expect(menu()).not.toHaveTextContent('Usuarios')
  })

  it('al gerente de marketing le muestra Prospectos y Usuarios, pero no Registrar', () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/')

    expect(menu()).toHaveTextContent('Prospectos')
    expect(menu()).toHaveTextContent('Usuarios')
    expect(menu()).not.toHaveTextContent('Registrar')
  })

  it('avisa a un rol del CRM que todavía no tiene secciones', () => {
    conSesion('CONTABILIDAD', { uid: 20 })
    renderApp('/')

    expect(
      screen.getByText(
        'Todavía no hay secciones del CRM disponibles para tu rol.',
      ),
    ).toBeInTheDocument()
  })

  it('bloquea Usuarios al vendedor', () => {
    conSesion('VENTAS')
    renderApp('/usuarios')

    expect(
      screen.getByRole('heading', { name: 'Sin permiso' }),
    ).toBeInTheDocument()
  })

  it('bloquea Registrar al gerente de marketing', () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/registrar')

    expect(
      screen.getByRole('heading', { name: 'Sin permiso' }),
    ).toBeInTheDocument()
  })

  it('cierra la sesión y regresa al login', async () => {
    conSesion('CONTABILIDAD', { uid: 20 })
    renderApp('/')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(
      screen.getByRole('button', { name: 'Entrar al CRM' }),
    ).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })

  it('cierra la sesión cuando vence el token', async () => {
    conSesion('CONTABILIDAD', { segundosParaVencer: 1, uid: 20 })
    renderApp('/')

    expect(
      await screen.findByText(
        'Tu sesión expiró. Inicia sesión de nuevo.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})
