import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { URL_LOGIN } from '../api/acceso.ts'
import { CONTRASENA_MOCK } from '../mocks/acceso.ts'
import { server } from '../mocks/server.ts'
import { renderApp } from '../test/utilidades.ts'

// Las cuentas de ejemplo están en src/mocks/acceso.ts.

async function llenarYEnviar(usuario: string, contrasena: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Usuario'), usuario)
  await user.type(screen.getByLabelText('Contraseña'), contrasena)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('Inicio de sesión', () => {
  it('entra al CRM con credenciales correctas, pide aplicación CRM y guarda la sesión', async () => {
    let cuerpoEnviado: unknown
    // Sin respuesta, MSW pasa la petición al handler de src/mocks/acceso.ts.
    server.use(
      http.post(URL_LOGIN, async ({ request }) => {
        cuerpoEnviado = await request.clone().json()
      }),
    )
    renderApp('/login')

    await llenarYEnviar('vendedor1', CONTRASENA_MOCK)

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Prospectos' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Valeria Vendedora · Ventas')).toBeInTheDocument()
    expect(cuerpoEnviado).toEqual({
      usuario: 'vendedor1',
      contrasena: CONTRASENA_MOCK,
      aplicacion: 'CRM',
    })
    expect(sessionStorage.length).toBe(1)
  })

  it('muestra el mensaje del backend si las credenciales son incorrectas', async () => {
    renderApp('/login')

    await llenarYEnviar('vendedor1', 'otra')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuario o contraseña incorrectos',
    )
    expect(sessionStorage.length).toBe(0)
  })

  it('avisa cuando el rol no tiene acceso al CRM', async () => {
    renderApp('/login')

    await llenarYEnviar('caja1', CONTRASENA_MOCK)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu rol no tiene acceso al CRM',
    )
    expect(sessionStorage.length).toBe(0)
  })

  it('avisa cuando no hay conexión con el servidor', async () => {
    server.use(http.post(URL_LOGIN, () => HttpResponse.error()))
    renderApp('/login')

    await llenarYEnviar('vendedor1', CONTRASENA_MOCK)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    )
  })

  it('pide usuario y contraseña antes de llamar al backend', async () => {
    renderApp('/login')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Escribe tu usuario y tu contraseña.',
    )
  })
})
