import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
    <FieldSet data-invalid={!!error || undefined}>
      <FieldLegend id={`${id}-titulo`} variant="label">
        Motivo de cierre
      </FieldLegend>
      <RadioGroup
        aria-labelledby={`${id}-titulo`}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        value={valor ?? ''}
        onValueChange={(motivo) => onCambiar(motivo as MotivoCierre)}
      >
        {MOTIVOS_CIERRE.map((motivo) => (
          <FieldLabel key={motivo} htmlFor={`${id}-${motivo}`}>
            <Field orientation="horizontal" data-invalid={!!error || undefined}>
              <RadioGroupItem
                id={`${id}-${motivo}`}
                value={motivo}
                aria-invalid={!!error || undefined}
              />
              <FieldContent>
                <FieldTitle>{NOMBRES_MOTIVO[motivo]}</FieldTitle>
              </FieldContent>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
      <FieldError id={`${id}-error`} errors={error ? [{ message: error }] : []} />
    </FieldSet>
  )
}
