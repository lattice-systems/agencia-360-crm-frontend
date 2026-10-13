import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('muestra el nombre del CRM', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Agencia360 · CRM' }),
    ).toBeInTheDocument()
  })

  it('abre en la lista de prospectos', async () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Prospectos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Prospectos' }),
    ).toHaveAttribute('aria-current', 'page')
    await screen.findByRole('list', { name: 'Prospectos' })
  })

  it('cambia al formulario de registro y de regreso a la lista', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('list', { name: 'Prospectos' })

    await user.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(
      screen.getByRole('heading', { level: 2, name: 'Registrar prospecto' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Prospectos' }))
    expect(
      await screen.findByRole('list', { name: 'Prospectos' }),
    ).toBeInTheDocument()
  })

  it('muestra en la lista al prospecto recién registrado', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Registrar' }))
    await user.type(screen.getByLabelText('Nombre'), 'Ana López')
    await user.type(screen.getByLabelText('Teléfono'), '4771234567')
    await user.click(screen.getByRole('button', { name: 'Registrar prospecto' }))
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'Prospectos' }))
    const lista = await screen.findByRole('list', { name: 'Prospectos' })
    expect(lista).toHaveTextContent('Ana López')
  })
})
