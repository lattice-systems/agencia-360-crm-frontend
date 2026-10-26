import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { iniciarSesion } from '../api/acceso.ts'
import { mensajeDeError } from '../api/cliente.ts'
import { CampoContrasena } from '../componentes/CampoContrasena.tsx'
import { useSesion } from '../sesion/useSesion.ts'

/** Inicio de sesión del CRM (CRM-0.1), con la forma del bloque login-03 de shadcn. */
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
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-muted p-6 md:p-10">
      {/*
       * Foto de un showroom Nissan (Unsplash, licencia libre, sin atribución
       * obligatoria: unsplash.com/photos/RVEdgp-dkYY). El velo oscuro deja
       * legibles el logo blanco y el aviso de abajo.
       */}
      <img
        src="/fondo-login.jpg"
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/55" />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <img
          src="/agencia360-logo-blanco.svg"
          alt="Agencia360"
          className="h-auto w-44 self-center"
        />
        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              <h1>Iniciar sesión</h1>
            </CardTitle>
            <CardDescription>Accede a Agencia360 · CRM</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviar} noValidate>
              <FieldGroup>
                {aviso && (
                  <Alert variant="warning" role="status">
                    <AlertDescription>{aviso}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="usuario">Usuario</FieldLabel>
                  <Input
                    id="usuario"
                    name="usuario"
                    autoComplete="username"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="contrasena">Contraseña</FieldLabel>
                  <CampoContrasena
                    id="contrasena"
                    name="contrasena"
                    autoComplete="current-password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                  />
                </Field>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <Button type="submit" disabled={enviando}>
                    {enviando ? 'Entrando…' : 'Entrar al CRM'}
                  </Button>
                  <FieldDescription className="text-center">
                    Si necesitas acceso, contacta al gerente de marketing de tu agencia.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center text-white/80">
          Acceso exclusivo para personal autorizado.
        </FieldDescription>
      </div>
    </main>
  )
}
