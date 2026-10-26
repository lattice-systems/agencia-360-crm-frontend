import {
  ArrowRight,
  CheckCheck,
  Clock,
  Eye,
  FileText,
  SendHorizontal,
  UserRoundCog,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  esEtapaInicial,
  estaEnProcesoDeVenta,
  NOMBRES_ETAPA,
  type Etapa,
  type Prospecto,
} from './tipos.ts'

/** Siguiente etapa que mueve el vendedor; en Pago y Facturación avanza el ERP. */
const SIGUIENTE: Partial<Record<Etapa, Etapa>> = {
  PRIMER_CONTACTO: 'VISITA',
  VISITA: 'COTIZACION',
  COTIZACION: 'PAGO',
}

// Una variante de Button por tipo de acción, para reconocerla de un vistazo
// (el color nunca va solo, siempre con texto e ícono):
// - Avanzar es secundario, igual que Datos fiscales cuando faltan: son el
//   siguiente paso del vendedor (sin ellos Contabilidad no puede validar).
// - Finalizar es el principal: cierra la venta con éxito.
// - Cerrar es destructivo: termina el prospecto de inmediato.
// - Solicitar cierre, Reasignar y corregir Datos fiscales son outline: no
//   cierran, piden, mueven o corrigen.
type Variante = ComponentProps<typeof Button>['variant']

export interface ManejadoresAcciones {
  /** Solo el vendedor mueve etapas, finaliza y solicita cierres. */
  esVendedor: boolean
  /** El Gerente de marketing reasigna. */
  puedeReasignar: boolean
  onCambiarEtapa: (p: Prospecto, sugerida: Etapa) => void
  onVerHistorial: (p: Prospecto) => void
  onSolicitarCierre: (p: Prospecto) => void
  onFinalizar: (p: Prospecto) => void
  onReasignar: (p: Prospecto) => void
  /** En Pago el vendedor captura o corrige los datos fiscales (ERP-1.3). */
  onDatosFiscales: (p: Prospecto) => void
}

interface PropsBoton {
  variante: Variante
  icono: LucideIcon
  /** Posición del ícono: después del texto para avanzar (flecha). */
  iconoAlFinal?: boolean
  etiqueta: string
  texto: string
  tactil: boolean
  disabled?: boolean
  onClick?: () => void
}

/** Botón compacto de la acción; más alto en las tarjetas del celular. */
function BotonAccion({
  variante,
  icono: Icono,
  iconoAlFinal,
  etiqueta,
  texto,
  tactil,
  disabled,
  onClick,
}: PropsBoton) {
  return (
    <Button
      variant={variante}
      size={tactil ? 'lg' : 'default'}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={onClick}
      className="w-full"
    >
      {!iconoAlFinal && <Icono aria-hidden="true" data-icon="inline-start" />}
      {texto}
      {iconoAlFinal && <Icono aria-hidden="true" data-icon="inline-end" />}
    </Button>
  )
}

/** Ver el historial: solo el ojo, con su texto en el tooltip y para lectores. */
function BotonVer({
  prospecto,
  tactil,
  onClick,
}: {
  prospecto: Prospecto
  tactil: boolean
  onClick: () => void
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={tactil ? 'icon-lg' : 'icon'}
            aria-label={`Ver historial de ${prospecto.nombre}`}
            onClick={onClick}
            className="text-muted-foreground"
          >
            <Eye aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ver historial</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Acciones de cada renglón según el rol y la etapa (decisiones del PO del 12 de
 * octubre). Siempre en el mismo orden y en columnas fijas, para que alineen de
 * un renglón a otro:
 * 1. Avanzar a la siguiente etapa, Datos fiscales en Pago o Finalizar en
 *    Entrega (o Reasignar, para el Gerente de marketing).
 * 2. Cerrar (primeras etapas) o Solicitar cierre (Pago en adelante).
 * 3. Ver el historial (el ojo).
 * Los dos primeros abren una confirmación; en Pago y Facturación avanza el ERP.
 */
export function AccionesProspecto({
  prospecto: p,
  acciones,
  tactil = false,
}: {
  prospecto: Prospecto
  acciones: ManejadoresAcciones
  /** Tarjetas del celular: controles de 44 px y columnas que se reparten el ancho. */
  tactil?: boolean
}) {
  const siguiente = SIGUIENTE[p.etapa]
  const vendedor = acciones.esVendedor

  let principal: ReactNode = null
  if (vendedor && siguiente) {
    principal = (
      <BotonAccion
        variante="secondary"
        icono={ArrowRight}
        iconoAlFinal
        tactil={tactil}
        etiqueta={`Pasar ${p.nombre} a ${NOMBRES_ETAPA[siguiente]}`}
        texto={NOMBRES_ETAPA[siguiente]}
        onClick={() => acciones.onCambiarEtapa(p, siguiente)}
      />
    )
  } else if (vendedor && p.etapa === 'PAGO') {
    const faltan = !p.datosFiscales
    principal = (
      <BotonAccion
        variante={faltan ? 'secondary' : 'outline'}
        icono={FileText}
        tactil={tactil}
        etiqueta={
          faltan
            ? `Capturar los datos fiscales de ${p.nombre}`
            : `Corregir los datos fiscales de ${p.nombre}`
        }
        texto="Fiscales"
        onClick={() => acciones.onDatosFiscales(p)}
      />
    )
  } else if (vendedor && p.etapa === 'ENTREGA') {
    principal = (
      <BotonAccion
        variante="default"
        icono={CheckCheck}
        tactil={tactil}
        etiqueta={`Finalizar ${p.nombre}`}
        texto="Finalizar"
        onClick={() => acciones.onFinalizar(p)}
      />
    )
  } else if (acciones.puedeReasignar) {
    principal = (
      <BotonAccion
        variante="outline"
        icono={UserRoundCog}
        tactil={tactil}
        etiqueta={`Reasignar a ${p.nombre}`}
        texto="Reasignar"
        onClick={() => acciones.onReasignar(p)}
      />
    )
  }

  let secundaria: ReactNode = null
  if (vendedor && esEtapaInicial(p.etapa)) {
    secundaria = (
      <BotonAccion
        variante="destructive"
        icono={XCircle}
        tactil={tactil}
        etiqueta={`Cerrar ${p.nombre}`}
        texto="Cerrar"
        onClick={() => acciones.onCambiarEtapa(p, 'CERRADO')}
      />
    )
  } else if (vendedor && estaEnProcesoDeVenta(p.etapa)) {
    secundaria = p.cierrePendiente ? (
      <BotonAccion
        variante="secondary"
        icono={Clock}
        tactil={tactil}
        disabled
        etiqueta={`Cierre de ${p.nombre} ya solicitado`}
        texto="Cierre solicitado"
      />
    ) : (
      <BotonAccion
        variante="outline"
        icono={SendHorizontal}
        tactil={tactil}
        etiqueta={`Solicitar cierre de ${p.nombre}`}
        texto="Solicitar cierre"
        onClick={() => acciones.onSolicitarCierre(p)}
      />
    )
  }

  // El vendedor siempre reserva las dos columnas aunque una esté vacía (por
  // ejemplo en Facturación, sin botón de avanzar), así todas alinean.
  const hayColumnas = vendedor || acciones.puedeReasignar
  const columna1 = tactil ? 'min-w-0 flex-1' : 'w-28'
  const columna2 = tactil ? 'min-w-0 flex-1' : 'w-[8.5rem]'

  return (
    <div className={tactil ? 'flex items-center gap-2' : 'flex items-center justify-end gap-2'}>
      {hayColumnas && <div className={columna1}>{principal}</div>}
      {vendedor && <div className={columna2}>{secundaria}</div>}
      <BotonVer prospecto={p} tactil={tactil} onClick={() => acciones.onVerHistorial(p)} />
    </div>
  )
}
