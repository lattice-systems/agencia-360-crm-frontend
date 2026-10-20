import { Clock } from 'lucide-react'
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
import { EtapaChip } from './EtapaChip.tsx'
import { HistorialEtapas } from './HistorialEtapas.tsx'
import { NOMBRES_MOTIVO, RESPONSABLE_DE_ETAPA, type Prospecto } from './tipos.ts'

interface Props {
  /** Con null el diálogo está cerrado. */
  prospecto: Prospecto | null
  onCerrar: () => void
}

/**
 * Detalle de la etapa y su historial, sin cambiar nada. Lo usan el Gerente de
 * marketing y el vendedor cuando la etapa ya no le corresponde.
 */
export function DialogoHistorial({ prospecto, onCerrar }: Props) {
  const responsable = prospecto && RESPONSABLE_DE_ETAPA[prospecto.etapa]

  return (
    <Dialog open={prospecto !== null} onOpenChange={(abrir) => !abrir && onCerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">Historial de etapas</DialogTitle>
          <DialogDescription>
            <span className="block text-base font-semibold text-primary">
              {prospecto?.nombre}
            </span>
            Cada cambio se registra con fecha y hora.
          </DialogDescription>
        </DialogHeader>
        {prospecto && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              Etapa actual
              <EtapaChip etapa={prospecto.etapa} />
            </div>
            {responsable && (
              <Alert variant="informacion" role="note">
                <Clock aria-hidden="true" />
                <AlertDescription>
                  Avanza cuando {responsable.charAt(0).toLowerCase() + responsable.slice(1)}.
                </AlertDescription>
              </Alert>
            )}
            {prospecto.etapa === 'CERRADO' && prospecto.motivoCierre && (
              <p className="text-sm">
                <span className="font-medium">Motivo de cierre:</span>{' '}
                {NOMBRES_MOTIVO[prospecto.motivoCierre]}
              </p>
            )}
            <HistorialEtapas prospectoId={prospecto.id} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
