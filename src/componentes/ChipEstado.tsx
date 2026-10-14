import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Tono = 'exito' | 'advertencia' | 'peligro' | 'informacion' | 'neutro'

const COLORES: Record<Tono, string> = {
  exito: 'bg-exito-fondo text-exito',
  advertencia: 'bg-advertencia-fondo text-advertencia',
  peligro: 'bg-peligro-fondo text-destructive',
  informacion: 'bg-accent text-primary',
  neutro: 'bg-muted text-muted-foreground',
}

/**
 * Chip de estado (guía, sección 2). Siempre lleva texto: un estado nunca se
 * comunica solo con color.
 */
export function ChipEstado({ tono, children }: { tono: Tono; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        COLORES[tono],
      )}
    >
      {children}
    </span>
  )
}
