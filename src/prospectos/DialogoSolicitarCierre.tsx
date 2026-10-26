import { Info } from 'lucide-react'
import { useState } from 'react'
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
import { useMensajeDeError } from '../api/useConsulta.ts'
import { solicitarCierre } from './api.ts'
import { EtapaChip } from './EtapaChip.tsx'
import { SelectorMotivoCierre } from './SelectorMotivoCierre.tsx'
import type { MotivoCierre, Prospecto } from './tipos.ts'

interface Props {
  /** Prospecto en Pago, Facturación o Entrega; con null está cerrado. */
  prospecto: Prospecto | null
  onCerrar: () => void
  onSolicitado: (prospecto: Prospecto) => void
}

const SIN_MOTIVO = 'Elige el motivo de cierre.'

/**
 * Desde Pago en adelante el vendedor no cierra el prospecto: envía una
 * solicitud con uno de los motivos fijos (CRM-1.2) y el Administrador del ERP
 * decide (decisión del PO).
 */
export function DialogoSolicitarCierre({ prospecto, onCerrar, onSolicitado }: Props) {
  const mensajeDeError = useMensajeDeError()
  const [motivo, setMotivo] = useState<MotivoCierre | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [abiertoPara, setAbiertoPara] = useState<number | null>(null)

  if (prospecto && abiertoPara !== prospecto.id) {
    setAbiertoPara(prospecto.id)
    setMotivo(null)
    setError(null)
  }

  function cerrar() {
    setAbiertoPara(null)
    onCerrar()
  }

  async function enviar() {
    if (!prospecto) return
    if (!motivo) {
      setError(SIN_MOTIVO)
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await solicitarCierre(prospecto.id, motivo)
      setAbiertoPara(null)
      onSolicitado({ ...prospecto, cierrePendiente: true })
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) setError(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={prospecto !== null} onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar cierre</DialogTitle>
          <DialogDescription>
            <span className="block font-medium text-foreground">
              {prospecto?.nombre}
            </span>
            El Administrador revisará la solicitud y decidirá si se cierra.
          </DialogDescription>
        </DialogHeader>
        {prospecto && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              Etapa actual
              <EtapaChip etapa={prospecto.etapa} />
            </div>
            <SelectorMotivoCierre
              id="motivo-solicitud"
              valor={motivo}
              onCambiar={(elegido) => {
                setMotivo(elegido)
                setError(null)
              }}
              error={error === SIN_MOTIVO ? SIN_MOTIVO : undefined}
            />
            {error && error !== SIN_MOTIVO && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Alert role="note">
              <Info aria-hidden="true" />
              <AlertTitle>Requiere autorización</AlertTitle>
              <AlertDescription>
                El prospecto sigue en su etapa hasta que el Administrador apruebe la
                solicitud.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
