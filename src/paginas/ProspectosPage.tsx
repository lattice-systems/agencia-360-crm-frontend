import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { UsuarioApi } from '../api/acceso.ts'
import { listarVendedores } from '../prospectos/reasignacion.ts'
import ListaProspectos from '../prospectos/ListaProspectos.tsx'
import { useSesion } from '../sesion/useSesion.ts'

// Ventas ve la lista y cambia la etapa de sus prospectos. El Gerente de
// marketing ve todos y puede reasignar (el selector aparece en cuanto se cargan
// los vendedores, CRM-0.1), pero no cambia etapas (decisión del PO).
export function ProspectosPage() {
  const { sesion } = useSesion()
  const esGerente = sesion?.rol === 'GERENTE_MARKETING'
  const [vendedores, setVendedores] = useState<UsuarioApi[] | null>(null)
  const [errorVendedores, setErrorVendedores] = useState(false)

  useEffect(() => {
    if (!esGerente) {
      return
    }
    let vigente = true
    listarVendedores()
      .then((lista) => {
        if (vigente) setVendedores(lista)
      })
      .catch(() => {
        if (vigente) setErrorVendedores(true)
      })
    return () => {
      vigente = false
    }
  }, [esGerente])

  return (
    <>
      {errorVendedores && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            No se pudo cargar la lista de vendedores; por ahora no se puede
            reasignar.
          </AlertDescription>
        </Alert>
      )}
      <ListaProspectos
        vendedores={vendedores ?? undefined}
        puedeCambiarEtapa={sesion?.rol === 'VENTAS'}
      />
    </>
  )
}
