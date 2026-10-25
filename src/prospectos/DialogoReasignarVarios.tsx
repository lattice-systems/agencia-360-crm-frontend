import { Info } from 'lucide-react'
import { useState } from 'react'
import type { UsuarioApi } from '../api/acceso.ts'
import { useMensajeDeError } from '../api/useConsulta.ts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { reasignarProspectos } from './reasignacion.ts'
import type { Prospecto } from './tipos.ts'

interface Props {
  /** Prospectos elegidos; con null el diálogo está cerrado. */
  prospectos: Prospecto[] | null
  vendedores: UsuarioApi[]
  onCerrar: () => void
  onReasignados: (prospectos: Prospecto[], vendedor: UsuarioApi) => void
}

const SIN_VENDEDOR = 'Elige el nuevo vendedor.'

/**
 * Reasignación en masa (CRM-UX-1, confirmada por el SM en el Sprint 2): el
 * Gerente de marketing pasa varios prospectos a un mismo vendedor. Todos o
 * ninguno.
 */
export function DialogoReasignarVarios({
  prospectos,
  vendedores,
  onCerrar,
  onReasignados,
}: Props) {
  const mensajeDeError = useMensajeDeError()
  const [vendedorId, setVendedorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cuantos = prospectos?.length ?? 0
  // Si todos ya son del mismo vendedor, no se ofrece ese.
  const actuales = new Set(prospectos?.map((p) => p.vendedorId))
  const opciones = vendedores.filter((v) => !(actuales.size === 1 && actuales.has(v.id)))

  function cerrar() {
    setVendedorId('')
    setError(null)
    onCerrar()
  }

  async function reasignar() {
    if (!prospectos) return
    const vendedor = vendedores.find((v) => String(v.id) === vendedorId)
    if (!vendedor) {
      setError(SIN_VENDEDOR)
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const reasignados = await reasignarProspectos(
        prospectos.map((p) => p.id),
        vendedor.id,
      )
      setVendedorId('')
      onReasignados(reasignados, vendedor)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) setError(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={prospectos !== null} onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reasignar prospectos</DialogTitle>
          <DialogDescription>
            {cuantos === 1 ? '1 prospecto elegido' : `${cuantos} prospectos elegidos`}. Todos
            pasarán al mismo vendedor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ul className="max-h-32 overflow-y-auto rounded-md border px-3 py-2 text-sm">
            {prospectos?.map((p) => (
              <li key={p.id} className="py-0.5">
                {p.nombre}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vendedor-varios">Nuevo vendedor</Label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger
                id="vendedor-varios"
                className="w-full"
                aria-invalid={error === SIN_VENDEDOR || undefined}
              >
                <SelectValue placeholder="Selecciona un vendedor" />
              </SelectTrigger>
              <SelectContent>
                {opciones.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Alert role="note">
            <Info aria-hidden="true" />
            <AlertTitle>Cambiará la visibilidad</AlertTitle>
            <AlertDescription>
              Los prospectos quedarán disponibles para el vendedor seleccionado y conservan su
              etapa.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={reasignar} disabled={guardando}>
            {guardando ? 'Reasignando…' : `Reasignar ${cuantos}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
