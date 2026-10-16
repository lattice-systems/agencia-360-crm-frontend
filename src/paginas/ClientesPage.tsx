import { Car, Contact, Search } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { deLaPagina } from '@/lib/paginacion'
import { useConsulta } from '../api/useConsulta.ts'
import {
  listarClientes,
  obtenerCliente,
  type ClienteResumen,
} from '../clientes/api.ts'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { EstadoVacio } from '../componentes/EstadoVacio.tsx'
import { Paginacion } from '../componentes/Paginacion.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { formatearTelefono } from '../prospectos/formato.ts'

const POR_PAGINA = 10

const SIN_CORREO = 'Sin correo (no usa la app)'

const fechaAlta = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatearAlta(iso: string): string {
  return fechaAlta.format(new Date(iso)).replace('.', '')
}

function textoVehiculos(cantidad: number): string {
  return cantidad === 1 ? '1 vehículo' : `${cantidad} vehículos`
}

/**
 * Clientes de la agencia (CRM-1.5), separados de los usuarios internos. Solo
 * los consulta el Gerente de marketing.
 */
export function ClientesPage() {
  const { datos, cargando, error, recargar } = useConsulta(listarClientes)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [viendo, setViendo] = useState<ClienteResumen | null>(null)

  const clientes = useMemo(() => datos ?? [], [datos])
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return clientes.filter(
      (c) =>
        !texto ||
        c.nombre.toLowerCase().includes(texto) ||
        (c.correo ?? '').includes(texto),
    )
  }, [clientes, busqueda])

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Clientes"
        descripcion="Clientes de la agencia y sus vehículos. Se registran cuando su prospecto llega a Finalizado."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los clientes</AlertTitle>
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
          <div className="flex flex-col gap-2 md:max-w-md">
            <Label htmlFor="buscar-cliente">Buscar cliente</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="buscar-cliente"
                type="search"
                placeholder="Nombre o correo"
                className="pl-9"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
              />
            </div>
          </div>

          {filtrados.length === 0 ? (
            <Card>
              <EstadoVacio
                icono={clientes.length === 0 ? Contact : Search}
                titulo={
                  clientes.length === 0
                    ? 'Aún no hay clientes'
                    : 'Ningún cliente coincide'
                }
                descripcion={
                  clientes.length === 0
                    ? 'Aparecen aquí cuando un prospecto llega a Finalizado.'
                    : 'Prueba con otro nombre o correo.'
                }
              />
            </Card>
          ) : (
            <>
              <ListaClientes
                clientes={deLaPagina(filtrados, pagina, POR_PAGINA)}
                onVer={setViendo}
              />
              <Paginacion
                pagina={pagina}
                porPagina={POR_PAGINA}
                total={filtrados.length}
                nombre="clientes"
                onCambiar={setPagina}
              />
            </>
          )}
        </>
      )}

      <DialogoVehiculos cliente={viendo} onCerrar={() => setViendo(null)} />
    </section>
  )
}

interface PropsLista {
  clientes: ClienteResumen[]
  onVer: (cliente: ClienteResumen) => void
}

function ListaClientes({ clientes, onVer }: PropsLista) {
  const movil = useIsMobile()
  const botonVer = (c: ClienteResumen) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Ver vehículos de ${c.nombre}`}
      onClick={() => onVer(c)}
    >
      <Car aria-hidden="true" />
      {textoVehiculos(c.vehiculos)}
    </Button>
  )

  if (!movil) {
    return (
      <Card className="py-0 md:py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente / correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Cliente desde</TableHead>
              <TableHead>Vehículos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span className="block font-medium">{c.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.correo ?? SIN_CORREO}
                  </span>
                </TableCell>
                <TableCell>{formatearTelefono(c.telefono) || '—'}</TableCell>
                <TableCell>{formatearAlta(c.creadoEn)}</TableCell>
                <TableCell>{botonVer(c)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {clientes.map((c) => (
        <li key={c.id}>
          <Card className="gap-2 py-4">
            <div className="px-4">
              <p className="font-semibold">{c.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {c.correo ?? SIN_CORREO}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 text-sm text-muted-foreground">
              <span>{formatearTelefono(c.telefono) || 'Sin teléfono'}</span>
              {botonVer(c)}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function DialogoVehiculos({
  cliente,
  onCerrar,
}: {
  cliente: ClienteResumen | null
  onCerrar: () => void
}) {
  return (
    <Dialog open={cliente !== null} onOpenChange={(abrir) => !abrir && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vehículos de {cliente?.nombre}</DialogTitle>
          <DialogDescription>
            {cliente?.correo ?? SIN_CORREO}
          </DialogDescription>
        </DialogHeader>
        {cliente && <DetalleVehiculos clienteId={cliente.id} />}
      </DialogContent>
    </Dialog>
  )
}

function DetalleVehiculos({ clienteId }: { clienteId: number }) {
  const consulta = useCallback(() => obtenerCliente(clienteId), [clienteId])
  const { datos, cargando, error } = useConsulta(consulta)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (cargando || !datos) {
    return <p className="text-sm text-muted-foreground">Cargando vehículos…</p>
  }
  if (datos.vehiculos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este cliente todavía no tiene vehículos.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {datos.vehiculos.map((v) => (
        <li key={v.id} className="rounded-md border p-3">
          <p className="font-medium">
            {v.modelo} {v.anio}
          </p>
          <p className="font-mono text-xs text-muted-foreground">VIN {v.vin}</p>
          <p className="text-sm text-muted-foreground">
            {v.placas ? `Placas ${v.placas}` : 'Sin placas registradas'}
            {v.kilometraje !== null &&
              ` · ${v.kilometraje.toLocaleString('es-MX')} km`}
          </p>
        </li>
      ))}
    </ul>
  )
}
