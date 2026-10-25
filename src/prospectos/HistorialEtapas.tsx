import { useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useConsulta } from '../api/useConsulta.ts'
import { historialDe } from './api.ts'
import { formatearFechaLarga } from './formato.ts'
import { NOMBRES_ETAPA } from './tipos.ts'

/**
 * Historial de etapas de un prospecto, del más antiguo al más reciente, con
 * fecha, hora y quién hizo cada cambio (mockup p. 16).
 */
export function HistorialEtapas({ prospectoId }: { prospectoId: number }) {
  const consulta = useCallback(() => historialDe(prospectoId), [prospectoId])
  const { datos, cargando, error } = useConsulta(consulta)

  return (
    <section aria-labelledby="titulo-historial" className="flex flex-col gap-3">
      <h3 id="titulo-historial" className="text-base font-semibold">
        Historial de etapas
      </h3>
      {cargando ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span className="sr-only">Cargando historial…</span>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">No se pudo cargar el historial.</p>
      ) : (
        <ol className="flex flex-col">
          {(datos ?? []).map((movimiento, i, lista) => (
            <li key={`${movimiento.fechaHora}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
              <span aria-hidden="true" className="relative flex w-3 justify-center">
                <span className="mt-1.5 size-2.5 rounded-full bg-primary" />
                {i < lista.length - 1 && (
                  <span className="absolute top-4 bottom-[-0.25rem] w-px bg-border" />
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  {NOMBRES_ETAPA[movimiento.etapa]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatearFechaLarga(movimiento.fechaHora)}
                  {movimiento.usuarioNombre && ` · ${movimiento.usuarioNombre}`}
                  {movimiento.origen === 'ERP' && ' · desde el ERP'}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
