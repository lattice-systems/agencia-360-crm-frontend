import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ErrorApi } from '../api/cliente.ts'
import { useMensajeDeError } from '../api/useConsulta.ts'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { hayContactoRepetido, registrarProspecto } from './api.ts'
import { EtapaChip } from './EtapaChip.tsx'
import { soloDigitos } from './formato.ts'

// CRM-1.0: nombre obligatorio y además teléfono o correo. El teléfono es de
// México a 10 dígitos (decisión del PO); se acepta con espacios o guiones.
const esquema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Escribe el nombre completo.')
      .max(120, 'Usa hasta 120 caracteres.'),
    telefono: z
      .string()
      .transform(soloDigitos)
      .refine((t) => t === '' || /^\d{10}$/.test(t), 'El teléfono debe tener 10 dígitos.'),
    correo: z
      .string()
      .trim()
      .refine((c) => c === '' || z.email().safeParse(c).success, 'Escribe un correo válido.'),
  })
  .refine((d) => d.telefono !== '' || d.correo !== '', {
    path: ['telefono'],
    message: 'Escribe al menos un teléfono o un correo.',
  })

type Formulario = z.input<typeof esquema>
type Datos = z.output<typeof esquema>

const VACIO: Formulario = { nombre: '', telefono: '', correo: '' }

const ESPERA_REVISION_MS = 400

/** Contacto completo que ya se puede comparar con los prospectos existentes. */
function contactoParaRevisar(telefono: string, correo: string) {
  const digitos = soloDigitos(telefono)
  const correoLimpio = correo.trim()
  return {
    telefono: /^\d{10}$/.test(digitos) ? digitos : undefined,
    correo: z.email().safeParse(correoLimpio).success ? correoLimpio : undefined,
  }
}

/**
 * Registro de prospecto (CRM-1.0, mockups pp. 15 y 18). Avisa mientras se
 * captura si el teléfono o el correo ya existen, sin decir de quién son; por
 * decisión del PO se puede registrar de todos modos.
 */
function RegistroProspectoForm() {
  const navegar = useNavigate()
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [revision, setRevision] = useState({ clave: '', repetido: false })
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Datos>({
    resolver: zodResolver(esquema),
    defaultValues: VACIO,
  })

  const [telefono, correo] = useWatch({ control, name: ['telefono', 'correo'] })
  const contacto = contactoParaRevisar(telefono ?? '', correo ?? '')
  const clave = `${contacto.telefono ?? ''}|${contacto.correo ?? ''}`
  // El aviso solo aplica al contacto que se revisó; si cambia, se vuelve a revisar.
  const contactoRepetido = revision.clave === clave && revision.repetido

  useEffect(() => {
    if (!contacto.telefono && !contacto.correo) return
    let vigente = true
    const temporizador = setTimeout(() => {
      hayContactoRepetido(contacto)
        .then((repetido) => vigente && setRevision({ clave, repetido }))
        // Si la revisión falla, el registro sigue funcionando sin el aviso.
        .catch(() => {})
    }, ESPERA_REVISION_MS)
    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
    // La clave resume el teléfono y el correo que se revisan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  async function registrar(datos: Datos) {
    setErrorApi(null)
    try {
      const creado = await registrarProspecto({
        nombre: datos.nombre,
        ...(datos.telefono && { telefono: datos.telefono }),
        ...(datos.correo && { correo: datos.correo }),
      })
      toast.success(`Se registró a ${creado.nombre} en la etapa Primer contacto.`)
      navegar('/prospectos')
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje === null) return
      setErrorApi(
        e instanceof ErrorApi && e.status === 0
          ? 'Revisa tu conexión e intenta de nuevo. Tus datos siguen aquí.'
          : mensaje,
      )
    }
  }

  const ayudaContacto = 'contacto-ayuda'

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Registrar prospecto"
      />

      <Card>
        <form noValidate onSubmit={handleSubmit(registrar)} className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Información de contacto</CardTitle>
            <CardDescription>Escribe el nombre y al menos un medio de contacto.</CardDescription>
          </CardHeader>

          <CardContent>
            <FieldGroup className="gap-5">
              {errorApi && (
                <Alert variant="destructive">
                  <AlertTitle>No se pudo registrar el prospecto</AlertTitle>
                  <AlertDescription>{errorApi}</AlertDescription>
                </Alert>
              )}

              <Field data-invalid={!!errors.nombre}>
                <FieldLabel htmlFor="prospecto-nombre">
                  Nombre completo
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="prospecto-nombre"
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={!!errors.nombre}
                  aria-describedby={errors.nombre ? 'prospecto-nombre-error' : undefined}
                  {...register('nombre')}
                />
                <FieldError id="prospecto-nombre-error" errors={[errors.nombre]} />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={!!errors.telefono}>
                  <FieldLabel htmlFor="prospecto-telefono">Teléfono</FieldLabel>
                  <Input
                    id="prospecto-telefono"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="477 555 0101"
                    aria-invalid={!!errors.telefono}
                    aria-describedby={
                      errors.telefono
                        ? `${ayudaContacto} prospecto-telefono-error`
                        : ayudaContacto
                    }
                    {...register('telefono')}
                  />
                  <FieldError id="prospecto-telefono-error" errors={[errors.telefono]} />
                </Field>
                <Field data-invalid={!!errors.correo}>
                  <FieldLabel htmlFor="prospecto-correo">Correo</FieldLabel>
                  <Input
                    id="prospecto-correo"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Correo electrónico"
                    aria-invalid={!!errors.correo}
                    aria-describedby={
                      errors.correo ? `${ayudaContacto} prospecto-correo-error` : ayudaContacto
                    }
                    {...register('correo')}
                  />
                  <FieldError id="prospecto-correo-error" errors={[errors.correo]} />
                </Field>
              </div>
              <FieldDescription id={ayudaContacto} className="-mt-3">
                Puedes completar solo teléfono o correo.
              </FieldDescription>

              {contactoRepetido && (
                <Alert variant="advertencia" role="status">
                  <TriangleAlert aria-hidden="true" />
                  <AlertTitle>Este contacto ya existe</AlertTitle>
                  <AlertDescription>
                    Ya hay otro prospecto con este teléfono o correo. Puedes registrarlo de
                    todos modos.
                  </AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex flex-col-reverse items-stretch gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              Etapa inicial
              <EtapaChip etapa="PRIMER_CONTACTO" />
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="outline" asChild>
                <Link to="/prospectos">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando…' : 'Registrar prospecto'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </section>
  )
}

export default RegistroProspectoForm
