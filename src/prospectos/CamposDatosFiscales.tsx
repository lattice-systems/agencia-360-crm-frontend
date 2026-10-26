import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  REGIMENES_FISCALES,
  type DatosFiscales,
  type ErroresDatosFiscales,
} from './datosFiscales.ts'

interface Props {
  valores: DatosFiscales
  errores: ErroresDatosFiscales
  onCambiar: (valores: DatosFiscales) => void
}

/**
 * Los cuatro datos fiscales del cliente para la factura (ERP-1.3): RFC, nombre
 * completo, domicilio fiscal y régimen fiscal. Los usan el cambio a Pago y la
 * corrección mientras el prospecto sigue en Pago.
 */
export function CamposDatosFiscales({ valores, errores, onCambiar }: Props) {
  function campo<K extends keyof DatosFiscales>(nombre: K, valor: DatosFiscales[K]) {
    onCambiar({ ...valores, [nombre]: valor })
  }

  /** El id del mensaje de error del campo, solo cuando hay error. */
  function describir(nombre: keyof DatosFiscales, id: string) {
    return errores[nombre] ? `${id}-error` : undefined
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">Datos fiscales del cliente</FieldLegend>
      <FieldDescription>
        Facturación los usa para emitir la factura. Cópialos de la constancia de situación fiscal.
      </FieldDescription>

      <Field data-invalid={!!errores.rfc}>
        <FieldLabel htmlFor="fiscal-rfc">RFC</FieldLabel>
        <Input
          id="fiscal-rfc"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={15}
          placeholder="LOHA850101AB1"
          className="font-mono uppercase"
          value={valores.rfc}
          onChange={(e) => campo('rfc', e.target.value)}
          aria-invalid={!!errores.rfc || undefined}
          aria-describedby={describir('rfc', 'fiscal-rfc')}
        />
        <FieldError id="fiscal-rfc-error" errors={errores.rfc ? [{ message: errores.rfc }] : []} />
      </Field>

      <Field data-invalid={!!errores.nombre}>
        <FieldLabel htmlFor="fiscal-nombre">Nombre completo o razón social</FieldLabel>
        <Input
          id="fiscal-nombre"
          autoComplete="off"
          maxLength={200}
          value={valores.nombre}
          onChange={(e) => campo('nombre', e.target.value)}
          aria-invalid={!!errores.nombre || undefined}
          aria-describedby={describir('nombre', 'fiscal-nombre')}
        />
        <FieldError
          id="fiscal-nombre-error"
          errors={errores.nombre ? [{ message: errores.nombre }] : []}
        />
      </Field>

      <Field data-invalid={!!errores.domicilio}>
        <FieldLabel htmlFor="fiscal-domicilio">Domicilio fiscal</FieldLabel>
        <Textarea
          id="fiscal-domicilio"
          rows={2}
          maxLength={250}
          placeholder="Calle y número, colonia, C.P., municipio y estado"
          value={valores.domicilio}
          onChange={(e) => campo('domicilio', e.target.value)}
          aria-invalid={!!errores.domicilio || undefined}
          aria-describedby={describir('domicilio', 'fiscal-domicilio')}
        />
        <FieldError
          id="fiscal-domicilio-error"
          errors={errores.domicilio ? [{ message: errores.domicilio }] : []}
        />
      </Field>

      <Field data-invalid={!!errores.regimenFiscal}>
        <FieldLabel htmlFor="fiscal-regimen">Régimen fiscal</FieldLabel>
        <Select value={valores.regimenFiscal} onValueChange={(clave) => campo('regimenFiscal', clave)}>
          <SelectTrigger
            id="fiscal-regimen"
            className="w-full"
            aria-invalid={!!errores.regimenFiscal || undefined}
            aria-describedby={describir('regimenFiscal', 'fiscal-regimen')}
          >
            <SelectValue placeholder="Selecciona el régimen" />
          </SelectTrigger>
          <SelectContent>
            {REGIMENES_FISCALES.map((regimen) => (
              <SelectItem key={regimen.clave} value={regimen.clave}>
                {regimen.clave} · {regimen.descripcion}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError
          id="fiscal-regimen-error"
          errors={errores.regimenFiscal ? [{ message: errores.regimenFiscal }] : []}
        />
      </Field>
    </FieldSet>
  )
}
