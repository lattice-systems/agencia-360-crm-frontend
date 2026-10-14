import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { URL_USUARIOS } from '../api/acceso.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'
import { URL_PROSPECTOS } from './api.ts'

// CRM-0.1: el gerente reasigna prospectos. Datos de ejemplo en src/mocks/:
// los prospectos son de Valeria Vendedora (vendedor1, id 1); Víctor Vendedor
// es vendedor2 (id 2).

async function abrirReasignar(nombre: string) {
  const usuarioEvento = userEvent.setup()
  await usuarioEvento.click(
    await screen.findByRole('button', { name: `Reasignar a ${nombre}` }),
  )
  const dialogo = await screen.findByRole('dialog', {
    name: 'Reasignar prospecto',
  })
  return { usuarioEvento, dialogo }
}

describe('Reasignación de prospectos', () => {
  it('el gerente ve a qué vendedor pertenece cada prospecto', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/prospectos')

    const lista = await screen.findByRole('list', { name: 'Prospectos' })
    const fila = within(lista).getByText('Rosa Díaz').closest('li')!
    expect(
      await within(fila).findByText('Valeria Vendedora'),
    ).toBeInTheDocument()
  })

  it('el gerente reasigna un prospecto a otro vendedor desde el diálogo', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    let cuerpoEnviado: unknown
    server.use(
      http.put(`${URL_PROSPECTOS}/:id/vendedor`, async ({ request }) => {
        cuerpoEnviado = await request.clone().json()
      }),
    )
    renderApp('/prospectos')
    const { usuarioEvento, dialogo } = await abrirReasignar('Rosa Díaz')

    expect(
      within(dialogo).getByText(/Asignado actualmente a Valeria Vendedora/),
    ).toBeInTheDocument()
    await usuarioEvento.click(
      within(dialogo).getByRole('combobox', { name: 'Nuevo vendedor' }),
    )
    // El vendedor actual no aparece como opción.
    expect(
      screen.queryByRole('option', { name: 'Valeria Vendedora' }),
    ).not.toBeInTheDocument()
    await usuarioEvento.click(
      await screen.findByRole('option', { name: 'Víctor Vendedor' }),
    )
    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Reasignar' }),
    )

    expect(
      await screen.findByText(
        'Rosa Díaz ahora lo atiende Víctor Vendedor.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(cuerpoEnviado).toEqual({ vendedorId: 2 })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    const fila = screen.getByText('Rosa Díaz').closest('li')!
    expect(within(fila).getByText('Víctor Vendedor')).toBeInTheDocument()
  })

  it('pide elegir un vendedor antes de reasignar', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/prospectos')
    const { usuarioEvento, dialogo } = await abrirReasignar('Rosa Díaz')

    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Reasignar' }),
    )

    expect(
      within(dialogo).getByText('Elige el nuevo vendedor.'),
    ).toBeInTheDocument()
  })

  it('muestra el error del backend y deja al vendedor anterior', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    server.use(
      http.put(`${URL_PROSPECTOS}/:id/vendedor`, () =>
        HttpResponse.json(
          {
            status: 400,
            error: 'Bad Request',
            message: 'El usuario 2 no es un vendedor activo',
          },
          { status: 400 },
        ),
      ),
    )
    renderApp('/prospectos')
    const { usuarioEvento, dialogo } = await abrirReasignar('Rosa Díaz')

    await usuarioEvento.click(
      within(dialogo).getByRole('combobox', { name: 'Nuevo vendedor' }),
    )
    await usuarioEvento.click(
      await screen.findByRole('option', { name: 'Víctor Vendedor' }),
    )
    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Reasignar' }),
    )

    expect(
      await within(dialogo).findByText('El usuario 2 no es un vendedor activo'),
    ).toBeInTheDocument()
    await usuarioEvento.click(
      within(dialogo).getByRole('button', { name: 'Cancelar' }),
    )
    const fila = screen.getByText('Rosa Díaz').closest('li')!
    expect(within(fila).getByText('Valeria Vendedora')).toBeInTheDocument()
  })

  it('el vendedor no ve la opción de reasignar', async () => {
    conSesion('VENTAS')
    renderApp('/prospectos')

    await screen.findByRole('list', { name: 'Prospectos' })
    expect(
      screen.queryByRole('button', { name: 'Reasignar a Rosa Díaz' }),
    ).not.toBeInTheDocument()
  })

  it('si no carga la lista de vendedores, muestra los prospectos sin reasignar', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    server.use(
      http.get(URL_USUARIOS, () =>
        HttpResponse.json({ status: 500, message: 'Error' }, { status: 500 }),
      ),
    )
    renderApp('/prospectos')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar la lista de vendedores',
    )
    await screen.findByRole('list', { name: 'Prospectos' })
    expect(
      screen.queryByRole('button', { name: 'Reasignar a Rosa Díaz' }),
    ).not.toBeInTheDocument()
  })
})
