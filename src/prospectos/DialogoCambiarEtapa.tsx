import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useMensajeDeError } from '../api/useConsulta.ts'
import { cambiarEtapa } from './api.ts'
import { EtapaChip } from './EtapaChip.tsx'
import { HistorialEtapas } from './HistorialEtapas.tsx'
import {
  etapasDestinoDelVendedor,
  NOMBRES_ETAPA,
  type Etapa,
  type Prospecto,
} from './tipos.ts'

interface Props {
  /** Prospecto en Primer contacto, Visita o Cotización; con null está cerrado. */
  prospecto: Prospecto | null
  onCerrar: () => void
  onCambiado: (prospecto: Prospecto) => void
}

const SIN_ETAPA = 'Elige la nueva etapa.'
const SIN_MOTIVO = 'Escribe el motivo de cierre.'

/**
 * Cambio de etapa con confirmación explícita (CRM-1.1, mockup p. 16). Desde las
 * tres primeras etapas el vendedor puede ir a cualquiera de ellas, a Pago o a
 * Cerrado; al cerrar el motivo es obligatorio (decisión del PO).
 */
export function DialogoCambiarEtapa({ prospecto, onCerrar, onCambiado }: Props) {
  const mensajeDeError = useMensajeDeError()
  const [etapa, setEtapa] = useState<Etapa | ''>('')
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<{ etapa?: string; motivo?: string }>({})
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [abiertoPara, setAbiertoPara] = useState<number | null>(null)

  // Al abrir para otro prospecto se limpia lo capturado antes.
  if (prospecto && abiertoPara !== prospecto.id) {
    setAbiertoPara(prospecto.id)
    setEtapa('')
    setMotivo('')
    setErrores({})
    setErrorApi(null)
  }

  function cerrar() {
    setAbiertoPara(null)
    onCerrar()
  }

  async function guardar() {
    if (!prospecto) return
    const nuevosErrores = {
      etapa: etapa ? undefined : SIN_ETAPA,
      motivo: etapa === 'CERRADO' && !motivo.trim() ? SIN_MOTIVO : undefined,
    }
    setErrores(nuevosErrores)
    if (nuevosErrores.etapa || nuevosErrores.motivo || !etapa) return

    setGuardando(true)
    setErrorApi(null)
    try {
      const actualizado = await cambiarEtapa(
        prospecto.id,
        etapa,
        etapa === 'CERRADO' ? motivo.trim() : undefined,
      )
      setAbiertoPara(null)
      onCambiado(actualizado)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) setErrorApi(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={prospecto !== null} onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">Cambiar etapa</DialogTitle>
          <DialogDescription>
            <span className="block text-base font-semibold text-primary">
              {prospecto?.nombre}
            </span>
            El cambio quedará registrado con fecha y hora.
          </DialogDescription>
        </DialogHeader>

        {prospecto && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              Etapa actual
              <EtapaChip etapa={prospecto.etapa} />
            </div>

            <Field data-invalid={!!errores.etapa}>
              <FieldLabel htmlFor="nueva-etapa">Nueva etapa</FieldLabel>
              <Select
                value={etapa}
                onValueChange={(valor) => {
                  setEtapa(valor as Etapa)
                  setErrores({})
                }}
              >
                <SelectTrigger
                  id="nueva-etapa"
                  className="w-full"
                  aria-invalid={!!errores.etapa || undefined}
                  aria-describedby={errores.etapa ? 'nueva-etapa-error' : undefined}
                >
                  <SelectValue placeholder="Selecciona una etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapasDestinoDelVendedor(prospecto.etapa).map((destino) => (
                    <SelectItem key={destino} value={destino}>
                      {NOMBRES_ETAPA[destino]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                id="nueva-etapa-error"
                errors={errores.etapa ? [{ message: errores.etapa }] : []}
              />
            </Field>

            {etapa === 'CERRADO' && (
              <Field data-invalid={!!errores.motivo}>
                <FieldLabel htmlFor="motivo-cierre">Motivo de cierre</FieldLabel>
                <Textarea
                  id="motivo-cierre"
                  value={motivo}
                  maxLength={200}
                  rows={3}
                  onChange={(e) => setMotivo(e.target.value)}
                  aria-invalid={!!errores.motivo || undefined}
                  aria-describedby={
                    errores.motivo
                      ? 'motivo-cierre-ayuda motivo-cierre-error'
                      : 'motivo-cierre-ayuda'
                  }
                />
                <FieldDescription id="motivo-cierre-ayuda">
                  Un prospecto cerrado ya no cambia de etapa.
                </FieldDescription>
                <FieldError
                  id="motivo-cierre-error"
                  errors={errores.motivo ? [{ message: errores.motivo }] : []}
                />
              </Field>
            )}

            {errorApi && (
              <Alert variant="destructive">
                <AlertDescription>{errorApi}</AlertDescription>
              </Alert>
            )}

            <HistorialEtapas prospectoId={prospecto.id} />
            <p className="text-xs text-muted-foreground">
              La fecha del cambio se genera al guardar.
            </p>
          </div>
        )}

        <Separator />
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar etapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
