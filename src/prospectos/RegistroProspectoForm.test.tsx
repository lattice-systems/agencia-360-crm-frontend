import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CORREO_REPETIDO, TELEFONO_REPETIDO } from '../mocks/datos.ts'
import { server } from '../mocks/server.ts'
import { conSesion, renderApp } from '../test/utilidades.ts'
import { URL_PROSPECTOS } from './api.ts'

function abrir() {
  conSesion('VENTAS')
  renderApp('/registrar')
  const usuario = userEvent.setup()
  return {
    usuario,
    nombre: screen.getByLabelText(/Nombre completo/),
    telefono: screen.getByLabelText('Teléfono'),
    correo: screen.getByLabelText('Correo'),
    registrar: screen.getByRole('button', { name: 'Registrar prospecto' }),
  }
}

describe('Registro de prospecto', () => {
  it('muestra la ruta, la etapa inicial y los campos del mockup', () => {
    abrir()

    expect(screen.getByRole('heading', { level: 1, name: 'Registrar prospecto' })).toBeInTheDocument()
    const ruta = screen.getByRole('navigation', { name: 'Migas de pan' })
    expect(within(ruta).getByRole('link', { name: 'Prospectos' })).toHaveAttribute('href', '/prospectos')
    expect(screen.getByText('Información de contacto')).toBeInTheDocument()
    expect(screen.getByText('Etapa inicial')).toHaveTextContent('Primer contacto')
    expect(screen.getByText('Puedes completar solo teléfono o correo.')).toBeInTheDocument()
  })

  it('pide el nombre', async () => {
    const { usuario, telefono, registrar, nombre } = abrir()

    await usuario.type(telefono, '4771234567')
    await usuario.click(registrar)

    expect(await screen.findByText('Escribe el nombre completo.')).toBeInTheDocument()
    expect(nombre).toHaveAttribute('aria-invalid', 'true')
    expect(nombre).toHaveFocus()
  })

  it('pide al menos un teléfono o un correo', async () => {
    const { usuario, nombre, registrar } = abrir()

    await usuario.type(nombre, 'Ana López')
    await usuario.click(registrar)

    expect(await screen.findByText('Escribe al menos un teléfono o un correo.')).toBeInTheDocument()
  })

  it('pide un teléfono de 10 dígitos y un correo válido', async () => {
    const { usuario, nombre, telefono, correo, registrar } = abrir()

    await usuario.type(nombre, 'Ana López')
    await usuario.type(telefono, '477123')
    await usuario.type(correo, 'ana-sin-arroba')
    await usuario.click(registrar)

    expect(await screen.findByText('El teléfono debe tener 10 dígitos.')).toBeInTheDocument()
    expect(screen.getByText('Escribe un correo válido.')).toBeInTheDocument()
  })

  it('registra con el teléfono solo en dígitos y regresa a la lista con un aviso', async () => {
    let recibido: unknown
    server.use(
      http.post(URL_PROSPECTOS, async ({ request }) => {
        recibido = await request.clone().json()
      }),
    )
    const { usuario, nombre, telefono, registrar } = abrir()

    await usuario.type(nombre, '  Ana López ')
    await usuario.type(telefono, '(477) 123-45 67')
    await usuario.click(registrar)

    expect(
      await screen.findByText('Se registró a Ana López en la etapa Primer contacto.'),
    ).toBeInTheDocument()
    expect(recibido).toEqual({ nombre: 'Ana López', telefono: '4771234567' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis prospectos' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Prospectos' })).toHaveTextContent('Ana López')
  })

  it('avisa mientras captura que el teléfono ya existe, sin decir de quién', async () => {
    const { usuario, telefono } = abrir()

    await usuario.type(telefono, TELEFONO_REPETIDO)

    const aviso = await screen.findByText('Este contacto ya existe')
    expect(aviso.closest('[role="status"]')).toHaveTextContent(
      'Ya hay otro prospecto con este teléfono o correo. Puedes registrarlo de todos modos.',
    )
    expect(aviso.closest('[role="status"]')).not.toHaveTextContent('Rosa')
  })

  it('avisa del correo repetido y aun así deja registrar', async () => {
    const { usuario, nombre, correo, registrar } = abrir()

    await usuario.type(nombre, 'Ana')
    await usuario.type(correo, CORREO_REPETIDO)
    expect(await screen.findByText('Este contacto ya existe')).toBeInTheDocument()

    await usuario.click(registrar)

    expect(await screen.findByText('Se registró a Ana en la etapa Primer contacto.')).toBeInTheDocument()
  })

  it('no avisa cuando el contacto es nuevo', async () => {
    const { usuario, telefono } = abrir()

    await usuario.type(telefono, '4771112233')
    await new Promise((resolver) => setTimeout(resolver, 600))

    expect(screen.queryByText('Este contacto ya existe')).not.toBeInTheDocument()
  })

  it('muestra el mensaje del servidor y conserva lo capturado', async () => {
    server.use(
      http.post(URL_PROSPECTOS, () =>
        HttpResponse.json({ status: 400, message: 'El teléfono debe tener 10 dígitos' }, { status: 400 }),
      ),
    )
    const { usuario, nombre, telefono, registrar } = abrir()

    await usuario.type(nombre, 'Ana López')
    await usuario.type(telefono, '4771234567')
    await usuario.click(registrar)

    expect(await screen.findByText('No se pudo registrar el prospecto')).toBeInTheDocument()
    expect(screen.getByText('El teléfono debe tener 10 dígitos')).toBeInTheDocument()
    expect(nombre).toHaveValue('Ana López')
  })

  it('Cancelar regresa a la lista', async () => {
    const { usuario } = abrir()

    await usuario.click(screen.getByRole('link', { name: 'Cancelar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis prospectos' })).toBeInTheDocument()
  })
})
