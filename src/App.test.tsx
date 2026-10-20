import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { conSesion, renderApp } from './test/utilidades.ts'

describe('App', () => {
  it('muestra el inicio de sesión del CRM a quien no ha entrado', () => {
    renderApp('/')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Entrar al CRM' }),
    ).toBeInTheDocument()
  })

  it('redirige una ruta desconocida al inicio', () => {
    renderApp('/no-existe')

    expect(
      screen.getByRole('button', { name: 'Entrar al CRM' }),
    ).toBeInTheDocument()
  })

  it('abre en la lista de prospectos', async () => {
    conSesion('VENTAS')
    renderApp('/')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Mis prospectos' }),
    ).toBeInTheDocument()
    expect(menuPrincipal().getByRole('link', { name: 'Prospectos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await screen.findByRole('table', { name: 'Prospectos' })
  })

  it('cambia al formulario de registro y de regreso a la lista', async () => {
    conSesion('VENTAS')
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByRole('table', { name: 'Prospectos' })

    // Registrar no está en el menú: se entra con el botón de la lista.
    expect(menuPrincipal().queryByRole('link', { name: 'Registrar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Registrar prospecto' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Registrar prospecto' }),
    ).toBeInTheDocument()

    await user.click(menuPrincipal().getByRole('link', { name: 'Prospectos' }))
    expect(
      await screen.findByRole('table', { name: 'Prospectos' }),
    ).toBeInTheDocument()
  })

  it('muestra en la lista al prospecto recién registrado', async () => {
    conSesion('VENTAS')
    const user = userEvent.setup()
    renderApp('/prospectos/registrar')

    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana López')
    await user.type(screen.getByLabelText('Teléfono'), '4771234567')
    await user.click(
      screen.getByRole('button', { name: 'Registrar prospecto' }),
    )

    // Al registrar, el CRM regresa a la lista.
    const tabla = await screen.findByRole('table', { name: 'Prospectos' })
    expect(tabla).toHaveTextContent('Ana López')
  })
})

function menuPrincipal() {
  return within(screen.getByRole('navigation', { name: 'Principal' }))
}
