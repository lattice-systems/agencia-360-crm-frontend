import { Car, Contact, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  type ClienteDetalle,
  type ClienteResumen,
} from '../clientes/api.ts'
import { DialogoAgregarCliente } from '../clientes/DialogoAgregarCliente.tsx'
import { DialogoCliente } from '../clientes/DialogoCliente.tsx'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
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

/** Del detalle del backend al renglón de la lista. */
function resumenDe(cliente: ClienteDetalle): ClienteResumen {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    correo: cliente.correo,
    telefono: cliente.telefono,
    vehiculos: cliente.vehiculos.length,
    creadoEn: cliente.creadoEn,
  }
}

/**
 * Clientes de la agencia (CRM-1.5), separados de los usuarios internos, con su
 * cuenta de la app y sus vehículos (CRM-1.3). Solo el Gerente de marketing.
 */
export function ClientesPage() {
  const { datos, cargando, error, recargar, actualizar } = useConsulta(listarClientes)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [viendo, setViendo] = useState<ClienteResumen | null>(null)
  const [agregando, setAgregando] = useState(false)

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

  function reemplazar(cliente: ClienteDetalle) {
    const renglon = resumenDe(cliente)
    actualizar((actuales) => {
      const lista = actuales ?? []
      const existe = lista.some((c) => c.id === renglon.id)
      return (existe ? lista.map((c) => (c.id === renglon.id ? renglon : c)) : [...lista, renglon]).sort(
        (a, b) => a.nombre.localeCompare(b.nombre),
      )
    })
  }

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Clientes"
        descripcion="Clientes de la agencia y sus vehículos. Se registran cuando su prospecto llega a Finalizado."
        accion={
          <Button onClick={() => setAgregando(true)} disabled={!datos}>
            <Plus aria-hidden="true" />
            Agregar cliente
          </Button>
        }
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
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {clientes.length === 0 ? <Contact /> : <Search />}
                </EmptyMedia>
                <EmptyTitle>
                  {clientes.length === 0 ? 'Aún no hay clientes' : 'Ningún cliente coincide'}
                </EmptyTitle>
                <EmptyDescription>
                  {clientes.length === 0
                    ? 'Aparecen aquí cuando un prospecto llega a Finalizado.'
                    : 'Prueba con otro nombre o correo.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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

      <DialogoCliente
        cliente={viendo}
        onCerrar={() => setViendo(null)}
        onActualizado={reemplazar}
      />
      <DialogoAgregarCliente
        abierto={agregando}
        onCerrar={() => setAgregando(false)}
        onCreado={(cliente) => {
          reemplazar(cliente)
          setAgregando(false)
          toast.success(`Cliente ${cliente.nombre} agregado.`)
          setViendo(resumenDe(cliente))
        }}
      />
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
