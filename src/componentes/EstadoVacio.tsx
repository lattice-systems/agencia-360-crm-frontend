import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icono: LucideIcon
  titulo: string
  descripcion: string
  accion?: ReactNode
}

/** Lista vacía: texto centrado con la acción para empezar (guía, sección 6). */
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Icono aria-hidden="true" className="size-8 text-muted-foreground" />
      <p className="text-lg font-semibold text-primary">{titulo}</p>
      <p className="text-sm text-muted-foreground">{descripcion}</p>
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}
