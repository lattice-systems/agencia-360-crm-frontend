import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { conSesion, renderApp } from '../test/utilidades.ts'

/** Textos de las migas de pan, con la ruta de cada enlace (null en la página actual). */
function migas() {
  const nav = screen.getByRole('navigation', { name: 'Migas de pan' })
  return within(nav)
    .getAllByRole('listitem')
    .filter((item) => item.textContent)
    .map((item) => {
      const enlace = within(item).queryByRole('link')
      return [item.textContent, enlace?.getAttribute('href') ?? null]
    })
}

describe('Migas de pan en la barra superior (CRM-UX-2)', () => {
  it('un rol sin secciones ve Inicio como página actual', () => {
    conSesion('CONTABILIDAD', { uid: 20 })
    renderApp('/')

    expect(migas()).toEqual([['Inicio', null]])
  })

  it('empieza en la sección, porque el CRM no tiene página de Inicio', async () => {
    conSesion('VENTAS')
    renderApp('/')

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis prospectos' })).toBeInTheDocument()
    expect(migas()).toEqual([['Prospectos', null]])
    expect(screen.getByText('Prospectos', { selector: '[aria-current="page"]' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('Registrar cuelga de Prospectos', () => {
    conSesion('VENTAS')
    renderApp('/prospectos/registrar')

    expect(migas()).toEqual([
      ['Prospectos', '/prospectos'],
      ['Registrar prospecto', null],
    ])
  })

  it('cubre las secciones del Gerente de marketing', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/clientes')

    expect(migas()).toEqual([['Clientes', null]])
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('las migas quedan solo en la barra superior, no repetidas en la página', () => {
    conSesion('VENTAS')
    renderApp('/prospectos/registrar')

    expect(screen.getAllByRole('navigation', { name: 'Migas de pan' })).toHaveLength(1)
    expect(screen.queryByRole('navigation', { name: 'Ruta' })).not.toBeInTheDocument()
  })
})

describe('Menú de perfil (CRM-UX-2)', () => {
  it('muestra las iniciales del nombre en el ícono de perfil', () => {
    conSesion('VENTAS')
    renderApp('/')

    expect(screen.getByRole('button', { name: 'Perfil de Persona de Prueba' })).toHaveTextContent('PP')
  })

  it('al abrirlo muestra el nombre, el rol y cerrar sesión', async () => {
    conSesion('GERENTE_MARKETING', { uid: 10 })
    renderApp('/')
    const usuario = userEvent.setup({ delay: null })

    await usuario.click(screen.getByRole('button', { name: 'Perfil de Persona de Prueba' }))

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Persona de Prueba')).toBeInTheDocument()
    expect(within(menu).getByText('Gerente de marketing')).toBeInTheDocument()
    await usuario.click(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(screen.getByRole('button', { name: 'Entrar al CRM' })).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})

describe('Menú lateral (CRM-UX-2)', () => {
  it('muestra el logo sin el texto Agencia360 · CRM', () => {
    conSesion('VENTAS')
    renderApp('/')

    expect(screen.getByRole('link', { name: 'Agencia360, ir a Inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('Agencia360 · CRM')).not.toBeInTheDocument()
  })
})
