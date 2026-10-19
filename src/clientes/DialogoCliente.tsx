import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ErrorApi } from '../api/cliente.ts'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { ChipEstado } from '../componentes/ChipEstado.tsx'
import {
  abrirCuentaApp,
  activarCuentaApp,
  asignarVehiculo,
  desactivarCuentaApp,
  obtenerCliente,
  obtenerCuentaApp,
  type ClienteDetalle,
  type ClienteResumen,
  type CuentaApp,
} from './api.ts'

const SIN_CORREO = 'Sin correo (no usa la app)'

/**
 * Detalle de un cliente para el Gerente de marketing: su cuenta de la app y sus
 * vehículos (CRM-1.3 y CRM-1.5).
 */
export function DialogoCliente({
  cliente,
  onCerrar,
  onActualizado,
}: {
  cliente: ClienteResumen | null
  onCerrar: () => void
  onActualizado: (cliente: ClienteDetalle) => void
}) {
  return (
    <Dialog open={cliente !== null} onOpenChange={(abrir) => !abrir && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">{cliente?.nombre}</DialogTitle>
          <DialogDescription>{cliente?.correo ?? SIN_CORREO}</DialogDescription>
        </DialogHeader>
        {cliente && (
          <DetalleCliente clienteId={cliente.id} onActualizado={onActualizado} />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface Detalle {
  cliente: ClienteDetalle
  cuenta: CuentaApp
}

function DetalleCliente({
  clienteId,
  onActualizado,
}: {
  clienteId: number
  onActualizado: (cliente: ClienteDetalle) => void
}) {
  const consulta = useCallback(
    async (): Promise<Detalle> => {
      const [cliente, cuenta] = await Promise.all([
        obtenerCliente(clienteId),
        obtenerCuentaApp(clienteId),
      ])
      return { cliente, cuenta }
    },
    [clienteId],
  )
  const { datos, cargando, error, actualizar } = useConsulta(consulta)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (cargando || !datos) {
    return <p className="text-sm text-muted-foreground">Cargando cliente…</p>
  }
  return (
    <div className="flex flex-col gap-6">
      <SeccionCuenta
        cliente={datos.cliente}
        cuenta={datos.cuenta}
        onCambio={(cuenta) => actualizar((actual) => ({ ...actual!, cuenta }))}
      />
      <SeccionVehiculos
        cliente={datos.cliente}
        onAsignado={(cliente) => {
          actualizar((actual) => ({ ...actual!, cliente }))
          onActualizado(cliente)
        }}
      />
    </div>
  )
}

const TEXTO_ESTADO: Record<CuentaApp['estado'], string> = {
  SIN_CUENTA: 'Sin cuenta',
  ACTIVA: 'Activa',
  DESACTIVADA: 'Desactivada',
}

function SeccionCuenta({
  cliente,
  cuenta,
  onCambio,
}: {
  cliente: ClienteDetalle
  cuenta: CuentaApp
  onCambio: (cuenta: CuentaApp) => void
}) {
  const mensajeDeError = useMensajeDeError()
  const [guardando, setGuardando] = useState(false)

  async function ejecutar(accion: () => Promise<CuentaApp>, aviso: string) {
    setGuardando(true)
    try {
      onCambio(await accion())
      toast.success(aviso)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje) toast.error(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  const tono =
    cuenta.estado === 'ACTIVA' ? 'exito' : cuenta.estado === 'DESACTIVADA' ? 'peligro' : 'neutro'

  return (
    <section aria-labelledby="titulo-cuenta" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="titulo-cuenta" className="font-semibold text-primary">
          Cuenta de la app
        </h3>
        <ChipEstado tono={tono}>{TEXTO_ESTADO[cuenta.estado]}</ChipEstado>
      </div>
      {cuenta.estado === 'SIN_CUENTA' && !cliente.correo && (
        <p className="text-sm text-muted-foreground">
          Sin correo no puede usar la app.
        </p>
      )}
      {cuenta.estado === 'SIN_CUENTA' && cliente.correo && (
        <Button
          disabled={guardando}
          onClick={() =>
            ejecutar(
              () => abrirCuentaApp(cliente.id),
              `Cuenta creada. Se envió la contraseña temporal a ${cliente.correo}.`,
            )
          }
        >
          Crear cuenta de la app
        </Button>
      )}
      {cuenta.estado === 'ACTIVA' && (
        <>
          {cuenta.debeCambiarContrasena && (
            <p className="text-sm text-muted-foreground">
              El cliente aún no entra por primera vez.
            </p>
          )}
          <Button
            variant="outline"
            disabled={guardando}
            onClick={() =>
              ejecutar(() => desactivarCuentaApp(cliente.id), 'Cuenta desactivada.')
            }
          >
            Desactivar cuenta
          </Button>
        </>
      )}
      {cuenta.estado === 'DESACTIVADA' && (
        <Button
          variant="outline"
          disabled={guardando}
          onClick={() =>
            ejecutar(() => activarCuentaApp(cliente.id), 'Cuenta reactivada.')
          }
        >
          Reactivar cuenta
        </Button>
      )}
    </section>
  )
}

const esquemaVehiculo = z.object({
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'El VIN tiene 17 caracteres, sin I, O ni Q.'),
  modelo: z.string().trim().min(1, 'Escribe el modelo.').max(80, 'Usa hasta 80 caracteres.'),
  anio: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Escribe el año con 4 dígitos.')
    .transform(Number)
    .refine((a) => a >= 1900, 'El año debe ser 1900 o posterior.'),
})

type FormularioVehiculo = z.input<typeof esquemaVehiculo>

const VEHICULO_VACIO: FormularioVehiculo = { vin: '', modelo: '', anio: '' }

function SeccionVehiculos({
  cliente,
  onAsignado,
}: {
  cliente: ClienteDetalle
  onAsignado: (cliente: ClienteDetalle) => void
}) {
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<FormularioVehiculo, unknown, z.output<typeof esquemaVehiculo>>({
    resolver: zodResolver(esquemaVehiculo),
    defaultValues: VEHICULO_VACIO,
  })

  async function guardar(datos: z.output<typeof esquemaVehiculo>) {
    setErrorApi(null)
    try {
      const actualizado = await asignarVehiculo(cliente.id, datos)
      reset(VEHICULO_VACIO)
      onAsignado(actualizado)
      toast.success(`Se asignó el ${datos.modelo} ${datos.anio} a ${cliente.nombre}.`)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje === null) return
      if (e instanceof ErrorApi && e.status === 409) {
        setError('vin', { message: mensaje }, { shouldFocus: true })
      } else {
        setErrorApi(mensaje)
      }
    }
  }

  return (
    <section aria-labelledby="titulo-vehiculos" className="flex flex-col gap-3">
      <h3 id="titulo-vehiculos" className="font-semibold text-primary">
        Vehículos
      </h3>
      {cliente.vehiculos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este cliente todavía no tiene vehículos.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cliente.vehiculos.map((v) => (
            <li key={v.id} className="rounded-md border p-3">
              <p className="font-medium">
                {v.modelo} {v.anio}
              </p>
              <p className="font-mono text-xs text-muted-foreground">VIN {v.vin}</p>
              <p className="text-sm text-muted-foreground">
                {v.placas ? `Placas ${v.placas}` : 'Sin placas registradas'}
                {v.kilometraje !== null &&
                  ` · ${v.kilometraje.toLocaleString('es-MX')} km`}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        aria-label="Asignar vehículo"
        onSubmit={handleSubmit(guardar)}
        className="flex flex-col gap-3 rounded-md border border-dashed p-3"
      >
        {errorApi && (
          <Alert variant="destructive">
            <AlertDescription>{errorApi}</AlertDescription>
          </Alert>
        )}
        <Controller
          control={control}
          name="vin"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="vehiculo-vin">VIN</FieldLabel>
              <Input
                {...field}
                id="vehiculo-vin"
                className="font-mono uppercase"
                maxLength={17}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'vehiculo-vin-error' : undefined}
              />
              <FieldError id="vehiculo-vin-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <Controller
            control={control}
            name="modelo"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="vehiculo-modelo">Modelo</FieldLabel>
                <Input
                  {...field}
                  id="vehiculo-modelo"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? 'vehiculo-modelo-error' : undefined}
                />
                <FieldError id="vehiculo-modelo-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="anio"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="vehiculo-anio">Año</FieldLabel>
                <Input
                  {...field}
                  id="vehiculo-anio"
                  inputMode="numeric"
                  maxLength={4}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? 'vehiculo-anio-error' : undefined}
                />
                <FieldError id="vehiculo-anio-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Asignar vehículo'}
        </Button>
      </form>
    </section>
  )
}
