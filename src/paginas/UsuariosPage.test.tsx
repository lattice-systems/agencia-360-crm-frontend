import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { URL_USUARIOS } from '../api/acceso.ts'
import { CONTRASENA_MOCK } from '../mocks/acceso.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'

// Usuarios de ejemplo en src/mocks/acceso.ts: vendedor1 (Valeria), vendedor2,
// gerente, conta1 y caja1 (estos dos últimos solo del ERP).

type Usuario = ReturnType<typeof userEvent.setup>

async function elegir(
  usuarioEvento: Usuario,
  combo: HTMLElement,
  opcion: string,
) {
  await usuarioEvento.click(combo)
  await usuarioEvento.click(await screen.findByRole('option', { name: opcion }))
}

async function abrirCrearUsuario() {
  const usuarioEvento = userEvent.setup()
  await screen.findByText('Valeria Vendedora')
  await usuarioEvento.click(
    screen.getByRole('button', { name: 'Crear usuario' }),
  )
  const dialogo = await screen.findByRole('dialog', { name: 'Crear usuario' })
  return { usuarioEvento, dialogo }
}

describe('Administración de usuarios del CRM', () => {
  beforeEach(() => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
  })

  it('lista solo a los usuarios del CRM', async () => {
    renderApp('/usuarios')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Usuarios y roles',
      }),
    ).toBeInTheDocument()
    const fila = (await screen.findByText('Valeria Vendedora')).closest('tr')!
    expect(within(fila).getByText('vendedor1')).toBeInTheDocument()
    expect(within(fila).getByText('Ventas')).toBeInTheDocument()
    expect(screen.queryByText('Carla Cajera')).not.toBeInTheDocument()
  })

  it('crea un vendedor desde el diálogo y lo agrega a la lista', async () => {
    renderApp('/usuarios')
    const { usuarioEvento, dialogo } = await abrirCrearUsuario()

    await usuarioEvento.type(
      within(dialogo).getByLabelText('Nombre completo'),
      'Vanessa Vendedora',
    )
    await usuarioEvento.type(
      within(dialogo).getByLabelText('Usuario'),
      'vendedor3',
    )
    await elegir(
      usuarioEvento,
      within(dialogo).getByRole('combobox', { name: 'Rol' }),
      'Ventas',
    )
    await usuarioEvento.type(
      within(dialogo).getByLabelText('Contraseña inicial'),
      CONTRASENA_MOCK,
    )
    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Crear usuario' }),
    )

    expect(
      await screen.findByText(
        'Usuario vendedor3 creado.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Vanessa Vendedora')).toBeInTheDocument()
  })

  it('solo ofrece roles con acceso al CRM', async () => {
    renderApp('/usuarios')
    const { usuarioEvento, dialogo } = await abrirCrearUsuario()

    await usuarioEvento.click(
      within(dialogo).getByRole('combobox', { name: 'Rol' }),
    )

    const opciones = await screen.findAllByRole('option')
    expect(opciones.map((o) => o.textContent)).toEqual([
      'Gerente de marketing',
      'Ventas',
    ])
  })

  it('marca el usuario repetido con el mensaje del backend', async () => {
    renderApp('/usuarios')
    const { usuarioEvento, dialogo } = await abrirCrearUsuario()

    await usuarioEvento.type(
      within(dialogo).getByLabelText('Nombre completo'),
      'Otra persona',
    )
    await usuarioEvento.type(
      within(dialogo).getByLabelText('Usuario'),
      'vendedor1',
    )
    await elegir(
      usuarioEvento,
      within(dialogo).getByRole('combobox', { name: 'Rol' }),
      'Ventas',
    )
    await usuarioEvento.type(
      within(dialogo).getByLabelText('Contraseña inicial'),
      CONTRASENA_MOCK,
    )
    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Crear usuario' }),
    )

    expect(
      await within(dialogo).findByText(
        'Ya existe un usuario con el nombre de usuario vendedor1',
      ),
    ).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Usuario')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('pide todos los campos antes de crear', async () => {
    renderApp('/usuarios')
    const { usuarioEvento, dialogo } = await abrirCrearUsuario()

    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Crear usuario' }),
    )

    expect(
      await within(dialogo).findByText('Escribe el nombre completo.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByText('Elige un rol.')).toBeInTheDocument()
  })

  it('cambia el rol desde el menú de la fila', async () => {
    renderApp('/usuarios')
    await screen.findByText('Víctor Vendedor')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(
      screen.getByRole('button', { name: 'Acciones de vendedor2' }),
    )
    await usuarioEvento.click(
      await screen.findByRole('menuitem', { name: 'Cambiar rol' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar rol' })
    await elegir(
      usuarioEvento,
      within(dialogo).getByRole('combobox', { name: 'Nuevo rol' }),
      'Gerente de marketing',
    )
    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Guardar rol' }),
    )

    expect(
      await screen.findByText(
        'El rol de vendedor2 ahora es Gerente de marketing.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    const fila = screen.getByText('Víctor Vendedor').closest('tr')!
    expect(within(fila).getByText('Gerente de marketing')).toBeInTheDocument()
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
    await screen.findByText('usuario.prueba')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Acciones de usuario.prueba' }))

    expect(
      await screen.findByRole('menuitem', {
        name: 'No puedes cambiar tu propio rol',
      }),
    ).toHaveAttribute('aria-disabled', 'true')
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
