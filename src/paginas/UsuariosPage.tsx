import { useEffect, useState, type FormEvent } from 'react'
import {
  cambiarRol,
  crearUsuario,
  listarRoles,
  listarUsuarios,
  type Rol,
  type RolApi,
  type UsuarioApi,
} from '../api/acceso.ts'
import { mensajeDeError } from '../api/cliente.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

interface Formulario {
  usuario: string
  nombre: string
  contrasena: string
  rol: Rol | ''
}

const FORMULARIO_VACIO: Formulario = {
  usuario: '',
  nombre: '',
  contrasena: '',
  rol: '',
}

export function UsuariosPage() {
  const { sesion } = useSesion()
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([])
  const [roles, setRoles] = useState<RolApi[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        const [listaUsuarios, listaRoles] = await Promise.all([
          listarUsuarios(),
          listarRoles(),
        ])
        if (vigente) {
          setUsuarios(listaUsuarios)
          setRoles(listaRoles)
        }
      } catch (e) {
        if (vigente) {
          setError(mensajeDeError(e))
        }
      } finally {
        if (vigente) {
          setCargando(false)
        }
      }
    }
    void cargar()
    return () => {
      vigente = false
    }
  }, [])

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setConfirmacion(null)
    const { usuario, nombre, contrasena, rol } = formulario
    if (!usuario.trim() || !nombre.trim() || !contrasena || !rol) {
      setError('Completa usuario, nombre, contraseña y rol.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const creado = await crearUsuario({
        usuario: usuario.trim(),
        nombre: nombre.trim(),
        contrasena,
        rol,
      })
      setUsuarios((actuales) =>
        [...actuales, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      )
      setFormulario(FORMULARIO_VACIO)
      setConfirmacion(`Usuario ${creado.usuario} creado.`)
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setGuardando(false)
    }
  }

  async function actualizarRol(usuario: UsuarioApi, rol: Rol) {
    setConfirmacion(null)
    setError(null)
    try {
      const actualizado = await cambiarRol(usuario.id, rol)
      setUsuarios((actuales) =>
        actuales.map((u) => (u.id === actualizado.id ? actualizado : u)),
      )
      setConfirmacion(
        `El rol de ${actualizado.usuario} ahora es ${NOMBRE_ROL[actualizado.rol]}.`,
      )
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <section className="pagina usuarios">
      <h2>Usuarios</h2>
      {error && (
        <p role="alert" className="aviso aviso-error">
          {error}
        </p>
      )}
      {confirmacion && (
        <p role="status" className="aviso aviso-exito">
          {confirmacion}
        </p>
      )}

      <h3>Nuevo usuario</h3>
      <form className="formulario-usuario" onSubmit={crear} noValidate>
        <label>
          Usuario
          <input
            value={formulario.usuario}
            maxLength={50}
            onChange={(e) =>
              setFormulario({ ...formulario, usuario: e.target.value })
            }
          />
        </label>
        <label>
          Nombre
          <input
            value={formulario.nombre}
            maxLength={120}
            onChange={(e) =>
              setFormulario({ ...formulario, nombre: e.target.value })
            }
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={formulario.contrasena}
            maxLength={72}
            onChange={(e) =>
              setFormulario({ ...formulario, contrasena: e.target.value })
            }
          />
        </label>
        <label>
          Rol
          <select
            value={formulario.rol}
            onChange={(e) =>
              setFormulario({ ...formulario, rol: e.target.value as Rol | '' })
            }
          >
            <option value="">Selecciona un rol</option>
            {roles.map((rol) => (
              <option key={rol.nombre} value={rol.nombre}>
                {NOMBRE_ROL[rol.nombre]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="boton-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Crear usuario'}
        </button>
      </form>

      <h3>Usuarios del CRM</h3>
      {cargando ? (
        <p>Cargando usuarios…</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Nombre</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.usuario}</td>
                <td>{usuario.nombre}</td>
                <td>
                  <select
                    aria-label={`Rol de ${usuario.usuario}`}
                    value={usuario.rol}
                    disabled={usuario.usuario === sesion?.usuario}
                    title={
                      usuario.usuario === sesion?.usuario
                        ? 'No puedes cambiar tu propio rol'
                        : undefined
                    }
                    onChange={(e) =>
                      actualizarRol(usuario, e.target.value as Rol)
                    }
                  >
                    {roles.map((rol) => (
                      <option key={rol.nombre} value={rol.nombre}>
                        {NOMBRE_ROL[rol.nombre]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{usuario.activo ? 'Activo' : 'Inactivo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
