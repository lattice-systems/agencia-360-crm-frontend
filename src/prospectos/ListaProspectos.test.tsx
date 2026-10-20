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
// (Cotización), Luis Herrera (Pago), Valeria Díaz (Entrega), Roberto Salas
// (Finalizado el 10 de octubre) y Jorge Medina (Cerrado: "Se fue por otra
// marca"). De Víctor Vendedor (uid 2) son Carlos Núñez (Facturación, con cierre
// solicitado) y Daniela Cruz (Finalizado el 12 de octubre).

type Usuario = ReturnType<typeof userEvent.setup>

async function tabla() {
  return screen.findByRole('table', { name: 'Prospectos' })
}

async function filaDe(nombre: string) {
  return within(await tabla()).getByText(nombre).closest('tr') as HTMLElement
}

/** Nombres accesibles de los botones de acciones de un renglón. */
async function botonesDe(nombre: string) {
  return within(await filaDe(nombre))
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label'))
}

function abrirVendedor() {
  conSesion('VENTAS')
  renderApp('/prospectos')
  return userEvent.setup()
}

async function elegirEnSelect(usuario: Usuario, combo: HTMLElement, opcion: string) {
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
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument()
  })

  it('ofrece registrar un prospecto', async () => {
    abrirVendedor()

    expect(await screen.findByRole('link', { name: 'Registrar prospecto' })).toHaveAttribute(
      'href',
      '/prospectos/registrar',
    )
  })

  it('busca por nombre o por teléfono escrito con espacios', async () => {
    const usuario = abrirVendedor()
    const buscar = await screen.findByLabelText('Buscar prospecto')

    await usuario.type(buscar, 'ramírez')
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)

    await usuario.clear(buscar)
    await usuario.type(buscar, '477 555 0105')
    expect(await filaDe('Valeria Díaz')).toBeInTheDocument()
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
  })

  it('filtra con los accesos rápidos por etapa', async () => {
    const usuario = abrirVendedor()
    await tabla()

    await usuario.click(screen.getByRole('button', { name: 'Visita 1' }))
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Visita 1' })).toHaveAttribute('aria-pressed', 'true')

    await usuario.click(screen.getByRole('button', { name: 'Pago 1' }))
    expect(await filaDe('Luis Herrera')).toBeInTheDocument()
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)

    await usuario.click(screen.getByRole('button', { name: 'Todos 5' }))
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(6)
  })

  it('ya no tiene el selector de etapa', async () => {
    abrirVendedor()
    await tabla()

    expect(screen.queryByRole('combobox', { name: 'Etapa' })).not.toBeInTheDocument()
  })

  it('no muestra los prospectos finalizados', async () => {
    abrirVendedor()

    expect(within(await tabla()).queryByText('Roberto Salas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Finalizado/ })).not.toBeInTheDocument()
  })

  it('oculta los cerrados hasta marcar "Mostrar cerrados"', async () => {
    const usuario = abrirVendedor()
    expect(within(await tabla()).queryByText('Jorge Medina')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Cerrado/ })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('checkbox', { name: /Mostrar cerrados/ }))

    expect(await filaDe('Jorge Medina')).toHaveTextContent('Cerrado')
    expect(await filaDe('Jorge Medina')).toHaveTextContent('Se fue por otra marca')
    expect(screen.getByRole('button', { name: 'Todos 6' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrado 1' })).toBeInTheDocument()
    // Un cerrado ya no cambia: solo se consulta.
    expect(await botonesDe('Jorge Medina')).toEqual(['Ver historial de Jorge Medina'])

    await usuario.click(screen.getByRole('button', { name: 'Cerrado 1' }))
    await usuario.click(screen.getByRole('checkbox', { name: /Mostrar cerrados/ }))
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(6)
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

describe('Botones de acciones según la etapa', () => {
  it('en las primeras etapas ofrece pasar a la siguiente, cerrar y ver', async () => {
    abrirVendedor()

    expect(await botonesDe('Rosa Díaz')).toEqual([
      'Pasar Rosa Díaz a Visita',
      'Cerrar Rosa Díaz',
      'Ver historial de Rosa Díaz',
    ])
    expect(await botonesDe('Jorge Ramírez')).toContain('Pasar Jorge Ramírez a Cotización')
    expect(await botonesDe('Marta Hernández')).toContain('Pasar Marta Hernández a Pago')
  })

  it('en Pago no avanza ni cierra directo: solicita el cierre o ve el historial', async () => {
    abrirVendedor()

    expect(await botonesDe('Luis Herrera')).toEqual([
      'Solicitar cierre de Luis Herrera',
      'Ver historial de Luis Herrera',
    ])
  })

  it('en Entrega ofrece finalizar', async () => {
    abrirVendedor()

    expect(await botonesDe('Valeria Díaz')).toEqual([
      'Finalizar Valeria Díaz',
      'Solicitar cierre de Valeria Díaz',
      'Ver historial de Valeria Díaz',
    ])
  })
})

describe('Cambio de etapa', () => {
  async function abrirCambio(boton: string) {
    const usuario = abrirVendedor()
    await usuario.click(await screen.findByRole('button', { name: boton }))
    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar etapa' })
    return { usuario, dialogo }
  }

  it('llega con la siguiente etapa elegida y muestra el historial', async () => {
    const { dialogo } = await abrirCambio('Pasar Jorge Ramírez a Cotización')

    expect(dialogo).toHaveTextContent('Jorge Ramírez')
    expect(within(dialogo).getByRole('combobox', { name: 'Nueva etapa' })).toHaveTextContent(
      'Cotización',
    )
    expect(
      within(dialogo).getByRole('heading', { name: 'Historial de etapas' }),
    ).toBeInTheDocument()
    expect(await within(dialogo).findAllByRole('listitem')).toHaveLength(2)
  })

  it('permite elegir otra de las primeras etapas, Pago o Cerrado', async () => {
    const { usuario, dialogo } = await abrirCambio('Pasar Rosa Díaz a Visita')

    await usuario.click(within(dialogo).getByRole('combobox', { name: 'Nueva etapa' }))

    const opciones = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(opciones).toEqual(['Visita', 'Cotización', 'Pago', 'Cerrado'])
  })

  it('guarda la etapa y la muestra en la lista', async () => {
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const { usuario, dialogo } = await abrirCambio('Pasar Rosa Díaz a Visita')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await screen.findByText('Rosa Díaz pasó a la etapa Visita.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'VISITA' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await filaDe('Rosa Díaz')).toHaveTextContent('Visita')
    expect(await botonesDe('Rosa Díaz')).toContain('Pasar Rosa Díaz a Cotización')
  })

  it('también se puede saltar etapas desde el diálogo', async () => {
    const { usuario, dialogo } = await abrirCambio('Pasar Rosa Díaz a Visita')

    await elegirEnSelect(usuario, within(dialogo).getByRole('combobox', { name: 'Nueva etapa' }), 'Pago')
    await usuario.type(within(dialogo).getByLabelText('Precio total de la venta (MXN)'), '489900')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await screen.findByText('Rosa Díaz pasó a la etapa Pago.')).toBeInTheDocument()
  })

  it('al pasar a Pago pide el precio total de la venta', async () => {
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const { usuario, dialogo } = await abrirCambio('Pasar Marta Hernández a Pago')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))
    expect(within(dialogo).getByText('Escribe el precio total de la venta.')).toBeInTheDocument()
    expect(recibido).toBeUndefined()

    await usuario.type(within(dialogo).getByLabelText('Precio total de la venta (MXN)'), 'mucho')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))
    expect(within(dialogo).getByText('Escribe un monto válido, por ejemplo 489,900.00.')).toBeInTheDocument()

    await usuario.clear(within(dialogo).getByLabelText('Precio total de la venta (MXN)'))
    await usuario.type(within(dialogo).getByLabelText('Precio total de la venta (MXN)'), '$489,900.50')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await screen.findByText('Marta Hernández pasó a la etapa Pago.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'PAGO', precioTotal: 489900.5 })
  })

  it('Cerrar llega con Cerrado elegido y exige uno de los tres motivos', async () => {
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const { usuario, dialogo } = await abrirCambio('Cerrar Marta Hernández')

    const motivos = within(dialogo).getByRole('radiogroup', { name: 'Motivo de cierre' })
    expect(within(motivos).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual([
      'Se fue por otra marca',
      'Perdió el interés',
      'Rechazo de financiamiento',
    ])
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))
    expect(within(dialogo).getByText('Elige el motivo de cierre.')).toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('radio', { name: 'Perdió el interés' }))
    expect(within(dialogo).queryByText('Elige el motivo de cierre.')).not.toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await screen.findByText('Marta Hernández pasó a la etapa Cerrado.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'CERRADO', motivoCierre: 'PERDIO_EL_INTERES' })
    // Se oculta con los demás cerrados.
    await waitFor(() =>
      expect(within(screen.getByRole('table')).queryByText('Marta Hernández')).not.toBeInTheDocument(),
    )
  })

  it('muestra el mensaje del servidor si rechaza el cambio', async () => {
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, () =>
        HttpResponse.json({ status: 409, message: 'Cambio de etapa no permitido' }, { status: 409 }),
      ),
    )
    const { usuario, dialogo } = await abrirCambio('Pasar Rosa Díaz a Visita')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar etapa' }))

    expect(await within(dialogo).findByText('Cambio de etapa no permitido')).toBeInTheDocument()
  })
})

describe('Pago, Facturación y Entrega', () => {
  it('el historial explica quién avanza un prospecto en Pago', async () => {
    const usuario = abrirVendedor()

    await usuario.click(await screen.findByRole('button', { name: 'Ver historial de Luis Herrera' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Historial de etapas' })
    expect(dialogo).toHaveTextContent('Avanza cuando contabilidad valida el pago.')
  })

  it('solicita el cierre con uno de los motivos y el botón queda como solicitado', async () => {
    let recibido: unknown
    server.use(
      http.post(`${URL_PROSPECTOS}/:id/solicitudes-cierre`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const usuario = abrirVendedor()
    await usuario.click(await screen.findByRole('button', { name: 'Solicitar cierre de Luis Herrera' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Solicitar cierre' })

    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar solicitud' }))
    expect(within(dialogo).getByText('Elige el motivo de cierre.')).toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('radio', { name: 'Rechazo de financiamiento' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar solicitud' }))

    expect(
      await screen.findByText('Se envió la solicitud de cierre de Luis Herrera al Administrador.'),
    ).toBeInTheDocument()
    expect(recibido).toEqual({ motivo: 'RECHAZO_DE_FINANCIAMIENTO' })
    expect(
      await screen.findByRole('button', { name: 'Cierre de Luis Herrera ya solicitado' }),
    ).toBeDisabled()
  })

  it('en Entrega el vendedor finaliza con confirmación y sale de Prospectos', async () => {
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const usuario = abrirVendedor()

    await usuario.click(await screen.findByRole('button', { name: 'Finalizar Valeria Díaz' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Finalizar el prospecto?' })
    expect(
      within(confirmacion).getByRole('checkbox', { name: 'El cliente no quiere la app CareCar' }),
    ).not.toBeChecked()
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }))

    expect(await screen.findByText('Valeria Díaz quedó finalizado.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'FINALIZADO' })
    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: /Valeria Díaz/ })).not.toBeInTheDocument(),
    )
  })

  it('si el prospecto no tiene correo, pide el correo para su cuenta de la app', async () => {
    reiniciarDatos([
      {
        id: 5,
        nombre: 'Valeria Díaz',
        telefono: '4775550105',
        correo: null,
        etapa: 'ENTREGA',
        vendedorId: 1,
        creadoEn: '2026-10-04T15:00:00Z',
        ultimoCambio: '2026-10-12T22:40:00Z',
      },
    ])
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const usuario = abrirVendedor()

    await usuario.click(await screen.findByRole('button', { name: 'Finalizar Valeria Díaz' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Finalizar el prospecto?' })
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }))
    expect(
      within(confirmacion).getByText('Escribe el correo del cliente o marca que no quiere la app.'),
    ).toBeInTheDocument()
    expect(recibido).toBeUndefined()

    await usuario.type(within(confirmacion).getByLabelText('Correo del cliente'), 'valeria@')
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }))
    expect(within(confirmacion).getByText('Escribe un correo válido.')).toBeInTheDocument()

    await usuario.type(within(confirmacion).getByLabelText('Correo del cliente'), 'correo.com')
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }))

    expect(await screen.findByText('Valeria Díaz quedó finalizado.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'FINALIZADO', correoCliente: 'valeria@correo.com' })
  })

  it('sin correo, marcar que no quiere la app deja finalizar sin pedirlo', async () => {
    reiniciarDatos([
      {
        id: 5,
        nombre: 'Valeria Díaz',
        telefono: '4775550105',
        correo: null,
        etapa: 'ENTREGA',
        vendedorId: 1,
        creadoEn: '2026-10-04T15:00:00Z',
        ultimoCambio: '2026-10-12T22:40:00Z',
      },
    ])
    const usuario = abrirVendedor()

    await usuario.click(await screen.findByRole('button', { name: 'Finalizar Valeria Díaz' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Finalizar el prospecto?' })
    await usuario.click(
      within(confirmacion).getByRole('checkbox', { name: 'El cliente no quiere la app CareCar' }),
    )
    expect(within(confirmacion).queryByLabelText('Correo del cliente')).not.toBeInTheDocument()
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }))

    expect(await screen.findByText('Valeria Díaz quedó finalizado.')).toBeInTheDocument()
  })

  it('al finalizar se puede indicar que el cliente no quiere la app', async () => {
    let recibido: unknown
    server.use(
      http.patch(`${URL_PROSPECTOS}/:id/etapa`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const usuario = abrirVendedor()

    await usuario.click(await screen.findByRole('button', { name: 'Finalizar Valeria Díaz' }))
    const confirmacion = await screen.findByRole('alertdialog', { name: '¿Finalizar el prospecto?' })
    await usuario.click(
      within(confirmacion).getByRole('checkbox', { name: 'El cliente no quiere la app CareCar' }),
    )
    expect(confirmacion).toHaveTextContent('No se le creará cuenta en la app.')
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Finalizar' }))

    expect(await screen.findByText('Valeria Díaz quedó finalizado.')).toBeInTheDocument()
    expect(recibido).toEqual({ etapa: 'FINALIZADO', clienteRechazaApp: true })
  })
})

describe('Gerente de marketing', () => {
  function abrirGerente() {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/prospectos')
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

  it('consulta el historial y reasigna, pero no cambia etapas', async () => {
    abrirGerente()

    await screen.findByRole('button', { name: 'Reasignar a Rosa Díaz' })
    expect(await botonesDe('Rosa Díaz')).toEqual([
      'Reasignar a Rosa Díaz',
      'Ver historial de Rosa Díaz',
    ])
  })
})

describe('Reasignación en masa (gerente)', () => {
  function abrirGerente() {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/prospectos')
    return userEvent.setup()
  }

  it('elige varios prospectos y los pasa al mismo vendedor', async () => {
    let recibido: unknown
    server.use(
      http.post(`${URL_PROSPECTOS}/reasignaciones`, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const usuario = abrirGerente()
    await usuario.click(await screen.findByRole('checkbox', { name: 'Seleccionar a Rosa Díaz' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Seleccionar a Jorge Ramírez' }))

    const barra = screen.getByRole('region', { name: 'Prospectos seleccionados' })
    expect(barra).toHaveTextContent('2 prospectos seleccionados')
    await usuario.click(within(barra).getByRole('button', { name: 'Reasignar seleccionados' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Reasignar prospectos' })
    expect(dialogo).toHaveTextContent('Rosa Díaz')
    expect(dialogo).toHaveTextContent('Jorge Ramírez')
    await elegirEnSelect(usuario, within(dialogo).getByRole('combobox', { name: 'Nuevo vendedor' }), 'Víctor Vendedor')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Reasignar 2' }))

    expect(await screen.findByText('Se reasignaron 2 prospectos a Víctor Vendedor.')).toBeInTheDocument()
    expect(recibido).toEqual({ prospectoIds: [1, 2], vendedorId: 2 })
    expect(await filaDe('Rosa Díaz')).toHaveTextContent('Víctor Vendedor')
    expect(await filaDe('Jorge Ramírez')).toHaveTextContent('Víctor Vendedor')
    expect(screen.queryByRole('region', { name: 'Prospectos seleccionados' })).not.toBeInTheDocument()
  })

  it('puede elegir todos los de la página de una vez y soltarlos', async () => {
    const usuario = abrirGerente()

    await usuario.click(
      await screen.findByRole('checkbox', { name: 'Seleccionar los prospectos de esta página' }),
    )
    const filas = within(await tabla()).getAllByRole('row').length - 1
    expect(screen.getByRole('region', { name: 'Prospectos seleccionados' })).toHaveTextContent(
      `${filas} prospectos seleccionados`,
    )

    await usuario.click(screen.getByRole('button', { name: 'Quitar selección' }))
    expect(screen.queryByRole('region', { name: 'Prospectos seleccionados' })).not.toBeInTheDocument()
  })

  it('el vendedor no ve las casillas de selección', async () => {
    abrirVendedor()

    await filaDe('Rosa Díaz')
    expect(screen.queryByRole('checkbox', { name: /^Seleccionar/ })).not.toBeInTheDocument()
  })
})

describe('Finalizados', () => {
  it('el vendedor ve sus prospectos finalizados aparte y solo de consulta', async () => {
    conSesion('VENTAS')
    renderApp('/finalizados')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mis prospectos finalizados' }),
    ).toBeInTheDocument()
    expect(await filaDe('Roberto Salas')).toHaveTextContent('Finalizado')
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByRole('columnheader', { name: 'Fecha de entrega' })).toBeInTheDocument()
    expect(await filaDe('Roberto Salas')).toHaveTextContent('10 oct 2026')
    // El vendedor solo ve los suyos: no hay filtro por vendedor.
    expect(screen.queryByRole('combobox', { name: 'Vendedor' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar prospecto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Mostrar cerrados/ })).not.toBeInTheDocument()
    expect(await botonesDe('Roberto Salas')).toEqual(['Ver historial de Roberto Salas'])
  })

  it('está en el menú lateral', async () => {
    conSesion('VENTAS')
    renderApp('/prospectos')

    const menu = within(screen.getByRole('navigation', { name: 'Principal' }))
    expect(menu.getByRole('link', { name: 'Finalizados' })).toHaveAttribute('href', '/finalizados')
  })

  it('el gerente ve los finalizados de todo el equipo, de la entrega más reciente a la más antigua', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/finalizados')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prospectos finalizados del equipo' }),
    ).toBeInTheDocument()
    expect(await filaDe('Roberto Salas')).toHaveTextContent('Valeria Vendedora')
    expect(await filaDe('Daniela Cruz')).toHaveTextContent('Víctor Vendedor')
    const nombres = within(await tabla())
      .getAllByRole('row')
      .slice(1)
      .map((fila) => fila.querySelector('.nombre')?.textContent)
    expect(nombres).toEqual(['Daniela Cruz', 'Roberto Salas'])
  })

  it('el gerente filtra los finalizados por vendedor', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/finalizados')
    const usuario = userEvent.setup()
    await filaDe('Daniela Cruz')

    await elegirEnSelect(usuario, screen.getByRole('combobox', { name: 'Vendedor' }), 'Víctor Vendedor')

    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
    expect(await filaDe('Daniela Cruz')).toBeInTheDocument()
    expect(screen.getByText('2 prospectos finalizados')).toBeInTheDocument()
  })

  it('invita a esperar cuando aún no hay finalizados', async () => {
    reiniciarDatos([])
    conSesion('VENTAS')
    renderApp('/finalizados')

    expect(await screen.findByText('Aún no hay prospectos finalizados')).toBeInTheDocument()
  })
})

describe('Filtros persistentes', () => {
  it('al salir de la lista y volver se conservan la búsqueda, la etapa y "Mostrar cerrados"', async () => {
    const usuario = abrirVendedor()
    await tabla()
    await usuario.click(screen.getByRole('checkbox', { name: /Mostrar cerrados/ }))
    await usuario.click(screen.getByRole('button', { name: 'Cerrado 1' }))
    await usuario.type(screen.getByLabelText('Buscar prospecto'), 'medina')

    const menu = within(screen.getByRole('navigation', { name: 'Principal' }))
    await usuario.click(menu.getByRole('link', { name: 'Finalizados' }))
    await screen.findByRole('heading', { level: 1, name: 'Mis prospectos finalizados' })
    // Cada lista tiene sus propios filtros.
    expect(await screen.findByLabelText('Buscar prospecto')).toHaveValue('')
    await usuario.click(menu.getByRole('link', { name: 'Prospectos' }))

    expect(await screen.findByLabelText('Buscar prospecto')).toHaveValue('medina')
    expect(screen.getByRole('checkbox', { name: /Mostrar cerrados/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Cerrado 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(await tabla()).getAllByRole('row')).toHaveLength(2)
  })
})
