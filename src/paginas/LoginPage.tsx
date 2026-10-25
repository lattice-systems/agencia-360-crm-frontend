import { ClipboardList, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { iniciarSesion } from '../api/acceso.ts'
import { mensajeDeError } from '../api/cliente.ts'
import { CampoContrasena } from '../componentes/CampoContrasena.tsx'
import { useSesion } from '../sesion/useSesion.ts'

const BENEFICIOS: { icono: LucideIcon; texto: string }[] = [
  { icono: Users, texto: 'Prospectos a tu alcance' },
  { icono: ClipboardList, texto: 'Seguimiento por etapas' },
  { icono: ShieldCheck, texto: 'Información según tu rol' },
]

/** Inicio de sesión del CRM (CRM-0.1): panel de marca a la izquierda y formulario. */
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
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <aside className="hidden flex-col bg-muted p-12 lg:flex">
        <img src="/agencia360-logo.svg" alt="Agencia360" className="h-auto w-[240px]" />
        <Badge variant="outline" className="mt-8">
          Agencia360 · CRM
        </Badge>
        <p className="mt-8 text-4xl font-bold">Todo en su lugar.</p>
        <p className="mt-4 max-w-sm text-xl text-muted-foreground">
          Gestiona tus prospectos y da continuidad a cada contacto.
        </p>
        <Separator className="my-10 max-w-md" />
        <ul className="flex flex-col gap-6">
          {BENEFICIOS.map(({ icono: Icono, texto }) => (
            <li key={texto} className="flex items-center gap-3 text-lg">
              <Icono aria-hidden="true" className="size-5" />
              {texto}
            </li>
          ))}
        </ul>
        <p className="mt-auto text-sm text-muted-foreground">
          Una identidad. Cada área conectada.
        </p>
      </aside>

      <div className="flex flex-col px-4 py-10 sm:px-10 lg:px-16">
        <div className="my-auto w-full max-w-md lg:mx-auto">
          <img
            src="/agencia360-logo.svg"
            alt="Agencia360"
            className="mb-10 h-auto w-[200px] lg:hidden"
          />
          <h1 className="text-3xl font-bold">Iniciar sesión</h1>
          <p className="mt-2 text-muted-foreground">Accede a Agencia360 · CRM</p>

          <form onSubmit={enviar} noValidate className="mt-8">
            <FieldGroup className="gap-5">
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
              <Button type="submit" size="lg" className="mt-2 w-full" disabled={enviando}>
                {enviando ? 'Entrando…' : 'Entrar al CRM'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Si necesitas acceso, contacta al gerente de marketing de tu agencia.
              </p>
            </FieldGroup>
          </form>
        </div>
        <p className="mt-10 text-xs text-muted-foreground lg:mx-auto lg:w-full lg:max-w-md">
          Acceso exclusivo para personal autorizado.
        </p>
      </div>
    </main>
  )
}
