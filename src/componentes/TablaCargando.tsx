import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton con la forma de un listado mientras llegan los datos. */
export function TablaCargando({ filas = 4 }: { filas?: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="grid grid-cols-3 gap-6">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
        </div>
      ))}
    </div>
  )
}
