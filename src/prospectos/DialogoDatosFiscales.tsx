import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useMensajeDeError } from '../api/useConsulta.ts'
import { capturarDatosFiscales } from './api.ts'
import { CamposDatosFiscales } from './CamposDatosFiscales.tsx'
import {
  DATOS_FISCALES_VACIOS,
  validarDatosFiscales,
  type DatosFiscales,
  type ErroresDatosFiscales,
} from './datosFiscales.ts'
import type { Prospecto } from './tipos.ts'

interface Props {
  /** Prospecto en Pago; con null está cerrado. */
  prospecto: Prospecto | null
  onCerrar: () => void
  onGuardado: (prospecto: Prospecto) => void
}

/**
 * El vendedor captura o corrige los datos fiscales de un prospecto en Pago
 * (ERP-1.3). Sirve para los que llegaron a Pago antes de que se pidieran y para
 * corregir un error antes de que Contabilidad valide los pagos.
 */
export function DialogoDatosFiscales({ prospecto, onCerrar, onGuardado }: Props) {
  const mensajeDeError = useMensajeDeError()
  const [valores, setValores] = useState<DatosFiscales>(DATOS_FISCALES_VACIOS)
  const [errores, setErrores] = useState<ErroresDatosFiscales>({})
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [abiertoPara, setAbiertoPara] = useState<number | null>(null)

  // Al abrir se cargan los datos que ya tiene, o el nombre del prospecto.
  if (prospecto && abiertoPara !== prospecto.id) {
    setAbiertoPara(prospecto.id)
    const actuales = prospecto.datosFiscales
    setValores(
      actuales
        ? {
            rfc: actuales.rfc,
            nombre: actuales.nombre,
            domicilio: actuales.domicilio,
            regimenFiscal: actuales.regimenFiscal,
          }
        : { ...DATOS_FISCALES_VACIOS, nombre: prospecto.nombre },
    )
    setErrores({})
    setErrorApi(null)
  }

  function cerrar() {
    setAbiertoPara(null)
    onCerrar()
  }

  async function guardar() {
    if (!prospecto) return
    const validacion = validarDatosFiscales(valores)
    if (validacion.errores) {
      setErrores(validacion.errores)
      return
    }
    setGuardando(true)
    setErrorApi(null)
    try {
      const actualizado = await capturarDatosFiscales(prospecto.id, validacion.datos)
      setAbiertoPara(null)
      onGuardado(actualizado)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) setErrorApi(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={prospecto !== null} onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Datos fiscales</DialogTitle>
          <DialogDescription>
            <span className="block font-medium text-foreground">{prospecto?.nombre}</span>
            Se pueden corregir mientras el prospecto está en Pago.
          </DialogDescription>
        </DialogHeader>

        {prospecto && (
          <div className="flex flex-col gap-5">
            {!prospecto.datosFiscales && (
              <Alert>
                <AlertDescription>
                  Contabilidad no puede validar los pagos hasta que captures estos datos.
                </AlertDescription>
              </Alert>
            )}
            <CamposDatosFiscales
              valores={valores}
              errores={errores}
              onCambiar={(nuevos) => {
                setValores(nuevos)
                setErrores({})
              }}
            />
            {errorApi && (
              <Alert variant="destructive">
                <AlertDescription>{errorApi}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Separator />
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar datos fiscales'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
