import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { URL_CLIENTES } from '../clientes/api.ts'
import { reiniciarClientes } from '../mocks/clientes.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'

// Clientes de ejemplo en src/mocks/clientes.ts: Ana López (2 vehículos y
// cuenta de la app activa) y Bruno Díaz (1 vehículo, sin correo).

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

    const dialogo = await screen.findByRole('dialog', { name: 'Ana López' })
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

  it('agrega un cliente a mano y abre su detalle', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()
    await screen.findByText('Ana López')

    await usuarioEvento.click(screen.getByRole('button', { name: 'Agregar cliente' }))
    const formulario = await screen.findByRole('dialog', { name: 'Agregar cliente' })
    await usuarioEvento.type(within(formulario).getByLabelText('Nombre completo'), 'Carla Ruiz')
    await usuarioEvento.type(within(formulario).getByLabelText('Correo (opcional)'), 'carla@ejemplo.com')
    await usuarioEvento.click(within(formulario).getByRole('button', { name: 'Agregar cliente' }))

    expect(await screen.findByText('Cliente Carla Ruiz agregado.')).toBeInTheDocument()
    const detalle = await screen.findByRole('dialog', { name: 'Carla Ruiz' })
    expect(await within(detalle).findByText('Sin cuenta')).toBeInTheDocument()
    expect(within(detalle).getByText('Este cliente todavía no tiene vehículos.')).toBeInTheDocument()
  })

  it('marca el correo repetido con el mensaje del backend', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()
    await screen.findByText('Ana López')

    await usuarioEvento.click(screen.getByRole('button', { name: 'Agregar cliente' }))
    const formulario = await screen.findByRole('dialog', { name: 'Agregar cliente' })
    await usuarioEvento.type(within(formulario).getByLabelText('Nombre completo'), 'Otra Ana')
    await usuarioEvento.type(within(formulario).getByLabelText('Correo (opcional)'), 'ana.lopez@ejemplo.com')
    await usuarioEvento.click(within(formulario).getByRole('button', { name: 'Agregar cliente' }))

    expect(
      await within(formulario).findByText('Ya existe un cliente con el correo ana.lopez@ejemplo.com'),
    ).toBeInTheDocument()
  })

  it('asigna un vehículo y actualiza la lista', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(
      await screen.findByRole('button', { name: 'Ver vehículos de Bruno Díaz' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Bruno Díaz' })
    await within(dialogo).findByText('Taos 2026')
    await usuarioEvento.type(within(dialogo).getByLabelText('VIN'), '3vwfe21c04m000009')
    await usuarioEvento.type(within(dialogo).getByLabelText('Modelo'), 'Virtus')
    await usuarioEvento.type(within(dialogo).getByLabelText('Año'), '2026')
    await usuarioEvento.click(within(dialogo).getByRole('button', { name: 'Asignar vehículo' }))

    expect(await within(dialogo).findByText('Virtus 2026')).toBeInTheDocument()
    expect(within(dialogo).getByText('VIN 3VWFE21C04M000009')).toBeInTheDocument()

    await usuarioEvento.keyboard('{Escape}')
    expect(
      await screen.findByRole('button', { name: 'Ver vehículos de Bruno Díaz' }),
    ).toHaveTextContent('2 vehículos')
  })

  it('no deja asignar un VIN de otro cliente', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(
      await screen.findByRole('button', { name: 'Ver vehículos de Bruno Díaz' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Bruno Díaz' })
    await within(dialogo).findByText('Taos 2026')
    await usuarioEvento.type(within(dialogo).getByLabelText('VIN'), '3VWFE21C04M000001')
    await usuarioEvento.type(within(dialogo).getByLabelText('Modelo'), 'Jetta')
    await usuarioEvento.type(within(dialogo).getByLabelText('Año'), '2026')
    await usuarioEvento.click(within(dialogo).getByRole('button', { name: 'Asignar vehículo' }))

    expect(
      await within(dialogo).findByText('El vehículo con VIN 3VWFE21C04M000001 ya es de otro cliente'),
    ).toBeInTheDocument()
  })

  it('crea la cuenta de la app de un cliente con correo', async () => {
    reiniciarClientes(undefined, [])
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(
      await screen.findByRole('button', { name: 'Ver vehículos de Ana López' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Ana López' })
    await usuarioEvento.click(
      await within(dialogo).findByRole('button', { name: 'Crear cuenta de la app' }),
    )

    expect(
      await screen.findByText('Cuenta creada. Se envió la contraseña temporal a ana.lopez@ejemplo.com.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByText('Activa')).toBeInTheDocument()
    expect(within(dialogo).getByText('El cliente aún no entra por primera vez.')).toBeInTheDocument()
  })

  it('un cliente sin correo no puede tener cuenta de la app', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(
      await screen.findByRole('button', { name: 'Ver vehículos de Bruno Díaz' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Bruno Díaz' })

    expect(await within(dialogo).findByText('Sin correo no puede usar la app.')).toBeInTheDocument()
    expect(
      within(dialogo).queryByRole('button', { name: 'Crear cuenta de la app' }),
    ).not.toBeInTheDocument()
  })

  it('desactiva y reactiva la cuenta de la app', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(
      await screen.findByRole('button', { name: 'Ver vehículos de Ana López' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Ana López' })
    await usuarioEvento.click(
      await within(dialogo).findByRole('button', { name: 'Desactivar cuenta' }),
    )
    expect(await within(dialogo).findByText('Desactivada')).toBeInTheDocument()

    await usuarioEvento.click(within(dialogo).getByRole('button', { name: 'Reactivar cuenta' }))
    expect(await within(dialogo).findByText('Activa')).toBeInTheDocument()
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
