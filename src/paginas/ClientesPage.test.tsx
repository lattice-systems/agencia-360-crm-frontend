import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { URL_CLIENTES } from '../clientes/api.ts'
import { reiniciarClientes } from '../mocks/clientes.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'

// Clientes de ejemplo en src/mocks/clientes.ts: Ana López (2 vehículos) y
// Bruno Díaz (1 vehículo, sin correo).

describe('Clientes (CRM-1.5)', () => {
  it('el gerente de marketing ve los clientes con su correo y sus vehículos', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')

    expect(
      await screen.findByRole('heading', { name: 'Clientes' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('ana.lopez@ejemplo.com')).toBeInTheDocument()
    expect(screen.getByText('477 555 0101')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ver vehículos de Ana López' }),
    ).toHaveTextContent('2 vehículos')
    expect(screen.getByText('Sin correo (no usa la app)')).toBeInTheDocument()
  })

  it('busca por nombre o correo', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()
    await screen.findByText('Ana López')

    await usuarioEvento.type(screen.getByLabelText('Buscar cliente'), 'bruno')

    expect(screen.getByText('Bruno Díaz')).toBeInTheDocument()
    expect(screen.queryByText('Ana López')).not.toBeInTheDocument()

    await usuarioEvento.clear(screen.getByLabelText('Buscar cliente'))
    await usuarioEvento.type(screen.getByLabelText('Buscar cliente'), 'nadie')

    expect(screen.getByText('Ningún cliente coincide')).toBeInTheDocument()
  })

  it('muestra los vehículos de un cliente', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(
      await screen.findByRole('button', { name: 'Ver vehículos de Ana López' }),
    )

    const dialogo = await screen.findByRole('dialog', {
      name: 'Vehículos de Ana López',
    })
    expect(await within(dialogo).findByText('Jetta 2026')).toBeInTheDocument()
    expect(within(dialogo).getByText('VIN 3VWFE21C04M000001')).toBeInTheDocument()
    expect(within(dialogo).getByText('Tiguan 2025')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('Placas GTO-123-A · 15,200 km'),
    ).toBeInTheDocument()
  })

  it('avisa cuando todavía no hay clientes', async () => {
    reiniciarClientes([])
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')

    expect(await screen.findByText('Aún no hay clientes')).toBeInTheDocument()
  })

  it('muestra el error del backend y permite reintentar', async () => {
    server.use(
      http.get(URL_CLIENTES, () =>
        HttpResponse.json(
          {
            timestamp: new Date().toISOString(),
            status: 500,
            error: 'Internal Server Error',
            message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
            path: URL_CLIENTES,
          },
          { status: 500 },
        ),
      ),
    )
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')

    expect(
      await screen.findByText('No se pudieron cargar los clientes'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('el vendedor no ve Clientes en el menú ni puede entrar', () => {
    conSesion('VENTAS')
    renderApp('/clientes')

    expect(
      screen.getByRole('heading', { name: 'Sin permiso' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Clientes/ }),
    ).not.toBeInTheDocument()
  })
})
