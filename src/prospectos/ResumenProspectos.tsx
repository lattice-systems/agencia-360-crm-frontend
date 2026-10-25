import { CircleDollarSign, Handshake, Truck, Users } from 'lucide-react'
import { TarjetasResumen } from '../componentes/TarjetasResumen.tsx'
import type { Etapa, Prospecto } from './tipos.ts'

// Cuántos prospectos hay en cada tramo del embudo. Solo cuenta lo que ya viene
// del backend; no calcula montos ni conversiones.
const ACTIVOS: Etapa[] = ['PRIMER_CONTACTO', 'VISITA', 'COTIZACION', 'PAGO', 'FACTURACION', 'ENTREGA']
const SEGUIMIENTO: Etapa[] = ['PRIMER_CONTACTO', 'VISITA', 'COTIZACION']
const VENTA: Etapa[] = ['PAGO', 'FACTURACION']

/** Tarjetas con el resumen del embudo, arriba de la lista de prospectos. */
export function ResumenProspectos({ prospectos }: { prospectos: Prospecto[] }) {
  const cuenta = (etapas: Etapa[]) => prospectos.filter((p) => etapas.includes(p.etapa)).length
  return (
    <TarjetasResumen
      titulo="Resumen de prospectos"
      indicadores={[
        {
          etiqueta: 'Activos',
          valor: cuenta(ACTIVOS),
          icono: Users,
          detalle: 'Sin contar finalizados ni cerrados',
        },
        {
          etiqueta: 'En seguimiento',
          valor: cuenta(SEGUIMIENTO),
          icono: Handshake,
          detalle: 'Primer contacto, visita y cotización',
        },
        {
          etiqueta: 'En venta',
          valor: cuenta(VENTA),
          icono: CircleDollarSign,
          detalle: 'Pago y facturación, los avanza el ERP',
        },
        {
          etiqueta: 'Por entregar',
          valor: cuenta(['ENTREGA']),
          icono: Truck,
          detalle: 'Listos para finalizar con el cliente',
        },
      ]}
    />
  )
}
