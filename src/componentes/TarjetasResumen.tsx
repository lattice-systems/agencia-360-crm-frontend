import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export interface Indicador {
  etiqueta: string
  valor: number
  icono: LucideIcon
  /** Aclaración corta; se oculta en tarjetas angostas. */
  detalle?: string
}

/**
 * Fila de tarjetas con conteos clave de la pantalla, con el degradado de las
 * tarjetas del bloque dashboard-01. Solo muestra números que ya da el backend.
 */
export function TarjetasResumen({
  titulo,
  indicadores,
}: {
  /** Nombre de la región para lectores de pantalla. */
  titulo: string
  indicadores: Indicador[]
}) {
  return (
    <section
      aria-label={titulo}
      className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @3xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
    >
      {indicadores.map(({ etiqueta, valor, icono: Icono, detalle }) => (
        <Card key={etiqueta} size="sm" className="@container/card">
          <CardHeader>
            <CardDescription>{etiqueta}</CardDescription>
            <CardTitle className="text-2xl tabular-nums @[200px]/card:text-3xl">{valor}</CardTitle>
            <CardAction>
              <Icono aria-hidden="true" className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          {detalle && (
            <CardFooter className="hidden text-xs text-muted-foreground @[200px]/card:flex">
              {detalle}
            </CardFooter>
          )}
        </Card>
      ))}
    </section>
  )
}
