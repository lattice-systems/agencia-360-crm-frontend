import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { URL_USUARIOS } from '../api/acceso.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'
import { URL_PROSPECTOS } from './api.ts'

// CRM-0.1: el gerente reasigna prospectos. Datos de ejemplo en src/mocks/:
// los 3 prospectos son de Valeria Vendedora (vendedor1, id 1); Víctor
// Vendedor es vendedor2 (id 2).

async function selectorDe(nombre: string) {
  return screen.findByRole('combobox', { name: `Vendedor de ${nombre}` })
}

describe('Reasignación de prospectos', () => {
  it('el gerente ve a qué vendedor pertenece cada prospecto', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/prospectos')

    const selector = await selectorDe('Rosa Díaz')
    expect(selector).toHaveValue('1')
    expect(
      within(selector)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Valeria Vendedora', 'Víctor Vendedor'])
  })

  it('el gerente reasigna un prospecto a otro vendedor', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    let cuerpoEnviado: unknown
    server.use(
      http.put(`${URL_PROSPECTOS}/:id/vendedor`, async ({ request }) => {
        cuerpoEnviado = await request.clone().json()
      }),
    )
    renderApp('/prospectos')

    await userEvent.setup().selectOptions(await selectorDe('Rosa Díaz'), '2')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rosa Díaz ahora lo atiende Víctor Vendedor.',
    )
    expect(cuerpoEnviado).toEqual({ vendedorId: 2 })
    expect(await selectorDe('Rosa Díaz')).toHaveValue('2')
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

    await userEvent.setup().selectOptions(await selectorDe('Rosa Díaz'), '2')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo reasignar a Rosa Díaz. El usuario 2 no es un vendedor activo',
    )
    expect(await selectorDe('Rosa Díaz')).toHaveValue('1')
  })

  it('el vendedor no ve el selector de vendedor', async () => {
    conSesion('VENTAS')
    renderApp('/prospectos')

    await screen.findByRole('list', { name: 'Prospectos' })
    expect(
      screen.queryByRole('combobox', { name: 'Vendedor de Rosa Díaz' }),
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
      screen.queryByRole('combobox', { name: 'Vendedor de Rosa Díaz' }),
    ).not.toBeInTheDocument()
  })
})
