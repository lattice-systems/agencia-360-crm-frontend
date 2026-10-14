import type { Etapa, Movimiento, Prospecto } from '../prospectos/tipos.ts'

// Datos en memoria que usan los handlers de MSW mientras no hay backend.
// Se reinician antes de cada prueba (ver src/test/setup.ts).

// El teléfono y el correo de Rosa Díaz sirven para probar el aviso de duplicado.
export const TELEFONO_REPETIDO = '5500000000'
export const CORREO_REPETIDO = 'repetido@ejemplo.com'

// Los tres primeros los usan las pruebas; los demás muestran en `npm run dev`
// las etapas que ya no mueve el vendedor.
const PROSPECTOS_INICIALES: readonly Prospecto[] = [
  {
    id: 1,
    nombre: 'Rosa Díaz',
    telefono: TELEFONO_REPETIDO,
    correo: CORREO_REPETIDO,
    etapa: 'PRIMER_CONTACTO',
    vendedorId: 1,
    creadoEn: '2026-10-10T16:30:00Z',
    ultimoCambio: '2026-10-10T16:30:00Z',
  },
  {
    id: 2,
    nombre: 'Jorge Ramírez',
    telefono: '4779876543',
    correo: null,
    etapa: 'VISITA',
    vendedorId: 1,
    creadoEn: '2026-10-11T17:00:00Z',
    ultimoCambio: '2026-10-12T15:10:00Z',
  },
  {
    id: 3,
    nombre: 'Marta Hernández',
    telefono: null,
    correo: 'marta@ejemplo.com',
    etapa: 'COTIZACION',
    vendedorId: 1,
    creadoEn: '2026-10-12T15:45:00Z',
    ultimoCambio: '2026-10-12T23:35:00Z',
  },
  {
    id: 4,
    nombre: 'Luis Herrera',
    telefono: '4775550104',
    correo: 'luis.h@example.com',
    etapa: 'PAGO',
    vendedorId: 1,
    creadoEn: '2026-10-09T15:00:00Z',
    ultimoCambio: '2026-10-12T18:05:00Z',
  },
  {
    id: 5,
    nombre: 'Valeria Díaz',
    telefono: '4775550105',
    correo: 'valeria.d@example.com',
    etapa: 'ENTREGA',
    vendedorId: 1,
    creadoEn: '2026-10-05T15:00:00Z',
    ultimoCambio: '2026-10-11T22:40:00Z',
  },
  {
    id: 6,
    nombre: 'Carlos Núñez',
    telefono: '4775550109',
    correo: null,
    etapa: 'FACTURACION',
    vendedorId: 2,
    creadoEn: '2026-10-06T15:00:00Z',
    ultimoCambio: '2026-10-11T20:00:00Z',
    cierrePendiente: true,
  },
]

let prospectos: Prospecto[] = []
let historiales = new Map<number, Movimiento[]>()
let siguienteId = 1

export function reiniciarDatos(iniciales = PROSPECTOS_INICIALES) {
  prospectos = iniciales.map((p) => ({ ...p }))
  historiales = new Map(
    prospectos.map((p) => [
      p.id,
      [
        {
          etapa: 'PRIMER_CONTACTO' as Etapa,
          origen: 'CRM' as const,
          fechaHora: p.creadoEn,
          usuarioNombre: null,
        },
        ...(p.etapa === 'PRIMER_CONTACTO'
          ? []
          : [
              {
                etapa: p.etapa,
                origen: 'CRM' as const,
                fechaHora: p.ultimoCambio ?? p.creadoEn,
                usuarioNombre: null,
              },
            ]),
      ],
    ]),
  )
  siguienteId = Math.max(0, ...prospectos.map((p) => p.id)) + 1
}

export function todosLosProspectos(): Prospecto[] {
  return prospectos
}

export function buscarProspecto(id: number): Prospecto | undefined {
  return prospectos.find((p) => p.id === id)
}

export function historialDe(id: number): Movimiento[] {
  return historiales.get(id) ?? []
}

export function agregarProspecto(
  datos: Omit<Prospecto, 'id'>,
  usuarioNombre: string | null,
): Prospecto {
  const nuevo = { ...datos, id: siguienteId++ }
  prospectos.push(nuevo)
  historiales.set(nuevo.id, [
    { etapa: nuevo.etapa, origen: 'CRM', fechaHora: nuevo.creadoEn, usuarioNombre },
  ])
  return nuevo
}

/** Mueve el prospecto y deja el movimiento en su historial. */
export function moverProspecto(
  prospecto: Prospecto,
  etapa: Etapa,
  origen: 'CRM' | 'ERP',
  usuarioNombre: string | null,
) {
  const ahora = new Date().toISOString()
  prospecto.etapa = etapa
  prospecto.ultimoCambio = ahora
  historiales.set(prospecto.id, [
    ...historialDe(prospecto.id),
    { etapa, origen, fechaHora: ahora, usuarioNombre },
  ])
}

reiniciarDatos()
