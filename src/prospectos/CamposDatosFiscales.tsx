import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ESTADOS,
  REGIMENES_FISCALES,
  type CampoFiscal,
  type DatosFiscales,
  type DomicilioFiscal,
  type ErroresDatosFiscales,
} from './datosFiscales.ts'

interface Props {
  valores: DatosFiscales
  errores: ErroresDatosFiscales
  onCambiar: (valores: DatosFiscales) => void
}

/**
 * Los datos fiscales del cliente para la factura (ERP-1.3): RFC, nombre
 * completo, domicilio fiscal (estado, ciudad, colonia, calle y número, y código
 * postal) y régimen fiscal. Los usan el cambio a Pago y la corrección.
 */
export function CamposDatosFiscales({ valores, errores, onCambiar }: Props) {
  function campo<K extends keyof DatosFiscales>(nombre: K, valor: DatosFiscales[K]) {
    onCambiar({ ...valores, [nombre]: valor })
  }

  function domicilio(nombre: keyof DomicilioFiscal, valor: string) {
    campo('domicilio', { ...valores.domicilio, [nombre]: valor })
  }

  /** El id del mensaje de error del campo, solo cuando hay error. */
  function describir(nombre: CampoFiscal, id: string) {
    return errores[nombre] ? `${id}-error` : undefined
  }

  /** Un dato de texto del domicilio, con su etiqueta y su error. */
  function textoDomicilio(
    nombre: Exclude<keyof DomicilioFiscal, 'estado'>,
    etiqueta: string,
    opciones: { maximo: number; placeholder?: string; numerico?: boolean },
  ) {
    const id = `fiscal-${nombre}`
    return (
      <Field data-invalid={!!errores[nombre]}>
        <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
        <Input
          id={id}
          autoComplete="off"
          maxLength={opciones.maximo}
          placeholder={opciones.placeholder}
          inputMode={opciones.numerico ? 'numeric' : undefined}
          value={valores.domicilio[nombre]}
          onChange={(e) => domicilio(nombre, e.target.value)}
          aria-invalid={!!errores[nombre] || undefined}
          aria-describedby={describir(nombre, id)}
        />
        <FieldError
          id={`${id}-error`}
          errors={errores[nombre] ? [{ message: errores[nombre] }] : []}
        />
      </Field>
    )
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

      <FieldSet>
        <FieldLegend variant="label">Domicilio fiscal</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errores.estado}>
            <FieldLabel htmlFor="fiscal-estado">Estado</FieldLabel>
            <Select value={valores.domicilio.estado} onValueChange={(estado) => domicilio('estado', estado)}>
              <SelectTrigger
                id="fiscal-estado"
                className="w-full"
                aria-invalid={!!errores.estado || undefined}
                aria-describedby={describir('estado', 'fiscal-estado')}
              >
                <SelectValue placeholder="Selecciona el estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError
              id="fiscal-estado-error"
              errors={errores.estado ? [{ message: errores.estado }] : []}
            />
          </Field>
          {textoDomicilio('ciudad', 'Ciudad', { maximo: 60 })}
          {textoDomicilio('colonia', 'Colonia', { maximo: 80 })}
          {textoDomicilio('calleNumero', 'Calle y número', {
            maximo: 90,
            placeholder: 'Blvd. López Mateos 1102',
          })}
          {textoDomicilio('codigoPostal', 'Código postal', {
            maximo: 5,
            placeholder: '37000',
            numerico: true,
          })}
        </div>
      </FieldSet>

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
