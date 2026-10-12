import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CORREO_REPETIDO, TELEFONO_REPETIDO } from '../mocks/datos.ts'
import { server } from '../mocks/server.ts'
import { URL_PROSPECTOS } from './api.ts'
import RegistroProspectoForm from './RegistroProspectoForm.tsx'

function renderizar() {
  const user = userEvent.setup()
  render(<RegistroProspectoForm />)
  return {
    user,
    nombre: screen.getByLabelText('Nombre'),
    telefono: screen.getByLabelText('Teléfono'),
    correo: screen.getByLabelText('Correo'),
    registrar: screen.getByRole('button', { name: 'Registrar prospecto' }),
  }
}

describe('RegistroProspectoForm', () => {
  it('pide el nombre si viene vacío', async () => {
    const { user, telefono, registrar } = renderizar()

    await user.type(telefono, '4771234567')
    await user.click(registrar)

    expect(screen.getByText('Escribe el nombre del prospecto.')).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('no acepta un nombre con solo espacios', async () => {
    const { user, nombre, telefono, registrar } = renderizar()

    await user.type(nombre, '   ')
    await user.type(telefono, '4771234567')
    await user.click(registrar)

    expect(screen.getByText('Escribe el nombre del prospecto.')).toBeVisible()
  })

  it('pide teléfono o correo si faltan los dos', async () => {
    const { user, nombre, registrar } = renderizar()

    await user.type(nombre, 'Ana López')
    await user.click(registrar)

    expect(
      screen.getByText('Escribe al menos un teléfono o un correo.'),
    ).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('registra con nombre y teléfono y muestra la etapa Primer contacto', async () => {
    const { user, nombre, telefono, registrar } = renderizar()

    await user.type(nombre, 'Ana López')
    await user.type(telefono, '4771234567')
    await user.click(registrar)

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Ana López')
    expect(aviso).toHaveTextContent('Primer contacto')
  })

  it('registra con nombre y correo, sin teléfono', async () => {
    const { user, nombre, correo, registrar } = renderizar()

    await user.type(nombre, 'Luis Pérez')
    await user.type(correo, 'luis@ejemplo.com')
    await user.click(registrar)

    expect(await screen.findByRole('status')).toHaveTextContent('Luis Pérez')
  })

  it('envía los datos sin espacios sobrantes y sin campos vacíos', async () => {
    let recibido: unknown
    server.use(
      http.post(URL_PROSPECTOS, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json(
          {
            id: 7,
            nombre: 'Ana López',
            telefono: null,
            correo: 'ana@ejemplo.com',
            etapa: 'PRIMER_CONTACTO',
            vendedorId: 1,
            creadoEn: '2026-10-12T15:00:00Z',
          },
          { status: 201 },
        )
      }),
    )
    const { user, nombre, correo, registrar } = renderizar()

    await user.type(nombre, '  Ana López ')
    await user.type(correo, ' ana@ejemplo.com ')
    await user.click(registrar)

    await screen.findByRole('status')
    expect(recibido).toEqual({ nombre: 'Ana López', correo: 'ana@ejemplo.com' })
  })

  it('limpia el formulario después de registrar', async () => {
    const { user, nombre, telefono, registrar } = renderizar()

    await user.type(nombre, 'Ana López')
    await user.type(telefono, '4771234567')
    await user.click(registrar)

    await screen.findByRole('status')
    expect(nombre).toHaveValue('')
    expect(telefono).toHaveValue('')
  })

  it('avisa si el teléfono ya existe', async () => {
    const { user, nombre, telefono, registrar } = renderizar()

    await user.type(nombre, 'Ana López')
    await user.type(telefono, TELEFONO_REPETIDO)
    await user.click(registrar)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un prospecto con ese teléfono o correo.',
    )
    // Conserva lo capturado para que el vendedor pueda corregirlo.
    expect(telefono).toHaveValue(TELEFONO_REPETIDO)
  })

  it('avisa si el correo ya existe', async () => {
    const { user, nombre, correo, registrar } = renderizar()

    await user.type(nombre, 'Ana López')
    await user.type(correo, CORREO_REPETIDO)
    await user.click(registrar)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un prospecto con ese teléfono o correo.',
    )
  })

  it('muestra un error genérico si el servidor falla', async () => {
    server.use(
      http.post(URL_PROSPECTOS, () => new HttpResponse(null, { status: 500 })),
    )
    const { user, nombre, telefono, registrar } = renderizar()

    await user.type(nombre, 'Ana López')
    await user.type(telefono, '4771234567')
    await user.click(registrar)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo registrar el prospecto. Intenta de nuevo.',
    )
  })

  it('desactiva el botón mientras envía', async () => {
    // La respuesta se detiene hasta que la prueba la suelta.
    let soltar = () => {}
    const pausa = new Promise<void>((resolver) => {
      soltar = resolver
    })
    server.use(
      http.post(URL_PROSPECTOS, async () => {
        await pausa
        return HttpResponse.json(
          {
            id: 1,
            nombre: 'Ana López',
            telefono: '4771234567',
            correo: null,
            etapa: 'PRIMER_CONTACTO',
            vendedorId: 1,
            creadoEn: '2026-10-12T15:00:00Z',
          },
          { status: 201 },
        )
      }),
    )
    const { user, nombre, telefono, registrar } = renderizar()

    await user.type(nombre, 'Ana López')
    await user.type(telefono, '4771234567')
    await user.click(registrar)

    expect(registrar).toBeDisabled()
    soltar()
    await screen.findByRole('status')
    expect(registrar).toBeEnabled()
  })
})
