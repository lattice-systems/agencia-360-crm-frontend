import { BadgeCheck, Plus, Search, UserRoundPen, Users } from 'lucide-react'
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { deLaPagina } from '@/lib/paginacion'
import type { UsuarioApi } from '../api/acceso.ts'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { EstadoVacio } from '../componentes/EstadoVacio.tsx'
import { Paginacion } from '../componentes/Paginacion.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { RUTA_REGISTRAR } from '../navegacion/secciones.ts'
import { useSesion } from '../sesion/useSesion.ts'
import { AccionesProspecto, type ManejadoresAcciones } from './AccionesProspecto.tsx'
import { cambiarEtapa, listarProspectos } from './api.ts'
import { DialogoCambiarEtapa } from './DialogoCambiarEtapa.tsx'
import { DialogoDatosFiscales } from './DialogoDatosFiscales.tsx'
import { DialogoHistorial } from './DialogoHistorial.tsx'
import { DialogoReasignar } from './DialogoReasignar.tsx'
import { DialogoReasignarVarios } from './DialogoReasignarVarios.tsx'
import { DialogoSolicitarCierre } from './DialogoSolicitarCierre.tsx'
import { EtapaChip } from './EtapaChip.tsx'
import { formatearFecha, formatearFechaCorta, formatearTelefono, soloDigitos } from './formato.ts'
import { ETAPAS, NOMBRES_ETAPA, NOMBRES_MOTIVO, type Etapa, type Prospecto } from './tipos.ts'
import { useFiltroGuardado } from './useFiltroGuardado.ts'

const POR_PAGINA = 10
const TODAS = 'TODAS'
const TODOS_LOS_VENDEDORES = 'TODOS'

const esEtapaOTodas = (valor: unknown) =>
  valor === TODAS || (ETAPAS as readonly unknown[]).includes(valor)

interface Props {
  /** Si se indican, se ofrece reasignar (CRM-0.1, Gerente de marketing). */
  vendedores?: UsuarioApi[]
  /**
   * Solo el vendedor cambia etapas, finaliza y solicita cierres (decisión del
   * PO del 12 de octubre). Sin ese permiso la lista es de consulta.
   */
  puedeCambiarEtapa?: boolean
  /**
   * "activos": la lista de Prospectos, sin los finalizados. "finalizados": solo
   * los finalizados, de consulta (sección Finalizados).
   */
  modo?: 'activos' | 'finalizados'
}

/**
 * CRM-1.1 (MVP): lista con búsqueda y accesos rápidos por etapa (mockups pp.
 * 14, 17 y 18). La visibilidad (Ventas solo ve los suyos) la aplica el
 * servidor. Los finalizados se consultan aparte y los cerrados se ocultan
 * hasta pedirlos.
 *
 * Los filtros se conservan al salir y volver (CRM-UX-1). En Finalizados la
 * lista va de la entrega más reciente a la más antigua, y el Gerente de
 * marketing la filtra por vendedor (CRM-1.4).
 */
function ListaProspectos({ vendedores, puedeCambiarEtapa = true, modo = 'activos' }: Props) {
  const { datos, cargando, error, recargar, actualizar } = useConsulta(listarProspectos)
  const usuario = useSesion().sesion?.usuario
  const lista = modo === 'finalizados' ? 'finalizados' : 'prospectos'
  const [busqueda, setBusqueda] = useFiltroGuardado(
    lista,
    usuario,
    'busqueda',
    '',
    (v) => typeof v === 'string',
  )
  const [etapa, setEtapa] = useFiltroGuardado<Etapa | typeof TODAS>(
    lista,
    usuario,
    'etapa',
    TODAS,
    esEtapaOTodas,
  )
  const [mostrarCerrados, setMostrarCerrados] = useFiltroGuardado(
    lista,
    usuario,
    'mostrarCerrados',
    false,
    (v) => typeof v === 'boolean',
  )
  const [vendedor, setVendedor] = useFiltroGuardado(
    lista,
    usuario,
    'vendedor',
    TODOS_LOS_VENDEDORES,
    (v) => typeof v === 'string',
  )
  const [pagina, setPagina] = useState(1)
  const [cambiando, setCambiando] = useState<{ prospecto: Prospecto; etapa: Etapa } | null>(null)
  const [consultando, setConsultando] = useState<Prospecto | null>(null)
  const [solicitando, setSolicitando] = useState<Prospecto | null>(null)
  const [finalizando, setFinalizando] = useState<Prospecto | null>(null)
  const [reasignando, setReasignando] = useState<Prospecto | null>(null)
  const [capturandoFiscales, setCapturandoFiscales] = useState<Prospecto | null>(null)
  // Reasignación en masa (CRM-UX-1): solo el gerente, en la lista de Prospectos.
  const [seleccion, setSeleccion] = useState<ReadonlySet<number>>(new Set())
  const [reasignandoVarios, setReasignandoVarios] = useState<Prospecto[] | null>(null)

  const finalizados = modo === 'finalizados'
  const esVendedor = puedeCambiarEtapa
  const prospectos = useMemo(() => {
    const deLaLista = (datos ?? []).filter((p) =>
      finalizados
        ? p.etapa === 'FINALIZADO'
        : p.etapa !== 'FINALIZADO' && (mostrarCerrados || p.etapa !== 'CERRADO'),
    )
    // Finalizados: la entrega más reciente primero. Un finalizado ya no cambia de
    // etapa, así que su último cambio es la fecha de entrega.
    return finalizados
      ? [...deLaLista].sort((a, b) => fechaDe(b).localeCompare(fechaDe(a)))
      : deLaLista
  }, [datos, finalizados, mostrarCerrados])
  // Vendedores que tienen algo en esta lista, para el filtro del gerente.
  const vendedoresConProspectos = useMemo(() => {
    const ids = new Set(prospectos.map((p) => p.vendedorId))
    return (vendedores ?? [])
      .filter((v) => ids.has(v.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [prospectos, vendedores])
  // Un vendedor guardado que ya no tiene prospectos aquí no filtra nada.
  const vendedorElegido = vendedoresConProspectos.some((v) => String(v.id) === vendedor)
    ? vendedor
    : TODOS_LOS_VENDEDORES
  const cerrados = useMemo(
    () => (datos ?? []).filter((p) => p.etapa === 'CERRADO').length,
    [datos],
  )
  const porEtapa = useMemo(() => {
    const cuenta = new Map<Etapa, number>()
    prospectos.forEach((p) => cuenta.set(p.etapa, (cuenta.get(p.etapa) ?? 0) + 1))
    return cuenta
  }, [prospectos])
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const digitos = soloDigitos(texto)
    return prospectos.filter(
      (p) =>
        (etapa === TODAS || p.etapa === etapa) &&
        (vendedorElegido === TODOS_LOS_VENDEDORES || String(p.vendedorId) === vendedorElegido) &&
        (!texto ||
          p.nombre.toLowerCase().includes(texto) ||
          (p.correo ?? '').toLowerCase().includes(texto) ||
          (/^\d+$/.test(digitos) && (p.telefono ?? '').includes(digitos))),
    )
  }, [prospectos, busqueda, etapa, vendedorElegido])

  function filtrarPorEtapa(valor: Etapa | typeof TODAS) {
    setEtapa(valor)
    setPagina(1)
    limpiarSeleccion()
  }

  function cambiarMostrarCerrados(mostrar: boolean) {
    setMostrarCerrados(mostrar)
    if (!mostrar && etapa === 'CERRADO') setEtapa(TODAS)
    setPagina(1)
    limpiarSeleccion()
  }

  // Al cambiar los filtros se suelta la selección, para no reasignar algo que
  // ya no se ve.
  function limpiarSeleccion() {
    setSeleccion(new Set())
  }

  function alternarSeleccion(ids: number[], marcar: boolean) {
    setSeleccion((actual) => {
      const nueva = new Set(actual)
      ids.forEach((id) => (marcar ? nueva.add(id) : nueva.delete(id)))
      return nueva
    })
  }

  function reemplazar(actualizado: Prospecto) {
    actualizar((actuales) =>
      (actuales ?? []).map((p) => (p.id === actualizado.id ? actualizado : p)),
    )
  }

  const puedeSeleccionar = !!vendedores && !finalizados
  const seleccionados = (datos ?? []).filter((p) => seleccion.has(p.id))

  const nombreVendedor = (p: Prospecto) =>
    vendedores?.find((v) => v.id === p.vendedorId)?.nombre ?? 'Vendedor sin acceso'

  // Un finalizado ya no cambia: solo se consulta su historial.
  const acciones: ManejadoresAcciones = {
    esVendedor: esVendedor && !finalizados,
    puedeReasignar: !!vendedores && !finalizados,
    onCambiarEtapa: (prospecto, sugerida) => setCambiando({ prospecto, etapa: sugerida }),
    onVerHistorial: setConsultando,
    onSolicitarCierre: setSolicitando,
    onFinalizar: setFinalizando,
    onReasignar: setReasignando,
    onDatosFiscales: setCapturandoFiscales,
  }

  const botonRegistrar =
    esVendedor && !finalizados ? (
      <Button asChild>
        <Link to={RUTA_REGISTRAR}>
          <Plus aria-hidden="true" />
          Registrar prospecto
        </Link>
      </Button>
    ) : undefined

  const filtroDeVendedor = vendedoresConProspectos.length > 1 && (
    <div className="flex flex-col gap-2 sm:w-64">
      <Label htmlFor={`vendedor-${lista}`}>Vendedor</Label>
      <Select
        value={vendedorElegido}
        onValueChange={(valor) => {
          setVendedor(valor)
          setPagina(1)
          limpiarSeleccion()
        }}
      >
        <SelectTrigger id={`vendedor-${lista}`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS_LOS_VENDEDORES}>Todos los vendedores</SelectItem>
          {vendedoresConProspectos.map((v) => (
            <SelectItem key={v.id} value={String(v.id)}>
              {v.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const total = prospectos.length
  const resumen = finalizados
    ? `${total} ${total === 1 ? 'prospecto finalizado' : 'prospectos finalizados'}`
    : esVendedor
      ? `${total} ${total === 1 ? 'prospecto asignado' : 'prospectos asignados'} a ti`
      : `Visibilidad de todo el equipo · ${total} ${total === 1 ? 'prospecto' : 'prospectos'}`

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={
          finalizados
            ? esVendedor
              ? 'Mis prospectos finalizados'
              : 'Prospectos finalizados del equipo'
            : esVendedor
              ? 'Mis prospectos'
              : 'Prospectos del equipo'
        }
        descripcion={
          finalizados
            ? 'Ventas entregadas al cliente. Ya no cambian de etapa.'
            : 'Da seguimiento a cada contacto desde una sola lista.'
        }
        accion={botonRegistrar}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los prospectos</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : cargando ? (
        <TablaCargando />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="buscar-prospecto">Buscar prospecto</Label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="buscar-prospecto"
                    type="search"
                    placeholder="Nombre, teléfono o correo"
                    className="pl-9"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value)
                      setPagina(1)
                      limpiarSeleccion()
                    }}
                  />
                </div>
              </div>
              {filtroDeVendedor}
            </div>

            {!finalizados && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                  role="group"
                  aria-label="Accesos rápidos por etapa"
                  className="flex flex-wrap gap-2"
                >
                  <ChipFiltro activo={etapa === TODAS} onClick={() => filtrarPorEtapa(TODAS)}>
                    Todos <span className="tabular-nums">{total}</span>
                  </ChipFiltro>
                  {ETAPAS.filter((e) => porEtapa.has(e)).map((e) => (
                    <ChipFiltro key={e} activo={etapa === e} onClick={() => filtrarPorEtapa(e)}>
                      {NOMBRES_ETAPA[e]} <span className="tabular-nums">{porEtapa.get(e)}</span>
                    </ChipFiltro>
                  ))}
                </div>
                <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer rounded accent-primary"
                    checked={mostrarCerrados}
                    onChange={(e) => cambiarMostrarCerrados(e.target.checked)}
                  />
                  Mostrar cerrados
                  <span className="tabular-nums">({cerrados})</span>
                </label>
              </div>
            )}

            <p className="text-sm text-muted-foreground">{resumen}</p>
          </div>

          {filtrados.length === 0 ? (
            <Card>
              {total === 0 && finalizados ? (
                <EstadoVacio
                  icono={BadgeCheck}
                  titulo="Aún no hay prospectos finalizados"
                  descripcion="Aquí aparecen cuando el vendedor finaliza la entrega."
                />
              ) : total === 0 ? (
                <EstadoVacio
                  icono={Users}
                  titulo={esVendedor ? 'Aún no tienes prospectos' : 'Aún no hay prospectos'}
                  descripcion={
                    esVendedor
                      ? 'Registra el primer contacto para comenzar.'
                      : 'Aquí aparecerán los prospectos que registren los vendedores.'
                  }
                  accion={botonRegistrar}
                />
              ) : (
                <EstadoVacio
                  icono={Search}
                  titulo="Ningún prospecto coincide"
                  descripcion="Prueba con otro nombre, teléfono, correo o etapa."
                />
              )}
            </Card>
          ) : (
            <>
              {puedeSeleccionar && seleccionados.length > 0 && (
                <div
                  role="region"
                  aria-label="Prospectos seleccionados"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-accent px-4 py-3"
                >
                  <p className="text-sm font-medium text-primary">
                    {seleccionados.length === 1
                      ? '1 prospecto seleccionado'
                      : `${seleccionados.length} prospectos seleccionados`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={limpiarSeleccion}>
                      Quitar selección
                    </Button>
                    <Button onClick={() => setReasignandoVarios(seleccionados)}>
                      <UserRoundPen aria-hidden="true" />
                      Reasignar seleccionados
                    </Button>
                  </div>
                </div>
              )}
              <Renglones
                prospectos={deLaPagina(filtrados, pagina, POR_PAGINA)}
                mostrarVendedor={!!vendedores}
                nombreVendedor={nombreVendedor}
                finalizados={finalizados}
                acciones={acciones}
                seleccion={puedeSeleccionar ? seleccion : undefined}
                onSeleccionar={alternarSeleccion}
              />
              <Paginacion
                pagina={pagina}
                porPagina={POR_PAGINA}
                total={filtrados.length}
                nombre="prospectos"
                onCambiar={setPagina}
              />
            </>
          )}
        </>
      )}

      <DialogoCambiarEtapa
        prospecto={cambiando?.prospecto ?? null}
        etapaSugerida={cambiando?.etapa}
        onCerrar={() => setCambiando(null)}
        onCambiado={(actualizado) => {
          reemplazar(actualizado)
          setCambiando(null)
          toast.success(`${actualizado.nombre} pasó a la etapa ${NOMBRES_ETAPA[actualizado.etapa]}.`)
        }}
      />
      <DialogoHistorial prospecto={consultando} onCerrar={() => setConsultando(null)} />
      <DialogoDatosFiscales
        prospecto={capturandoFiscales}
        onCerrar={() => setCapturandoFiscales(null)}
        onGuardado={(actualizado) => {
          reemplazar(actualizado)
          setCapturandoFiscales(null)
          toast.success(`Se guardaron los datos fiscales de ${actualizado.nombre}.`)
        }}
      />
      <DialogoSolicitarCierre
        prospecto={solicitando}
        onCerrar={() => setSolicitando(null)}
        onSolicitado={(actualizado) => {
          reemplazar(actualizado)
          setSolicitando(null)
          toast.success(`Se envió la solicitud de cierre de ${actualizado.nombre} al Administrador.`)
        }}
      />
      <DialogoFinalizar
        prospecto={finalizando}
        onCerrar={() => setFinalizando(null)}
        onFinalizado={(actualizado) => {
          reemplazar(actualizado)
          setFinalizando(null)
          toast.success(`${actualizado.nombre} quedó finalizado.`)
        }}
      />
      {vendedores && (
        <DialogoReasignar
          prospecto={reasignando}
          vendedores={vendedores}
          onCerrar={() => setReasignando(null)}
          onReasignado={(actualizado) => {
            reemplazar(actualizado)
            setReasignando(null)
            toast.success(`${actualizado.nombre} ahora lo atiende ${nombreVendedor(actualizado)}.`)
          }}
        />
      )}
      {vendedores && (
        <DialogoReasignarVarios
          prospectos={reasignandoVarios}
          vendedores={vendedores}
          onCerrar={() => setReasignandoVarios(null)}
          onReasignados={(reasignados, vendedor) => {
            const porId = new Map(reasignados.map((p) => [p.id, p]))
            actualizar((actuales) => (actuales ?? []).map((p) => porId.get(p.id) ?? p))
            setReasignandoVarios(null)
            limpiarSeleccion()
            toast.success(
              reasignados.length === 1
                ? `Se reasignó 1 prospecto a ${vendedor.nombre}.`
                : `Se reasignaron ${reasignados.length} prospectos a ${vendedor.nombre}.`,
            )
          }}
        />
      )}
    </section>
  )
}

export default ListaProspectos

function ChipFiltro({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        activo
          ? 'bg-accent text-primary ring-1 ring-primary/20'
          : 'bg-card text-muted-foreground ring-1 ring-border hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

const fechaDe = (p: Prospecto) => p.ultimoCambio ?? p.creadoEn

interface PropsRenglones {
  prospectos: Prospecto[]
  mostrarVendedor: boolean
  nombreVendedor: (p: Prospecto) => string
  /** En Finalizados la fecha es la de entrega, sin hora. */
  finalizados: boolean
  acciones: ManejadoresAcciones
  /** Si viene, cada renglón se puede seleccionar (reasignación en masa). */
  seleccion?: ReadonlySet<number>
  onSeleccionar: (ids: number[], marcar: boolean) => void
}

function CasillaSeleccion({
  marcada,
  etiqueta,
  onCambiar,
  className,
}: {
  marcada: boolean
  etiqueta: string
  onCambiar: (marcar: boolean) => void
  className?: string
}) {
  return (
    <input
      type="checkbox"
      aria-label={etiqueta}
      className={cn('size-4 cursor-pointer accent-primary', className)}
      checked={marcada}
      onChange={(e) => onCambiar(e.target.checked)}
    />
  )
}

/**
 * La unidad que eligió Facturación para un finalizado (CRM-1.4): Tipo y Modelo
 * como en la factura, con el VIN abajo.
 */
function Vehiculo({ prospecto }: { prospecto: Prospecto }) {
  if (!prospecto.vehiculo) {
    return <span className="text-sm text-muted-foreground">Sin unidad asignada</span>
  }
  return (
    <span className="flex flex-col">
      <span className="font-medium">
        {prospecto.vehiculo.modelo} {prospecto.vehiculo.anio}
      </span>
      <span className="font-mono text-xs text-muted-foreground">{prospecto.vehiculo.vin}</span>
    </span>
  )
}

/** En un cerrado, por qué no se concretó (CRM-1.2). */
function MotivoDelCierre({ prospecto }: { prospecto: Prospecto }) {
  if (prospecto.etapa !== 'CERRADO' || !prospecto.motivoCierre) return null
  return (
    <span className="block text-xs text-muted-foreground">
      {NOMBRES_MOTIVO[prospecto.motivoCierre]}
    </span>
  )
}

function Renglones({
  prospectos,
  mostrarVendedor,
  nombreVendedor,
  finalizados,
  acciones,
  seleccion,
  onSeleccionar,
}: PropsRenglones) {
  const movil = useIsMobile()
  const idsPagina = prospectos.map((p) => p.id)
  const paginaCompleta = !!seleccion && idsPagina.every((id) => seleccion.has(id))

  if (!movil) {
    return (
      <Card className="py-0 md:py-0">
        <Table aria-label="Prospectos">
          <TableHeader>
            <TableRow>
              {seleccion && (
                <TableHead className="w-10">
                  <CasillaSeleccion
                    marcada={paginaCompleta}
                    etiqueta="Seleccionar los prospectos de esta página"
                    onCambiar={(marcar) => onSeleccionar(idsPagina, marcar)}
                  />
                </TableHead>
              )}
              <TableHead>Prospecto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>{finalizados ? 'Vehículo' : 'Etapa'}</TableHead>
              {mostrarVendedor && <TableHead>Vendedor</TableHead>}
              <TableHead>{finalizados ? 'Fecha de entrega' : 'Último cambio'}</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospectos.map((p) => (
              <TableRow key={p.id} data-state={seleccion?.has(p.id) ? 'selected' : undefined}>
                {seleccion && (
                  <TableCell className="w-10">
                    <CasillaSeleccion
                      marcada={seleccion.has(p.id)}
                      etiqueta={`Seleccionar a ${p.nombre}`}
                      onCambiar={(marcar) => onSeleccionar([p.id], marcar)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <span className="nombre block font-medium">{p.nombre}</span>
                  {p.correo && <span className="text-xs text-muted-foreground">{p.correo}</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatearTelefono(p.telefono)}
                </TableCell>
                <TableCell>
                  {finalizados ? (
                    <Vehiculo prospecto={p} />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <EtapaChip etapa={p.etapa} />
                      <MotivoDelCierre prospecto={p} />
                    </div>
                  )}
                </TableCell>
                {mostrarVendedor && <TableCell>{nombreVendedor(p)}</TableCell>}
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {finalizados ? formatearFecha(fechaDe(p)) : formatearFechaCorta(fechaDe(p))}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <AccionesProspecto prospecto={p} acciones={acciones} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <ul aria-label="Prospectos" className="flex flex-col gap-3">
      {prospectos.map((p) => (
        <li key={p.id}>
          <Card className="gap-3 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              {seleccion && (
                <CasillaSeleccion
                  marcada={seleccion.has(p.id)}
                  etiqueta={`Seleccionar a ${p.nombre}`}
                  onCambiar={(marcar) => onSeleccionar([p.id], marcar)}
                  className="mt-1 size-5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="nombre font-semibold text-primary">{p.nombre}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatearTelefono(p.telefono) || p.correo}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                <EtapaChip etapa={p.etapa} />
                <MotivoDelCierre prospecto={p} />
              </div>
            </div>
            {finalizados && (
              <div className="px-4">
                <Vehiculo prospecto={p} />
              </div>
            )}
            {(mostrarVendedor || finalizados) && (
              <p className="px-4 text-sm text-muted-foreground">
                {[
                  mostrarVendedor ? nombreVendedor(p) : null,
                  finalizados ? `Entregado el ${formatearFecha(fechaDe(p))}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            <div className="border-t px-4 pt-3">
              <AccionesProspecto prospecto={p} acciones={acciones} tactil />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SIN_CORREO = 'Escribe el correo del cliente o marca que no quiere la app.'

/**
 * Confirmación al entregar la unidad: un prospecto finalizado ya no cambia. Si
 * el cliente no quiere la app CareCar, no se le crea la cuenta (decisión del PO,
 * Sprint 2). Si sí la quiere, hace falta su correo: sin él no se deja finalizar
 * (acordado con Ricardo, para que un evento sin correo siempre signifique "no
 * quiere la app").
 */
function DialogoFinalizar({
  prospecto,
  onCerrar,
  onFinalizado,
}: {
  prospecto: Prospecto | null
  onCerrar: () => void
  onFinalizado: (prospecto: Prospecto) => void
}) {
  const mensajeDeError = useMensajeDeError()
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [sinApp, setSinApp] = useState(false)
  const [correo, setCorreo] = useState('')
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null)
  const pideCorreo = !!prospecto && !prospecto.correo && !sinApp

  function limpiar() {
    setError(null)
    setSinApp(false)
    setCorreo('')
    setErrorCorreo(null)
  }

  async function finalizar(evento: MouseEvent) {
    // Se mantiene abierto hasta que el servidor confirme.
    evento.preventDefault()
    if (!prospecto) return
    const correoLimpio = correo.trim()
    if (pideCorreo && !CORREO_VALIDO.test(correoLimpio)) {
      setErrorCorreo(correoLimpio ? 'Escribe un correo válido.' : SIN_CORREO)
      return
    }
    setErrorCorreo(null)
    setGuardando(true)
    setError(null)
    try {
      const finalizado = await cambiarEtapa(prospecto.id, 'FINALIZADO', undefined, {
        clienteRechazaApp: sinApp,
        correoCliente: pideCorreo ? correoLimpio : undefined,
      })
      limpiar()
      onFinalizado(finalizado)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) setError(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AlertDialog
      open={prospecto !== null}
      onOpenChange={(abrir) => {
        if (!abrir) {
          limpiar()
          onCerrar()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-primary">¿Finalizar el prospecto?</AlertDialogTitle>
          <AlertDialogDescription>
            Confirma que ya entregaste la unidad a {prospecto?.nombre}. Un prospecto
            finalizado ya no cambia de etapa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 cursor-pointer accent-primary"
            checked={sinApp}
            onChange={(e) => setSinApp(e.target.checked)}
            aria-labelledby="sin-app-titulo"
            aria-describedby="sin-app-ayuda"
          />
          <span className="flex flex-col gap-1">
            <span id="sin-app-titulo" className="font-medium">
              El cliente no quiere la app CareCar
            </span>
            <span id="sin-app-ayuda" className="text-muted-foreground">
              {sinApp
                ? 'No se le creará cuenta en la app.'
                : prospecto?.correo
                  ? `Su cuenta de la app se creará con ${prospecto.correo}.`
                  : 'Para crear su cuenta de la app hace falta su correo.'}
            </span>
          </span>
        </label>
        {pideCorreo && (
          <Field data-invalid={!!errorCorreo}>
            <FieldLabel htmlFor="correo-cliente">Correo del cliente</FieldLabel>
            <Input
              id="correo-cliente"
              type="email"
              autoComplete="off"
              maxLength={120}
              placeholder="cliente@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              aria-invalid={!!errorCorreo || undefined}
              aria-describedby={errorCorreo ? 'correo-cliente-error' : undefined}
            />
            <FieldError
              id="correo-cliente-error"
              errors={errorCorreo ? [{ message: errorCorreo }] : []}
            />
          </Field>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={finalizar} disabled={guardando}>
            {guardando ? 'Finalizando…' : 'Finalizar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
