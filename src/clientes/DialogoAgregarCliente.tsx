import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, type Control } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { soloDigitos } from '../prospectos/formato.ts'
import { registrarCliente, type ClienteDetalle } from './api.ts'

const esquema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre completo.')
    .max(120, 'Usa hasta 120 caracteres.'),
  correo: z
    .string()
    .trim()
    .refine((c) => c === '' || z.email().safeParse(c).success, 'Escribe un correo válido.'),
  telefono: z
    .string()
    .transform(soloDigitos)
    .refine((t) => t === '' || /^\d{10}$/.test(t), 'El teléfono debe tener 10 dígitos.'),
})

type Formulario = z.input<typeof esquema>
type Campo = keyof Formulario

const VACIO: Formulario = { nombre: '', correo: '', telefono: '' }

/**
 * Alta manual de un cliente (CRM-1.3). Es para casos especiales: normalmente
 * el cliente se crea solo cuando su prospecto llega a Finalizado.
 */
export function DialogoAgregarCliente({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean
  onCerrar: () => void
  onCreado: (cliente: ClienteDetalle) => void
}) {
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting },
  } = useForm<Formulario, unknown, z.output<typeof esquema>>({
    resolver: zodResolver(esquema),
    defaultValues: VACIO,
  })

  function cerrar() {
    reset(VACIO)
    setErrorApi(null)
    onCerrar()
  }

  async function guardar(datos: z.output<typeof esquema>) {
    setErrorApi(null)
    try {
      const creado = await registrarCliente({
        nombre: datos.nombre,
        correo: datos.correo || undefined,
        telefono: datos.telefono || undefined,
      })
      reset(VACIO)
      onCreado(creado)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje === null) return
      if (e instanceof ErrorApi && e.status === 409) {
        setError('correo', { message: mensaje }, { shouldFocus: true })
      } else {
        setErrorApi(mensaje)
      }
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">Agregar cliente</DialogTitle>
          <DialogDescription>
            Para casos especiales. Los clientes se registran solos cuando su
            prospecto llega a Finalizado.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(guardar)} className="flex flex-col gap-6">
          <FieldGroup className="gap-4">
            {errorApi && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo agregar el cliente</AlertTitle>
                <AlertDescription>{errorApi}</AlertDescription>
              </Alert>
            )}
            <CampoTexto control={control} nombre="nombre" etiqueta="Nombre completo" autoComplete="name" />
            <CampoTexto
              control={control}
              nombre="correo"
              etiqueta="Correo (opcional)"
              autoComplete="email"
              tipo="email"
              ayuda="Con este correo entra a la app. Sin correo no puede usarla."
            />
            <CampoTexto
              control={control}
              nombre="telefono"
              etiqueta="Teléfono (opcional)"
              autoComplete="tel"
              tipo="tel"
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Agregar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CampoTexto({
  control,
  nombre,
  etiqueta,
  autoComplete,
  tipo = 'text',
  ayuda,
}: {
  control: Control<Formulario, unknown, z.output<typeof esquema>>
  nombre: Campo
  etiqueta: string
  autoComplete: string
  tipo?: string
  ayuda?: string
}) {
  const id = `cliente-${nombre}`
  return (
    <Controller
      control={control}
      name={nombre}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
          <Input
            {...field}
            id={id}
            type={tipo}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              [ayuda && `${id}-ayuda`, fieldState.error && `${id}-error`]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
          {ayuda && <FieldDescription id={`${id}-ayuda`}>{ayuda}</FieldDescription>}
          <FieldError id={`${id}-error`} errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
