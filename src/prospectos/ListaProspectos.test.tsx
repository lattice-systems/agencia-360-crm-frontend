import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { reiniciarDatos } from '../mocks/datos.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'
import { URL_PROSPECTOS } from './api.ts'

// Prospectos de ejemplo (src/mocks/datos.ts) de Valeria Vendedora (uid 1):
// Rosa Díaz (Primer contacto), Jorge Ramírez (Visita), Marta Hernández
// (Cotización), Luis Herrera (Pago) y Valeria Díaz (Entrega). Carlos Núñez
// (Facturación, con cierre solicitado) es de Víctor Vendedor (uid 2).

async function tabla() {
  return screen.findByRole('table', { name: 'Prospectos' })
}

async function filaDe(nombre: string) {
  return within(await tabla()).getByText(nombre).closest('tr') as HTMLElement
}

function abrirVendedor() {
  conSesion('VENTAS')
  renderApp('/prospectos')
  return userEvent.setup()
}

async function abrirMenu(usuario: ReturnType<typeof userEvent.setup>, nombre: string) {
  await usuario.click(await screen.findByRole('button', { name: `Acciones de ${nombre}` }))
  return screen.findByRole('menu')
}

async function elegirEnSelect(
  usuario: ReturnType<typeof userEvent.setup>,
  combo: HTMLElement,
  opcion: string,
) {
  await usuario.click(combo)
  await usuario.click(await screen.findByRole('option', { name: opcion }))
}

describe('Lista de prospectos del vendedor', () => {
  it('muestra sus prospectos con teléfono, etapa y último cambio', async () => {
    abrirVendedor()

    expect(screen.getByRole('heading', { level: 1, name: 'Mis prospectos' })).toBeInTheDocument()
    const rosa = await filaDe('Rosa Díaz')
    expect(rosa).toHaveTextContent('550 000 0000')
    expect(rosa).toHaveTextContent('repetido@ejemplo.com')
    expect(rosa).toHaveTextContent('Primer contacto')
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(6)
    expect(screen.getByText('5 prospectos asignados a ti')).toBeInTheDocument()
    expect(within(await tabla()).queryByText('Carlos Núñez')).not.toBeInTheDocument()
  })

  it('ofrece registrar un prospecto', async () => {
    abrirVendedor()

    expect(await screen.findByRole('link', { name: 'Registrar prospecto' })).toHaveAttribute(
      'href',
      '/registrar',
    )
  })

  it('busca por nombre o por teléfono escrito con espacios', async () => {
    const usuario = abrirVendedor()
    const buscar = await screen.findByLabelText('Buscar prospecto')

    await usuario.type(buscar, 'jorge')
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)

    await usuario.clear(buscar)
    await usuario.type(buscar, '477 555 0105')
    expect(await filaDe('Valeria Díaz')).toBeInTheDocument()
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
  })

  it('filtra con los accesos rápidos por etapa y con el selector', async () => {
    const usuario = abrirVendedor()
    await tabla()

    await usuario.click(screen.getByRole('button', { name: 'Visita 1' }))
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Visita 1' })).toHaveAttribute('aria-pressed', 'true')

    await elegirEnSelect(usuario, screen.getByRole('combobox', { name: 'Etapa' }), 'Pago')
    expect(await filaDe('Luis Herrera')).toBeInTheDocument()
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
  })

  it('avisa cuando ningún prospecto coincide', async () => {
    const usuario = abrirVendedor()

    await usuario.type(await screen.findByLabelText('Buscar prospecto'), 'nadie')

    expect(screen.getByText('Ningún prospecto coincide')).toBeInTheDocument()
  })

  it('invita a registrar el primero cuando no tiene prospectos', async () => {
    reiniciarDatos([])
    abrirVendedor()

    expect(await screen.findByText('Aún no tienes prospectos')).toBeInTheDocument()
    expect(screen.getByText('Registra el primer contacto para comenzar.')).toBeInTheDocument()
  })

  it('muestra el error de carga y permite reintentar', async () => {
    server.use(
      http.get(URL_PROSPECTOS, () => HttpResponse.json({ message: 'Falla' }, { status: 500 }), {
        once: true,
      }),
    )
    const usuario = abrirVendedor()

    expect(await screen.findByText('No se pudieron cargar los prospectos')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await filaDe('Rosa Díaz')).toBeInTheDocument()
  })
})

describe('Cambio de etapa en las primeras etapas', () => {
  async function abrirCambio(nombre: string) {
    const usuario = abrirVendedor()
    const menu = await abrirMenu(usuario, nombre)
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Cambiar etapa' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar etapa' })
    return { usuario, dialogo }
  }

  it('muestra la etapa actual y el historial con fecha y hora', async () => {
    const { dialogo } = await abrirCambio('Jorge Ramírez')

    expect(dialogo).toHaveTextContent('Jorge Ramírez')
    expect(dialogo).toHaveTextContent('Etapa actual')
    const historial = within(dialogo).getByRole('heading', { name: 'Historial de etapas' })
    expect(historial).toBeInTheDocument()
    expect(await within(dialogo).findAllByRole('listitem')).toHaveLength(2)
  })

  it('solo ofrece las primeras etapas, Pago y Cerrado', async () => {
    const { usuario, dialogo } = await abrirCambio('Rosa Díaz')

    await usuario.click(within(dialogo).getByRole('combobox', { name: 'Nueva etapa' }))

    const opciones = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(opciones).toEqual(['Visita', 'Cotización', 'Pago', 'Cerrado'])
  })

  it('guarda la nueva etapa y la muestra en la lista', async () => {
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const { usuario, dialogo } = await abrirCambio('Rosa Díaz')

    await elegirEnSelect(usuario, within(dialogo).getByRole('combobox', { name: 'Nueva etapa' }), 'Pago')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await screen.findByText('Rosa Díaz pasó a la etapa Pago.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'PAGO' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await filaDe('Rosa Díaz')).toHaveTextContent('Pago')
  })

  it('pide elegir la etapa antes de guardar', async () => {
    const { usuario, dialogo } = await abrirCambio('Rosa Díaz')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(within(dialogo).getByText('Elige la nueva etapa.')).toBeInTheDocument()
  })

  it('para cerrar exige el motivo y lo manda', async () => {
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const { usuario, dialogo } = await abrirCambio('Marta Hernández')

    await elegirEnSelect(usuario, within(dialogo).getByRole('combobox', { name: 'Nueva etapa' }), 'Cerrado')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))
    expect(within(dialogo).getByText('Escribe el motivo de cierre.')).toBeInTheDocument()

    await usuario.type(within(dialogo).getByLabelText('Motivo de cierre'), 'Compró en otra agencia')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await screen.findByText('Marta Hernández pasó a la etapa Cerrado.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'CERRADO', motivoCierre: 'Compró en otra agencia' })
  })

  it('muestra el mensaje del servidor si rechaza el cambio', async () => {
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, () =>
        HttpResponse.json({ status: 409, message: 'Cambio de etapa no permitido' }, { status: 409 }),
      ),
    )
    const { usuario, dialogo } = await abrirCambio('Rosa Díaz')

    await elegirEnSelect(usuario, within(dialogo).getByRole('combobox', { name: 'Nueva etapa' }), 'Visita')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await within(dialogo).findByText('Cambio de etapa no permitido')).toBeInTheDocument()
  })
})

describe('Pago, Facturación y Entrega', () => {
  it('en Pago el vendedor ya no cambia la etapa: solo ve el historial o solicita el cierre', async () => {
    const usuario = abrirVendedor()

    const menu = await abrirMenu(usuario, 'Luis Herrera')

    expect(within(menu).queryByRole('menuitem', { name: 'Cambiar etapa' })).not.toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Solicitar cierre' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Ver historial' })).toBeInTheDocument()
  })

  it('el historial explica quién avanza un prospecto en Pago', async () => {
    const usuario = abrirVendedor()
    const menu = await abrirMenu(usuario, 'Luis Herrera')

    await usuario.click(within(menu).getByRole('menuitem', { name: 'Ver historial' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Historial de etapas' })
    expect(dialogo).toHaveTextContent('Avanza cuando contabilidad valida el pago.')
  })

  it('solicita el cierre con motivo y la fila lo indica', async () => {
    let recibido: unknown
    server.use(
      http.post(`${URL_PROSPECTOS}/:id/solicitudes-cierre`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const usuario = abrirVendedor()
    const menu = await abrirMenu(usuario, 'Luis Herrera')
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Solicitar cierre' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Solicitar cierre' })

    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar solicitud' }))
    expect(within(dialogo).getByText('Escribe el motivo de cierre.')).toBeInTheDocument()

    await usuario.type(within(dialogo).getByLabelText('Motivo de cierre'), 'El cliente canceló')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar solicitud' }))

    expect(
      await screen.findByText('Se envió la solicitud de cierre de Luis Herrera al Administrador.'),
    ).toBeInTheDocument()
    expect(recibido).toEqual({ motivo: 'El cliente canceló' })
    expect(await filaDe('Luis Herrera')).toHaveTextContent('Cierre solicitado')
  })

  it('en Entrega el vendedor finaliza el prospecto con confirmación', async () => {
    const usuario = abrirVendedor()
    const menu = await abrirMenu(usuario, 'Valeria Díaz')

    await usuario.click(within(menu).getByRole('menuitem', { name: 'Finalizar' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Finalizar el prospecto?' })
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }))

    expect(await screen.findByText('Valeria Díaz quedó finalizado.')).toBeInTheDocument()
    expect(await filaDe('Valeria Díaz')).toHaveTextContent('Finalizado')
  })
})

describe('Gerente de marketing', () => {
  function abrirGerente() {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/prospectos')
    return userEvent.setup()
  }

  it('ve los prospectos de todo el equipo con su vendedor y no registra', async () => {
    abrirGerente()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Prospectos del equipo' }),
    ).toBeInTheDocument()
    expect(await filaDe('Carlos Núñez')).toHaveTextContent('Víctor Vendedor')
    expect(screen.getByText(/Visibilidad de todo el equipo/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar prospecto' })).not.toBeInTheDocument()
  })

  it('consulta el historial pero no cambia etapas', async () => {
    const usuario = abrirGerente()

    const menu = await abrirMenu(usuario, 'Rosa Díaz')

    expect(within(menu).queryByRole('menuitem', { name: 'Cambiar etapa' })).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Solicitar cierre' })).not.toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Ver historial' })).toBeInTheDocument()
    expect(await within(menu).findByRole('menuitem', { name: 'Reasignar' })).toBeInTheDocument()
  })
})
