import { CircleAlert, Clock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { iniciarSesion } from '../api/acceso.ts'
import { mensajeDeError } from '../api/cliente.ts'
import { CampoContrasena } from '../componentes/CampoContrasena.tsx'
import { SelectorTema } from '../componentes/SelectorTema.tsx'
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
  // Tras un intento con campos vacíos, marca en rojo los que faltan.
  const [validar, setValidar] = useState(false)

  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'

  if (sesion) {
    return <Navigate to={destino} replace />
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!usuario.trim() || !contrasena) {
      setValidar(true)
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

  const faltaUsuario = validar && !usuario.trim()
  const faltaContrasena = validar && !contrasena

  return (
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-muted p-6 md:p-10">
      {/*
       * Foto de un showroom Nissan (Unsplash, licencia libre, sin atribución
       * obligatoria: unsplash.com/photos/RVEdgp-dkYY). El velo oscuro deja
       * legibles el selector de tema y el aviso de abajo.
       */}
      <img
        src="/fondo-login.jpg"
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/55" />
      <SelectorTema className="absolute top-4 right-4" />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <img
              src="/agencia360-logo.svg"
              alt="Agencia360"
              className="mx-auto h-auto w-40 dark:hidden"
            />
            <img
              src="/agencia360-logo-blanco.svg"
              alt="Agencia360"
              className="mx-auto hidden h-auto w-40 dark:block"
            />
            <Badge variant="secondary" className="mx-auto mb-2">
              CRM CareCar
            </Badge>
            <CardTitle>
              <h1>Iniciar sesión</h1>
            </CardTitle>
            <CardDescription>Usa tu usuario de la agencia.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviar} noValidate>
              <FieldGroup>
                {aviso && (
                  <Alert variant="warning" role="status">
                    <Clock aria-hidden="true" />
                    <AlertDescription>{aviso}</AlertDescription>
                  </Alert>
                )}
                <Field data-invalid={faltaUsuario || undefined}>
                  <FieldLabel htmlFor="usuario">Usuario</FieldLabel>
                  <Input
                    id="usuario"
                    name="usuario"
                    autoComplete="username"
                    aria-invalid={faltaUsuario || undefined}
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                  />
                </Field>
                <Field data-invalid={faltaContrasena || undefined}>
                  <FieldLabel htmlFor="contrasena">Contraseña</FieldLabel>
                  <CampoContrasena
                    id="contrasena"
                    name="contrasena"
                    autoComplete="current-password"
                    aria-invalid={faltaContrasena || undefined}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                  />
                </Field>
                {error && (
                  <Alert variant="destructive">
                    <CircleAlert aria-hidden="true" />
                    <AlertTitle>No pudimos iniciar sesión</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <Button type="submit" disabled={enviando}>
                    {enviando && (
                      <Spinner aria-hidden="true" role={undefined} data-icon="inline-start" />
                    )}
                    {enviando ? 'Entrando…' : 'Entrar'}
                  </Button>
                  <FieldDescription className="text-center">
                    ¿Sin acceso? Pídelo a tu gerente.
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
