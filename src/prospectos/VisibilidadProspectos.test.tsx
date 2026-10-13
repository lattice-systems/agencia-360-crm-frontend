import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { reiniciarDatos } from '../mocks/datos.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'
import { URL_PROSPECTOS } from './api.ts'
import type { Prospecto } from './tipos.ts'

// CRM-0.1: la regla la aplica el backend con el uid del token; aquí se prueba
// que el CRM manda el token y muestra lo que el backend devuelve (simulado en
// src/mocks/handlers.ts).

const DE_VALERIA: Prospecto = {
  id: 1,
  nombre: 'Rosa Díaz',
  telefono: '5500000000',
  correo: null,
  etapa: 'PRIMER_CONTACTO',
  vendedorId: 1,
  creadoEn: '2026-10-10T16:30:00Z',
}

const DE_VICTOR: Prospecto = {
  ...DE_VALERIA,
  id: 2,
  nombre: 'Jorge Ramírez',
  vendedorId: 2,
}

async function nombresEnLista() {
  const lista = await screen.findByRole('list', { name: 'Prospectos' })
  return within(lista)
    .getAllByRole('listitem')
    .map((fila) => fila.querySelector('.nombre')?.textContent)
}

describe('Visibilidad de prospectos', () => {
  it('pide los prospectos con el token de la sesión', async () => {
    const token = conSesion('VENTAS')
    let autorizacion: string | null = null
    server.use(
      http.get(URL_PROSPECTOS, ({ request }) => {
        autorizacion = request.headers.get('Authorization')
      }),
    )
    renderApp('/prospectos')

    await screen.findByRole('list', { name: 'Prospectos' })
    expect(autorizacion).toBe(`Bearer ${token}`)
  })

  it('el vendedor solo ve sus prospectos', async () => {
    reiniciarDatos([DE_VALERIA, DE_VICTOR])
    conSesion('VENTAS', { uid: 2 })
    renderApp('/prospectos')

    expect(await nombresEnLista()).toEqual(['Jorge Ramírez'])
  })

  it('el gerente de marketing ve todos los prospectos', async () => {
    reiniciarDatos([DE_VALERIA, DE_VICTOR])
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/prospectos')

    expect(await nombresEnLista()).toEqual(['Rosa Díaz', 'Jorge Ramírez'])
  })

  it('cierra la sesión si el backend rechaza el token', async () => {
    conSesion('VENTAS')
    server.use(
      http.get(URL_PROSPECTOS, () => new HttpResponse(null, { status: 401 })),
    )
    renderApp('/prospectos')

    expect(
      await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.'),
    ).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})
