import { FieldError, FieldLegend, FieldSet } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { MOTIVOS_CIERRE, NOMBRES_MOTIVO, type MotivoCierre } from './tipos.ts'

interface Props {
  /** Prefijo de los id, para que dos diálogos no repitan id. */
  id: string
  valor: MotivoCierre | null
  onCambiar: (motivo: MotivoCierre) => void
  error?: string
}

/**
 * Los tres motivos de cierre que fijó el PO (CRM-1.2), como opciones a la vista:
 * son pocos y así se comparan sin abrir una lista.
 */
export function SelectorMotivoCierre({ id, valor, onCambiar, error }: Props) {
  return (
    <FieldSet data-invalid={!!error || undefined} className="gap-0">
      <FieldLegend id={`${id}-titulo`} variant="label">
        Motivo de cierre
      </FieldLegend>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-titulo`}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex flex-col gap-2"
      >
        {MOTIVOS_CIERRE.map((motivo) => {
          const elegido = valor === motivo
          return (
            <label
              key={motivo}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                elegido
                  ? 'border-primary bg-accent font-medium text-primary'
                  : 'border-input hover:bg-muted',
                error && !elegido && 'border-destructive/60',
              )}
            >
              <input
                type="radio"
                name={`${id}-motivo`}
                value={motivo}
                checked={elegido}
                onChange={() => onCambiar(motivo)}
                className="size-4 accent-primary"
              />
              {NOMBRES_MOTIVO[motivo]}
            </label>
          )
        })}
      </div>
      <FieldError id={`${id}-error`} className="mt-2" errors={error ? [{ message: error }] : []} />
    </FieldSet>
  )
}
