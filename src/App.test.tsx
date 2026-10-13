import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { conSesion, renderApp } from './test/utilidades.ts'

describe('App', () => {
  it('muestra el inicio de sesión del CRM a quien no ha entrado', () => {
    renderApp('/')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Agencia360 · CRM' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
  })

  it('redirige una ruta desconocida al inicio', () => {
    renderApp('/no-existe')

    expect(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
  })

  it('abre en la lista de prospectos', async () => {
    conSesion('VENTAS')
    renderApp('/')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Prospectos' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Prospectos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await screen.findByRole('list', { name: 'Prospectos' })
  })

  it('cambia al formulario de registro y de regreso a la lista', async () => {
    conSesion('VENTAS')
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByRole('list', { name: 'Prospectos' })

    await user.click(screen.getByRole('link', { name: 'Registrar' }))
    expect(
      screen.getByRole('heading', { level: 2, name: 'Registrar prospecto' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Prospectos' }))
    expect(
      await screen.findByRole('list', { name: 'Prospectos' }),
    ).toBeInTheDocument()
  })

  it('muestra en la lista al prospecto recién registrado', async () => {
    conSesion('VENTAS')
    const user = userEvent.setup()
    renderApp('/registrar')

    await user.type(screen.getByLabelText('Nombre'), 'Ana López')
    await user.type(screen.getByLabelText('Teléfono'), '4771234567')
    await user.click(
      screen.getByRole('button', { name: 'Registrar prospecto' }),
    )
    await screen.findByRole('status')

    await user.click(screen.getByRole('link', { name: 'Prospectos' }))
    const lista = await screen.findByRole('list', { name: 'Prospectos' })
    expect(lista).toHaveTextContent('Ana López')
  })
})
