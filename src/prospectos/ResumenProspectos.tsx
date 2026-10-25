import { CircleDollarSign, Handshake, Truck, Users, type LucideIcon } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Etapa, Prospecto } from './tipos.ts'

interface Indicador {
  etiqueta: string
  etapas: Etapa[]
  icono: LucideIcon
  detalle: string
}

// Cuántos prospectos hay en cada tramo del embudo. Solo cuenta lo que ya viene
// del backend; no calcula montos ni conversiones.
const INDICADORES: Indicador[] = [
  {
    etiqueta: 'Activos',
    etapas: ['PRIMER_CONTACTO', 'VISITA', 'COTIZACION', 'PAGO', 'FACTURACION', 'ENTREGA'],
    icono: Users,
    detalle: 'Sin contar finalizados ni cerrados',
  },
  {
    etiqueta: 'En seguimiento',
    etapas: ['PRIMER_CONTACTO', 'VISITA', 'COTIZACION'],
    icono: Handshake,
    detalle: 'Primer contacto, visita y cotización',
  },
  {
    etiqueta: 'En venta',
    etapas: ['PAGO', 'FACTURACION'],
    icono: CircleDollarSign,
    detalle: 'Pago y facturación, los avanza el ERP',
  },
  {
    etiqueta: 'Por entregar',
    etapas: ['ENTREGA'],
    icono: Truck,
    detalle: 'Listos para finalizar con el cliente',
  },
]

/** Tarjetas con el resumen del embudo, arriba de la lista de prospectos. */
export function ResumenProspectos({ prospectos }: { prospectos: Prospecto[] }) {
  return (
    <section
      aria-label="Resumen de prospectos"
      className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @3xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
    >
      {INDICADORES.map(({ etiqueta, etapas, icono: Icono, detalle }) => {
        const cuenta = prospectos.filter((p) => etapas.includes(p.etapa)).length
        return (
          <Card key={etiqueta} size="sm" className="@container/card">
            <CardHeader>
              <CardDescription>{etiqueta}</CardDescription>
              <CardTitle className="text-2xl tabular-nums @[200px]/card:text-3xl">{cuenta}</CardTitle>
              <CardAction>
                <Icono aria-hidden="true" className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardFooter className="hidden text-xs text-muted-foreground @[200px]/card:flex">
              {detalle}
            </CardFooter>
          </Card>
        )
      })}
    </section>
  )
}
