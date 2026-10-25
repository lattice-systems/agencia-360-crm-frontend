import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton con la forma de la tabla (mismo contenedor) mientras llegan los datos. */
export function TablaCargando({ filas = 4 }: { filas?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="grid grid-cols-3 gap-6 bg-muted px-4 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="grid grid-cols-3 gap-6 border-t px-4 py-4">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
        </div>
      ))}
    </div>
  )
}
