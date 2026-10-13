import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { reiniciarDatos } from '../mocks/datos.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'
import { URL_PROSPECTOS } from './api.ts'
import ListaProspectos from './ListaProspectos.tsx'

// Prospectos de ejemplo (src/mocks/datos.ts):
// Rosa Díaz en Primer contacto, Jorge Ramírez en Visita y Marta Hernández en
// Cotización.

function renderizar() {
  const user = userEvent.setup()
  render(<ListaProspectos />)
  return { user }
}

async function filas() {
  const lista = await screen.findByRole('list', { name: 'Prospectos' })
  return within(lista).getAllByRole('listitem')
}

describe('ListaProspectos', () => {
  it('muestra todos los prospectos visibles al cargar', async () => {
    renderizar()

    expect(screen.getByText('Cargando prospectos…')).toBeVisible()
    const items = await filas()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Rosa Díaz')
    expect(items[1]).toHaveTextContent('Jorge Ramírez')
    expect(items[2]).toHaveTextContent('Marta Hernández')
  })

  it('muestra el teléfono o el correo de cada prospecto', async () => {
    renderizar()

    const items = await filas()
    expect(items[1]).toHaveTextContent('4779876543')
    expect(items[2]).toHaveTextContent('marta@ejemplo.com')
  })

  it('filtra por etapa pidiéndolo al servidor', async () => {
    let etapaPedida: string | null = 'sin pedir'
    server.use(
      http.get(URL_PROSPECTOS, ({ request }) => {
        etapaPedida = new URL(request.url).searchParams.get('etapa')
        return HttpResponse.json([
          {
            id: 2,
            nombre: 'Jorge Ramírez',
            telefono: '4779876543',
            correo: null,
            etapa: 'VISITA',
            vendedorId: 1,
            creadoEn: '2026-10-11T17:00:00Z',
          },
        ])
      }),
    )
    const { user } = renderizar()
    await filas()

    await user.selectOptions(
      screen.getByLabelText('Filtrar por etapa'),
      'Visita',
    )

    expect(etapaPedida).toBe('VISITA')
    const items = await filas()
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Jorge Ramírez')
  })

  it('vuelve a mostrar todos al elegir "Todas las etapas"', async () => {
    const { user } = renderizar()
    const filtro = screen.getByLabelText('Filtrar por etapa')
    await filas()

    await user.selectOptions(filtro, 'Visita')
    expect(await filas()).toHaveLength(1)

    await user.selectOptions(filtro, 'Todas las etapas')
    expect(await filas()).toHaveLength(3)
  })

  it('avisa cuando no hay prospectos en la etapa elegida', async () => {
    const { user } = renderizar()
    await filas()

    await user.selectOptions(screen.getByLabelText('Filtrar por etapa'), 'Pago')

    expect(
      await screen.findByText('No hay prospectos en esta etapa.'),
    ).toBeVisible()
  })

  it('avisa cuando todavía no hay prospectos', async () => {
    reiniciarDatos([])
    renderizar()

    expect(
      await screen.findByText('Todavía no tienes prospectos registrados.'),
    ).toBeVisible()
  })

  it('muestra un error si no se pudo cargar la lista', async () => {
    server.use(
      http.get(URL_PROSPECTOS, () => new HttpResponse(null, { status: 500 })),
    )
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar los prospectos.',
    )
  })

  it('reintenta la carga desde el mensaje de error', async () => {
    server.use(
      http.get(
        URL_PROSPECTOS,
        () => new HttpResponse(null, { status: 500 }),
        { once: true },
      ),
    )
    const { user } = renderizar()

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await filas()).toHaveLength(3)
  })

  it('cambia la etapa de un prospecto desde la lista', async () => {
    const { user } = renderizar()
    const [rosa] = await filas()

    await user.selectOptions(
      within(rosa).getByLabelText('Etapa de Rosa Díaz'),
      'Visita',
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rosa Díaz pasó a la etapa Visita.',
    )
    expect(within(rosa).getByLabelText('Etapa de Rosa Díaz')).toHaveValue(
      'VISITA',
    )
  })

  it('manda la etapa nueva al servidor', async () => {
    let recibido: unknown
    let ruta = ''
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        ruta = new URL(request.url).pathname
        recibido = await request.json()
        return HttpResponse.json({
          id: 3,
          nombre: 'Marta Hernández',
          telefono: null,
          correo: 'marta@ejemplo.com',
          etapa: 'PAGO',
          vendedorId: 1,
          creadoEn: '2026-10-12T15:45:00Z',
        })
      }),
    )
    const { user } = renderizar()
    const items = await filas()

    await user.selectOptions(
      within(items[2]).getByLabelText('Etapa de Marta Hernández'),
      'Pago',
    )

    await screen.findByRole('status')
    expect(ruta).toBe(`${URL_PROSPECTOS}/3/etapa`)
    expect(recibido).toEqual({ etapa: 'PAGO' })
  })

  it('quita de la lista filtrada al prospecto que cambia a otra etapa', async () => {
    const { user } = renderizar()
    await filas()
    await user.selectOptions(screen.getByLabelText('Filtrar por etapa'), 'Visita')
    const [jorge] = await filas()

    await user.selectOptions(
      within(jorge).getByLabelText('Etapa de Jorge Ramírez'),
      'Cotización',
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Jorge Ramírez pasó a la etapa Cotización.',
    )
    expect(
      await screen.findByText('No hay prospectos en esta etapa.'),
    ).toBeVisible()
  })

  it('regresa la etapa anterior y avisa si el cambio falla', async () => {
    server.use(
      http.patch(
        `${URL_PROSPECTOS}/:id/etapa`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const { user } = renderizar()
    const [rosa] = await filas()
    const selector = within(rosa).getByLabelText('Etapa de Rosa Díaz')

    await user.selectOptions(selector, 'Visita')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cambiar la etapa de Rosa Díaz. Intenta de nuevo.',
    )
    expect(selector).toHaveValue('PRIMER_CONTACTO')
  })

  it('desactiva el selector del prospecto mientras guarda el cambio', async () => {
    let soltar = () => {}
    const pausa = new Promise<void>((resolver) => {
      soltar = resolver
    })
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async () => {
        await pausa
        return HttpResponse.json({
          id: 1,
          nombre: 'Rosa Díaz',
          telefono: '5500000000',
          correo: 'repetido@ejemplo.com',
          etapa: 'VISITA',
          vendedorId: 1,
          creadoEn: '2026-10-10T16:30:00Z',
        })
      }),
    )
    const { user } = renderizar()
    const [rosa] = await filas()
    const selector = within(rosa).getByLabelText('Etapa de Rosa Díaz')

    await user.selectOptions(selector, 'Visita')

    expect(selector).toBeDisabled()
    soltar()
    await screen.findByRole('status')
    expect(selector).toBeEnabled()
  })

  // Decisión del PO: cerrar un prospecto exige motivo.
  describe('cierre con motivo', () => {
    async function elegirCerradoPara(nombre: string) {
      const { user } = renderizar()
      const items = await filas()
      const fila = items.find((item) => item.textContent?.includes(nombre))!
      await user.selectOptions(
        within(fila).getByLabelText(`Etapa de ${nombre}`),
        'Cerrado',
      )
      return { user, fila }
    }

    it('pide el motivo antes de cerrar y todavía no guarda nada', async () => {
      let peticiones = 0
      server.use(
        http.patch(`${URL_PROSPECTOS}/:id/etapa`, () => {
          peticiones++
        }),
      )
      const { fila } = await elegirCerradoPara('Rosa Díaz')

      expect(
        within(fila).getByLabelText('Motivo de cierre de Rosa Díaz'),
      ).toBeVisible()
      expect(within(fila).getByLabelText('Etapa de Rosa Díaz')).toHaveValue(
        'PRIMER_CONTACTO',
      )
      expect(peticiones).toBe(0)
    })

    it('no deja cerrar sin escribir el motivo', async () => {
      const { user, fila } = await elegirCerradoPara('Rosa Díaz')

      await user.click(
        within(fila).getByRole('button', { name: 'Cerrar prospecto' }),
      )

      expect(
        within(fila).getByText('Escribe el motivo de cierre.'),
      ).toBeVisible()
      expect(
        within(fila).getByLabelText('Motivo de cierre de Rosa Díaz'),
      ).toHaveAttribute('aria-invalid', 'true')
    })

    it('cierra el prospecto mandando el motivo', async () => {
      let recibido: unknown
      server.use(
        http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
          recibido = await request.clone().json()
        }),
      )
      const { user, fila } = await elegirCerradoPara('Rosa Díaz')

      await user.type(
        within(fila).getByLabelText('Motivo de cierre de Rosa Díaz'),
        'Compró en otra agencia',
      )
      await user.click(
        within(fila).getByRole('button', { name: 'Cerrar prospecto' }),
      )

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Rosa Díaz pasó a la etapa Cerrado.',
      )
      expect(recibido).toEqual({
        etapa: 'CERRADO',
        motivoCierre: 'Compró en otra agencia',
      })
      expect(fila).toHaveTextContent('Motivo de cierre: Compró en otra agencia')
    })

    it('cancelar deja el prospecto como estaba', async () => {
      const { user, fila } = await elegirCerradoPara('Rosa Díaz')

      await user.click(within(fila).getByRole('button', { name: 'Cancelar' }))

      expect(
        within(fila).queryByLabelText('Motivo de cierre de Rosa Díaz'),
      ).not.toBeInTheDocument()
      expect(within(fila).getByLabelText('Etapa de Rosa Díaz')).toHaveValue(
        'PRIMER_CONTACTO',
      )
      expect(within(fila).getByLabelText('Etapa de Rosa Díaz')).toBeEnabled()
    })
  })

  // Decisión del PO: el Gerente de marketing ve las etapas pero no las cambia.
  describe('Gerente de marketing', () => {
    it('ve la etapa de cada prospecto sin poder cambiarla', async () => {
      conSesion('GERENTE_MARKETING', { uid: 10 })
      renderApp('/prospectos')

      const items = await filas()
      const rosa = items.find((item) => item.textContent?.includes('Rosa Díaz'))!
      expect(rosa).toHaveTextContent('Etapa Primer contacto')
      expect(
        within(rosa).queryByLabelText('Etapa de Rosa Díaz'),
      ).not.toBeInTheDocument()
    })

    it('el vendedor sí puede cambiar la etapa', async () => {
      conSesion('VENTAS')
      renderApp('/prospectos')

      const [primera] = await filas()
      expect(within(primera).getByRole('combobox', { name: /^Etapa de/ })).toBeEnabled()
    })
  })
})
