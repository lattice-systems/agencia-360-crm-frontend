import { http, HttpResponse } from 'msw'
import {
  URL_LOGIN,
  URL_ROLES,
  URL_USUARIOS,
  type NuevoUsuario,
  type Rol,
  type RolApi,
  type UsuarioApi,
} from '../api/acceso.ts'

// Simula el módulo de acceso del backend (login, usuarios y roles) para usar
// el CRM con `npm run dev` sin levantar el backend. Todas las cuentas de
// ejemplo usan la contraseña CONTRASENA_MOCK.

export const CONTRASENA_MOCK = 'Secreta123'

const ROLES_CRM: RolApi[] = [
  {
    nombre: 'GERENTE_MARKETING',
    descripcion: 'Administra el CRM',
    accesoErp: false,
    accesoCrm: true,
  },
  {
    nombre: 'VENTAS',
    descripcion: 'Registra prospectos y les da seguimiento',
    accesoErp: false,
    accesoCrm: true,
  },
]

const USUARIOS_INICIALES: readonly UsuarioApi[] = [
  {
    id: 1,
    usuario: 'vendedor1',
    nombre: 'Valeria Vendedora',
    rol: 'VENTAS',
    activo: true,
  },
  {
    id: 2,
    usuario: 'vendedor2',
    nombre: 'Víctor Vendedor',
    rol: 'VENTAS',
    activo: true,
  },
  {
    id: 10,
    usuario: 'gerente',
    nombre: 'Gabriela Gerente',
    rol: 'GERENTE_MARKETING',
    activo: true,
  },
  {
    id: 20,
    usuario: 'conta1',
    nombre: 'Carlos Contador',
    rol: 'CONTABILIDAD',
    activo: true,
  },
  {
    id: 30,
    usuario: 'caja1',
    nombre: 'Carla Cajera',
    rol: 'CAJA',
    activo: true,
  },
]

let usuarios: UsuarioApi[] = []

export function reiniciarUsuarios() {
  usuarios = USUARIOS_INICIALES.map((u) => ({ ...u }))
}

export function buscarUsuario(id: number): UsuarioApi | undefined {
  return usuarios.find((u) => u.id === id)
}

const tieneAccesoAlCrm = (rol: Rol) => ROLES_CRM.some((r) => r.nombre === rol)

function apiError(
  status: number,
  error: string,
  message: string,
  path: string,
) {
  return HttpResponse.json(
    { timestamp: new Date().toISOString(), status, error, message, path },
    { status },
  )
}

function base64url(valor: object): string {
  return btoa(JSON.stringify(valor))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/** JWT de ejemplo con los mismos claims que el backend (sub, uid, roles, exp); sin firma válida. */
export function tokenMock(
  usuario: UsuarioApi,
  segundosParaVencer = 3600,
): string {
  const exp = Math.floor(Date.now() / 1000) + segundosParaVencer
  return `${base64url({ alg: 'HS256' })}.${base64url({ sub: usuario.usuario, uid: usuario.id, roles: [usuario.rol], exp })}.firma`
}

export interface ActorMock {
  uid: number
  roles: Rol[]
}

/** Lee el uid y los roles del token de la petición, como lo haría el backend. */
export function actorDe(request: Request): ActorMock | null {
  const encabezado = request.headers.get('Authorization')
  if (!encabezado?.startsWith('Bearer ')) {
    return null
  }
  try {
    const carga = encabezado.slice('Bearer '.length).split('.')[1]
    const json = atob(carga.replace(/-/g, '+').replace(/_/g, '/'))
    const { uid, roles } = JSON.parse(json) as {
      uid?: unknown
      roles?: unknown
    }
    return typeof uid === 'number' && Array.isArray(roles)
      ? { uid, roles: roles as Rol[] }
      : null
  } catch {
    return null
  }
}

function soloGerente(request: Request, ruta: string) {
  const actor = actorDe(request)
  if (!actor) {
    return apiError(401, 'Unauthorized', 'Inicia sesión para continuar', ruta)
  }
  if (!actor.roles.includes('GERENTE_MARKETING')) {
    return apiError(403, 'Forbidden', 'Tu rol no administra usuarios', ruta)
  }
  return null
}

export const handlersAcceso = [
  http.post(URL_LOGIN, async ({ request }) => {
    const { usuario, contrasena } = (await request.json()) as {
      usuario?: string
      contrasena?: string
    }
    const encontrado = usuarios.find((u) => u.usuario === usuario && u.activo)
    if (!encontrado || contrasena !== CONTRASENA_MOCK) {
      return apiError(
        401,
        'Unauthorized',
        'Usuario o contraseña incorrectos',
        URL_LOGIN,
      )
    }
    if (!tieneAccesoAlCrm(encontrado.rol)) {
      return apiError(
        403,
        'Forbidden',
        'Tu rol no tiene acceso al CRM',
        URL_LOGIN,
      )
    }
    return HttpResponse.json({
      accessToken: tokenMock(encontrado),
      tipo: 'Bearer',
      usuario: encontrado.usuario,
      nombre: encontrado.nombre,
      rol: encontrado.rol,
      aplicacion: 'CRM',
    })
  }),

  http.get(
    URL_ROLES,
    ({ request }) =>
      soloGerente(request, URL_ROLES) ?? HttpResponse.json(ROLES_CRM),
  ),

  http.get(
    URL_USUARIOS,
    ({ request }) =>
      soloGerente(request, URL_USUARIOS) ??
      HttpResponse.json(usuarios.filter((u) => tieneAccesoAlCrm(u.rol))),
  ),

  http.post(URL_USUARIOS, async ({ request }) => {
    const rechazo = soloGerente(request, URL_USUARIOS)
    if (rechazo) {
      return rechazo
    }
    const nuevo = (await request.json()) as NuevoUsuario
    if (usuarios.some((u) => u.usuario === nuevo.usuario)) {
      return apiError(
        409,
        'Conflict',
        `Ya existe un usuario con el nombre de usuario ${nuevo.usuario}`,
        URL_USUARIOS,
      )
    }
    if (!tieneAccesoAlCrm(nuevo.rol)) {
      return apiError(
        403,
        'Forbidden',
        `No puedes asignar el rol ${nuevo.rol} desde el CRM`,
        URL_USUARIOS,
      )
    }
    const creado: UsuarioApi = {
      id: Math.max(...usuarios.map((u) => u.id)) + 1,
      usuario: nuevo.usuario,
      nombre: nuevo.nombre,
      rol: nuevo.rol,
      activo: true,
    }
    usuarios.push(creado)
    return HttpResponse.json(creado, { status: 201 })
  }),

  http.put(`${URL_USUARIOS}/:id/rol`, async ({ params, request }) => {
    const ruta = `${URL_USUARIOS}/${params.id}/rol`
    const rechazo = soloGerente(request, ruta)
    if (rechazo) {
      return rechazo
    }
    const usuario = usuarios.find(
      (u) => u.id === Number(params.id) && tieneAccesoAlCrm(u.rol),
    )
    if (!usuario) {
      return apiError(
        404,
        'Not Found',
        `No existe el usuario ${params.id}`,
        ruta,
      )
    }
    const { rol } = (await request.json()) as { rol: Rol }
    if (!tieneAccesoAlCrm(rol)) {
      return apiError(
        403,
        'Forbidden',
        `No puedes asignar el rol ${rol} desde el CRM`,
        ruta,
      )
    }
    usuario.rol = rol
    return HttpResponse.json(usuario)
  }),
]

reiniciarUsuarios()
