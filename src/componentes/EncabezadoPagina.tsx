import type { ReactNode } from 'react'

interface Props {
  titulo: string
  descripcion?: string
  /** Acción principal de la pantalla (un solo botón default). */
  accion?: ReactNode
}

/**
 * Título de la página (el único h1), con su descripción y acción principal.
 * Las migas de pan van en la barra superior (CRM-UX-2).
 */
export function EncabezadoPagina({ titulo, descripcion, accion }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}
