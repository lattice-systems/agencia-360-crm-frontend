import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { URL_USUARIOS } from '../api/acceso.ts'
import { CONTRASENA_MOCK } from '../mocks/acceso.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'

// Usuarios de ejemplo en src/mocks/acceso.ts: vendedor1 (Valeria), vendedor2,
// gerente, conta1 y caja1 (este último solo del ERP).

describe('Administración de usuarios del CRM', () => {
  beforeEach(() => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
  })

  it('lista solo a los usuarios del CRM', async () => {
    renderApp('/usuarios')

    const fila = (await screen.findByText('Valeria Vendedora')).closest('tr')!
    expect(within(fila).getByText('vendedor1')).toBeInTheDocument()
    expect(
      within(fila).getByRole('combobox', { name: 'Rol de vendedor1' }),
    ).toHaveValue('VENTAS')
    expect(screen.queryByText('Carla Cajera')).not.toBeInTheDocument()
  })

  it('crea un vendedor que después puede iniciar sesión', async () => {
    renderApp('/usuarios')
    await screen.findByText('Valeria Vendedora')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Usuario'), 'vendedor3')
    await user.type(screen.getByLabelText('Nombre'), 'Vanessa Vendedora')
    await user.type(screen.getByLabelText('Contraseña'), CONTRASENA_MOCK)
    await user.selectOptions(screen.getByLabelText('Rol'), 'VENTAS')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Usuario vendedor3 creado.',
    )
    expect(screen.getByText('Vanessa Vendedora')).toBeInTheDocument()
  })

  it('solo ofrece roles con acceso al CRM', async () => {
    renderApp('/usuarios')
    await screen.findByText('Valeria Vendedora')

    const opciones = within(screen.getByLabelText('Rol')).getAllByRole('option')
    expect(opciones.map((o) => o.textContent)).toEqual([
      'Selecciona un rol',
      'Contabilidad',
      'Gerente de marketing',
      'Ventas',
    ])
  })

  it('muestra el error del backend si el usuario ya existe', async () => {
    renderApp('/usuarios')
    await screen.findByText('Valeria Vendedora')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Usuario'), 'vendedor1')
    await user.type(screen.getByLabelText('Nombre'), 'Otra persona')
    await user.type(screen.getByLabelText('Contraseña'), CONTRASENA_MOCK)
    await user.selectOptions(screen.getByLabelText('Rol'), 'VENTAS')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un usuario con el nombre de usuario vendedor1',
    )
  })

  it('pide todos los campos antes de crear', async () => {
    renderApp('/usuarios')
    await screen.findByText('Valeria Vendedora')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Completa usuario, nombre, contraseña y rol.',
    )
  })

  it('cambia el rol de un usuario', async () => {
    renderApp('/usuarios')
    const selector = await screen.findByRole('combobox', {
      name: 'Rol de conta1',
    })

    await userEvent.setup().selectOptions(selector, 'VENTAS')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'El rol de conta1 ahora es Ventas.',
    )
    expect(selector).toHaveValue('VENTAS')
  })

  it('no permite que el gerente cambie su propio rol', async () => {
    server.use(
      http.get(URL_USUARIOS, () =>
        HttpResponse.json([
          {
            id: 10,
            usuario: 'usuario.prueba',
            nombre: 'Persona de Prueba',
            rol: 'GERENTE_MARKETING',
            activo: true,
          },
          {
            id: 1,
            usuario: 'vendedor1',
            nombre: 'Valeria Vendedora',
            rol: 'VENTAS',
            activo: true,
          },
        ]),
      ),
    )
    renderApp('/usuarios')

    expect(
      await screen.findByRole('combobox', { name: 'Rol de usuario.prueba' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('combobox', { name: 'Rol de vendedor1' }),
    ).toBeEnabled()
  })

  it('cierra la sesión si el backend responde que el token ya no es válido', async () => {
    server.use(
      http.get(URL_USUARIOS, () => new HttpResponse(null, { status: 401 })),
    )
    renderApp('/usuarios')

    expect(
      await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.'),
    ).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})
