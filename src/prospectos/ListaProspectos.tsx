import {
  CheckCheck,
  Ellipsis,
  History,
  Plus,
  Search,
  SquarePen,
  UserRoundCog,
  Users,
  XCircle,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cambiarEtapa, listarProspectos } from './api.ts'
import { DialogoCambiarEtapa } from './DialogoCambiarEtapa.tsx'
import { DialogoHistorial } from './DialogoHistorial.tsx'
import { DialogoReasignar } from './DialogoReasignar.tsx'
import { DialogoSolicitarCierre } from './DialogoSolicitarCierre.tsx'
import { EtapaChip } from './EtapaChip.tsx'
import { formatearFechaCorta, formatearTelefono, soloDigitos } from './formato.ts'
import {
  esEtapaInicial,
  estaEnProcesoDeVenta,
  ETAPAS,
  NOMBRES_ETAPA,
  type Etapa,
  type Prospecto,
} from './tipos.ts'

const POR_PAGINA = 10
const TODAS = 'TODAS'

interface Props {
  /** Si se indican, se ofrece reasignar (CRM-0.1, Gerente de marketing). */
  vendedores?: UsuarioApi[]
  /**
   * Solo el vendedor cambia etapas, finaliza y solicita cierres (decisión del
   * PO del 12 de octubre). Sin ese permiso la lista es de consulta.
   */
  puedeCambiarEtapa?: boolean
}

/**
 * CRM-1.1 (MVP): lista filtrable por etapa con búsqueda (mockups pp. 14, 17 y
 * 18). La visibilidad (Ventas solo ve los suyos) la aplica el servidor.
 */
function ListaProspectos({ vendedores, puedeCambiarEtapa = true }: Props) {
  const { datos, cargando, error, recargar, actualizar } = useConsulta(listarProspectos)
  const [busqueda, setBusqueda] = useState('')
  const [etapa, setEtapa] = useState<Etapa | typeof TODAS>(TODAS)
  const [pagina, setPagina] = useState(1)
  const [cambiando, setCambiando] = useState<Prospecto | null>(null)
  const [consultando, setConsultando] = useState<Prospecto | null>(null)
  const [solicitando, setSolicitando] = useState<Prospecto | null>(null)
  const [finalizando, setFinalizando] = useState<Prospecto | null>(null)
  const [reasignando, setReasignando] = useState<Prospecto | null>(null)

  const esVendedor = puedeCambiarEtapa
  const prospectos = useMemo(() => datos ?? [], [datos])
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
        (!texto ||
          p.nombre.toLowerCase().includes(texto) ||
          (p.correo ?? '').toLowerCase().includes(texto) ||
          (/^\d+$/.test(digitos) && (p.telefono ?? '').includes(digitos))),
    )
  }, [prospectos, busqueda, etapa])

  function filtrarPorEtapa(valor: Etapa | typeof TODAS) {
    setEtapa(valor)
    setPagina(1)
  }

  function reemplazar(actualizado: Prospecto) {
    actualizar((actuales) =>
      (actuales ?? []).map((p) => (p.id === actualizado.id ? actualizado : p)),
    )
  }

  const nombreVendedor = (p: Prospecto) =>
    vendedores?.find((v) => v.id === p.vendedorId)?.nombre ?? 'Vendedor sin acceso'

  const acciones: AccionesProspecto = {
    esVendedor,
    puedeReasignar: !!vendedores,
    onCambiarEtapa: setCambiando,
    onVerHistorial: setConsultando,
    onSolicitarCierre: setSolicitando,
    onFinalizar: setFinalizando,
    onReasignar: setReasignando,
  }

  const botonRegistrar = esVendedor ? (
    <Button asChild>
      <Link to="/registrar">
        <Plus aria-hidden="true" />
        Registrar prospecto
      </Link>
    </Button>
  ) : undefined

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={esVendedor ? 'Mis prospectos' : 'Prospectos del equipo'}
        descripcion="Da seguimiento a cada contacto desde una sola lista."
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
            <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
              <div className="flex flex-col gap-2">
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
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filtro-etapa">Etapa</Label>
                <Select
                  value={etapa}
                  onValueChange={(valor) => filtrarPorEtapa(valor as Etapa | typeof TODAS)}
                >
                  <SelectTrigger id="filtro-etapa" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODAS}>Todas las etapas</SelectItem>
                    {ETAPAS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {NOMBRES_ETAPA[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {prospectos.length > 0 && (
              <div role="group" aria-label="Accesos rápidos por etapa" className="flex flex-wrap gap-2">
                <ChipFiltro activo={etapa === TODAS} onClick={() => filtrarPorEtapa(TODAS)}>
                  Todos <span className="tabular-nums">{prospectos.length}</span>
                </ChipFiltro>
                {ETAPAS.filter((e) => porEtapa.has(e)).map((e) => (
                  <ChipFiltro key={e} activo={etapa === e} onClick={() => filtrarPorEtapa(e)}>
                    {NOMBRES_ETAPA[e]} <span className="tabular-nums">{porEtapa.get(e)}</span>
                  </ChipFiltro>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {esVendedor
                ? `${prospectos.length} ${prospectos.length === 1 ? 'prospecto asignado' : 'prospectos asignados'} a ti`
                : `Visibilidad de todo el equipo · ${prospectos.length} ${prospectos.length === 1 ? 'prospecto' : 'prospectos'}`}
            </p>
          </div>

          {filtrados.length === 0 ? (
            <Card>
              {prospectos.length === 0 ? (
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
              <Renglones
                prospectos={deLaPagina(filtrados, pagina, POR_PAGINA)}
                mostrarVendedor={!!vendedores}
                nombreVendedor={nombreVendedor}
                acciones={acciones}
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
        prospecto={cambiando}
        onCerrar={() => setCambiando(null)}
        onCambiado={(actualizado) => {
          reemplazar(actualizado)
          setCambiando(null)
          toast.success(`${actualizado.nombre} pasó a la etapa ${NOMBRES_ETAPA[actualizado.etapa]}.`)
        }}
      />
      <DialogoHistorial prospecto={consultando} onCerrar={() => setConsultando(null)} />
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

interface AccionesProspecto {
  esVendedor: boolean
  puedeReasignar: boolean
  onCambiarEtapa: (p: Prospecto) => void
  onVerHistorial: (p: Prospecto) => void
  onSolicitarCierre: (p: Prospecto) => void
  onFinalizar: (p: Prospecto) => void
  onReasignar: (p: Prospecto) => void
}

interface PropsRenglones {
  prospectos: Prospecto[]
  mostrarVendedor: boolean
  nombreVendedor: (p: Prospecto) => string
  acciones: AccionesProspecto
}

function Renglones({ prospectos, mostrarVendedor, nombreVendedor, acciones }: PropsRenglones) {
  const movil = useIsMobile()
  const etapa = (p: Prospecto) => (
    <div className="flex flex-col items-start gap-1">
      <EtapaChip etapa={p.etapa} />
      {p.cierrePendiente && (
        <span className="text-xs text-muted-foreground">Cierre solicitado</span>
      )}
    </div>
  )

  if (!movil) {
    return (
      <Card className="py-0 md:py-0">
        <Table aria-label="Prospectos">
          <TableHeader>
            <TableRow>
              <TableHead>Prospecto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Etapa</TableHead>
              {mostrarVendedor && <TableHead>Vendedor</TableHead>}
              <TableHead>Último cambio</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospectos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <span className="nombre block font-medium">{p.nombre}</span>
                  {p.correo && <span className="text-xs text-muted-foreground">{p.correo}</span>}
                </TableCell>
                <TableCell className="tabular-nums">{formatearTelefono(p.telefono)}</TableCell>
                <TableCell>{etapa(p)}</TableCell>
                {mostrarVendedor && <TableCell>{nombreVendedor(p)}</TableCell>}
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatearFechaCorta(p.ultimoCambio ?? p.creadoEn)}
                </TableCell>
                <TableCell className="w-12 text-right">
                  <MenuProspecto prospecto={p} acciones={acciones} />
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
          <Card className="gap-2 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              <div className="min-w-0">
                <p className="nombre font-semibold text-primary">{p.nombre}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatearTelefono(p.telefono) || p.correo}
                </p>
              </div>
              <MenuProspecto prospecto={p} acciones={acciones} />
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4">
              {etapa(p)}
              {mostrarVendedor && (
                <span className="text-sm text-muted-foreground">{nombreVendedor(p)}</span>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

/** Menú de cada renglón: solo ofrece lo que el rol y la etapa permiten. */
function MenuProspecto({ prospecto: p, acciones }: { prospecto: Prospecto; acciones: AccionesProspecto }) {
  const vendedor = acciones.esVendedor
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${p.nombre}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {vendedor && esEtapaInicial(p.etapa) && (
          <DropdownMenuItem onSelect={() => acciones.onCambiarEtapa(p)}>
            <SquarePen aria-hidden="true" />
            Cambiar etapa
          </DropdownMenuItem>
        )}
        {vendedor && p.etapa === 'ENTREGA' && (
          <DropdownMenuItem onSelect={() => acciones.onFinalizar(p)}>
            <CheckCheck aria-hidden="true" />
            Finalizar
          </DropdownMenuItem>
        )}
        {vendedor && estaEnProcesoDeVenta(p.etapa) && (
          <DropdownMenuItem disabled={p.cierrePendiente} onSelect={() => acciones.onSolicitarCierre(p)}>
            <XCircle aria-hidden="true" />
            {p.cierrePendiente ? 'Cierre ya solicitado' : 'Solicitar cierre'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => acciones.onVerHistorial(p)}>
          <History aria-hidden="true" />
          Ver historial
        </DropdownMenuItem>
        {acciones.puedeReasignar && (
          <DropdownMenuItem onSelect={() => acciones.onReasignar(p)}>
            <UserRoundCog aria-hidden="true" />
            Reasignar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Confirmación al entregar la unidad: un prospecto finalizado ya no cambia. */
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

  async function finalizar(evento: MouseEvent) {
    // Se mantiene abierto hasta que el servidor confirme.
    evento.preventDefault()
    if (!prospecto) return
    setGuardando(true)
    setError(null)
    try {
      onFinalizado(await cambiarEtapa(prospecto.id, 'FINALIZADO'))
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
          setError(null)
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
