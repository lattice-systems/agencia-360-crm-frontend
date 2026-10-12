import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('muestra el título principal', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Get started' }),
    ).toBeInTheDocument()
  })

  it('incrementa el contador al dar clic en el botón', async () => {
    const user = userEvent.setup()
    render(<App />)

    const boton = screen.getByRole('button', { name: 'Count is 0' })
    await user.click(boton)

    expect(boton).toHaveTextContent('Count is 1')
  })
})
