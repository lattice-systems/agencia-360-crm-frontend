import { describe, expect, it } from 'vitest'
import { tokenDePrueba } from '../test/utilidades.ts'
import {
  borrarSesion,
  crearSesion,
  expiracionDelToken,
  guardarSesion,
  leerSesion,
} from './almacen.ts'

describe('almacén de la sesión', () => {
  it('lee la expiración del token', () => {
    const token = tokenDePrueba(60)
    const expira = expiracionDelToken(token)

    expect(expira).not.toBeNull()
    expect(expira! - Date.now()).toBeGreaterThan(55_000)
  })

  it('no acepta un token mal formado', () => {
    expect(expiracionDelToken('no-es-un-jwt')).toBeNull()
    expect(
      crearSesion({
        accessToken: 'no-es-un-jwt',
        tipo: 'Bearer',
        usuario: 'vendedor1',
        nombre: 'Vendedor',
        rol: 'VENTAS',
        aplicacion: 'CRM',
      }),
    ).toBeNull()
  })

  it('guarda y lee una sesión vigente', () => {
    const sesion = crearSesion({
      accessToken: tokenDePrueba(),
      tipo: 'Bearer',
      usuario: 'vendedor1',
      nombre: 'Vendedor',
      rol: 'VENTAS',
      aplicacion: 'CRM',
    })!

    guardarSesion(sesion)

    expect(leerSesion()).toEqual(sesion)
  })

  it('descarta y borra una sesión vencida', () => {
    guardarSesion({
      token: tokenDePrueba(),
      usuario: 'vendedor1',
      nombre: 'Vendedor',
      rol: 'VENTAS',
      expira: Date.now() - 1000,
    })

    expect(leerSesion()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('borra la sesión', () => {
    guardarSesion({
      token: tokenDePrueba(),
      usuario: 'vendedor1',
      nombre: 'Vendedor',
      rol: 'VENTAS',
      expira: Date.now() + 60_000,
    })

    borrarSesion()

    expect(leerSesion()).toBeNull()
  })
})
