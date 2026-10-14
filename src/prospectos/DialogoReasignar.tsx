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
import { reasignarProspecto } from './reasignacion.ts'
import type { Prospecto } from './tipos.ts'

interface Props {
  /** Prospecto a reasignar; con null el diálogo está cerrado. */
  prospecto: Prospecto | null
  vendedores: UsuarioApi[]
  onCerrar: () => void
  onReasignado: (prospecto: Prospecto) => void
}

/** Reasignación de un prospecto a otro vendedor (CRM-0.1, solo el gerente). */
export function DialogoReasignar({
  prospecto,
  vendedores,
  onCerrar,
  onReasignado,
}: Props) {
  const mensajeDeError = useMensajeDeError()
  const [vendedorId, setVendedorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [abiertoPara, setAbiertoPara] = useState<number | null>(null)

  // Al abrir para otro prospecto se limpia lo elegido antes.
  if (prospecto && abiertoPara !== prospecto.id) {
    setAbiertoPara(prospecto.id)
    setVendedorId('')
    setError(null)
  }

  const actual = vendedores.find((v) => v.id === prospecto?.vendedorId)
  const opciones = vendedores.filter((v) => v.id !== prospecto?.vendedorId)

  function cerrar() {
    setAbiertoPara(null)
    onCerrar()
  }

  async function reasignar() {
    if (!prospecto) {
      return
    }
    if (!vendedorId) {
      setError('Elige el nuevo vendedor.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const actualizado = await reasignarProspecto(prospecto.id, Number(vendedorId))
      setAbiertoPara(null)
      onReasignado(actualizado)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) {
        setError(mensaje)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={prospecto !== null} onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">
            Reasignar prospecto
          </DialogTitle>
          <DialogDescription>
            <span className="block font-semibold text-foreground">
              {prospecto?.nombre}
            </span>
            Asignado actualmente a {actual?.nombre ?? 'un vendedor sin acceso'}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nuevo-vendedor">Nuevo vendedor</Label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger
                id="nuevo-vendedor"
                className="w-full"
                aria-invalid={error === 'Elige el nuevo vendedor.' || undefined}
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
          <Alert variant="informacion" role="note">
            <Info aria-hidden="true" />
            <AlertTitle>Cambiará la visibilidad</AlertTitle>
            <AlertDescription>
              El prospecto quedará disponible para el vendedor seleccionado.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={reasignar} disabled={guardando}>
            {guardando ? 'Reasignando…' : 'Reasignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
