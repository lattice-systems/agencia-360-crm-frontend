import type { ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { NOMBRES_ETAPA, type Etapa } from './tipos.ts'

// Variante de Badge por etapa. El texto siempre acompaña al color: una etapa
// nunca se comunica solo con color.
const VARIANTES: Record<Etapa, ComponentProps<typeof Badge>['variant']> = {
  PRIMER_CONTACTO: 'secondary',
  VISITA: 'outline',
  COTIZACION: 'outline',
  PAGO: 'warning',
  FACTURACION: 'warning',
  ENTREGA: 'success',
  FINALIZADO: 'default',
  CERRADO: 'destructive',
}

/** Badge con el nombre de la etapa. */
export function EtapaChip({ etapa }: { etapa: Etapa }) {
  return <Badge variant={VARIANTES[etapa]}>{NOMBRES_ETAPA[etapa]}</Badge>
}
