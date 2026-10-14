import { cn } from '@/lib/utils'
import { NOMBRES_ETAPA, type Etapa } from './tipos.ts'

// Colores de etapa de los mockups (pp. 3 y 14). El texto siempre acompaña al
// color: una etapa nunca se comunica solo con color.
const COLORES: Record<Etapa, string> = {
  PRIMER_CONTACTO: 'bg-muted text-muted-foreground',
  VISITA: 'bg-accent text-primary',
  COTIZACION:
    'bg-[#efeafb] text-[#5b3aa8] dark:bg-[#2a2140] dark:text-[#c4b2f2]',
  PAGO: 'bg-advertencia-fondo text-advertencia',
  FACTURACION:
    'bg-[#e3f5f3] text-[#126e66] dark:bg-[#12302d] dark:text-[#7ed9cf]',
  ENTREGA: 'bg-exito-fondo text-exito',
  FINALIZADO: 'bg-exito text-white dark:text-[#0f1724]',
  CERRADO: 'bg-peligro-fondo text-destructive',
}

/** Chip con el nombre de la etapa (Badge de los mockups). */
export function EtapaChip({ etapa }: { etapa: Etapa }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        COLORES[etapa],
      )}
    >
      {NOMBRES_ETAPA[etapa]}
    </span>
  )
}
