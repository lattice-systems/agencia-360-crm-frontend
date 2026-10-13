import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { iniciarSesion } from '../api/acceso.ts'
import { mensajeDeError } from '../api/cliente.ts'
import { useSesion } from '../sesion/useSesion.ts'

export function LoginPage() {
  const { sesion, aviso, iniciar } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'

  if (sesion) {
    return <Navigate to={destino} replace />
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!usuario.trim() || !contrasena) {
      setError('Escribe tu usuario y tu contraseña.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const respuesta = await iniciarSesion(usuario.trim(), contrasena)
      if (iniciar(respuesta)) {
        navegar(destino, { replace: true })
      } else {
        setError('La respuesta del servidor no es válida. Intenta de nuevo.')
      }
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <form className="tarjeta-login" onSubmit={enviar} noValidate>
        <h1>Agencia360 · CRM</h1>
        <p className="ayuda">Inicia sesión con tu cuenta del CRM.</p>
        {aviso && (
          <p role="status" className="aviso aviso-duplicado">
            {aviso}
          </p>
        )}
        <label htmlFor="usuario">Usuario</label>
        <input
          id="usuario"
          name="usuario"
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <label htmlFor="contrasena">Contraseña</label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        {error && (
          <p role="alert" className="aviso aviso-error">
            {error}
          </p>
        )}
        <button type="submit" className="boton-primario" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  )
}
