import {
  ArrowRight,
  CheckCheck,
  Clock,
  Eye,
  SendHorizontal,
  UserRoundCog,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
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

// Un color por tipo de acción, para reconocerla de un vistazo (la guía de
// estilos, sección 2: el color nunca va solo, siempre con texto e ícono):
// - Avanzar usa el color de la etapa a la que lleva, igual que su chip.
// - Finalizar es sólido: cierra la venta con éxito.
// - Cerrar es rojo: termina el prospecto de inmediato.
// - Solicitar cierre es neutro: no cierra, pide autorización.
const COLOR_AVANZAR: Partial<Record<Etapa, string>> = {
  VISITA: 'border-primary/25 bg-accent text-primary hover:bg-primary/15',
  COTIZACION:
    'border-[#5b3aa8]/25 bg-[#efeafb] text-[#5b3aa8] hover:bg-[#e3dbf7] dark:border-[#c4b2f2]/30 dark:bg-[#2a2140] dark:text-[#c4b2f2] dark:hover:bg-[#352a52]',
  PAGO: 'border-advertencia/30 bg-advertencia-fondo text-advertencia hover:bg-advertencia/15',
}
const COLOR_FINALIZAR =
  'border-exito bg-exito text-white hover:bg-exito/90 dark:text-[#0f1724]'
const COLOR_CERRAR =
  'border-destructive/30 bg-peligro-fondo text-destructive hover:bg-destructive/15'
const COLOR_SOLICITAR = 'border-input bg-card text-foreground hover:bg-muted'
const COLOR_PENDIENTE = 'border-transparent bg-muted text-muted-foreground'
const COLOR_REASIGNAR = 'border-input bg-card text-foreground hover:bg-muted'

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
}

interface PropsBoton {
  color: string
  icono: LucideIcon
  /** Posición del ícono: después del texto para avanzar (flecha). */
  iconoAlFinal?: boolean
  etiqueta: string
  texto: string
  tactil: boolean
  disabled?: boolean
  onClick?: () => void
}

/** Botón compacto con color propio. 32 px en tabla y 44 px al tacto. */
function BotonAccion({
  color,
  icono: Icono,
  iconoAlFinal,
  etiqueta,
  texto,
  tactil,
  disabled,
  onClick,
}: PropsBoton) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5',
        'text-[13px] leading-none font-medium whitespace-nowrap transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-100',
        tactil ? 'min-h-11' : 'h-8',
        color,
      ].join(' ')}
    >
      {!iconoAlFinal && <Icono aria-hidden="true" className="size-3.5 shrink-0" />}
      {texto}
      {iconoAlFinal && <Icono aria-hidden="true" className="size-3.5 shrink-0" />}
    </button>
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
          <button
            type="button"
            aria-label={`Ver historial de ${prospecto.nombre}`}
            onClick={onClick}
            className={[
              'inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground',
              'transition-colors hover:bg-muted hover:text-foreground',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
              tactil ? 'size-11' : 'size-8',
            ].join(' ')}
          >
            <Eye aria-hidden="true" className="size-4" />
          </button>
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
 * 1. Avanzar a la siguiente etapa, o Finalizar en Entrega (o Reasignar, para el
 *    Gerente de marketing).
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
        color={COLOR_AVANZAR[siguiente] ?? ''}
        icono={ArrowRight}
        iconoAlFinal
        tactil={tactil}
        etiqueta={`Pasar ${p.nombre} a ${NOMBRES_ETAPA[siguiente]}`}
        texto={NOMBRES_ETAPA[siguiente]}
        onClick={() => acciones.onCambiarEtapa(p, siguiente)}
      />
    )
  } else if (vendedor && p.etapa === 'ENTREGA') {
    principal = (
      <BotonAccion
        color={COLOR_FINALIZAR}
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
        color={COLOR_REASIGNAR}
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
        color={COLOR_CERRAR}
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
        color={COLOR_PENDIENTE}
        icono={Clock}
        tactil={tactil}
        disabled
        etiqueta={`Cierre de ${p.nombre} ya solicitado`}
        texto="Cierre solicitado"
      />
    ) : (
      <BotonAccion
        color={COLOR_SOLICITAR}
        icono={SendHorizontal}
        tactil={tactil}
        etiqueta={`Solicitar cierre de ${p.nombre}`}
        texto="Solicitar cierre"
        onClick={() => acciones.onSolicitarCierre(p)}
      />
    )
  }

  // El vendedor siempre reserva las dos columnas aunque una esté vacía (por
  // ejemplo en Pago, sin botón de avanzar), así todas alinean.
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
