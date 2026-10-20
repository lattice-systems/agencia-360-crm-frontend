import { useEffect, useState } from 'react'
import type { UsuarioApi } from '../api/acceso.ts'
import { listarVendedores } from '../prospectos/reasignacion.ts'
import ListaProspectos from '../prospectos/ListaProspectos.tsx'
import { useSesion } from '../sesion/useSesion.ts'

// Prospectos finalizados (entregados): ya no cambian de etapa y no aparecen en
// Prospectos. El vendedor ve los suyos; el Gerente de marketing ve todos con el
// nombre de su vendedor.
export function FinalizadosPage() {
  const { sesion } = useSesion()
  const esGerente = sesion?.rol === 'GERENTE_MARKETING'
  const [vendedores, setVendedores] = useState<UsuarioApi[] | null>(null)

  useEffect(() => {
    if (!esGerente) {
      return
    }
    let vigente = true
    listarVendedores()
      .then((lista) => {
        if (vigente) setVendedores(lista)
      })
      // Sin la lista solo falta el nombre del vendedor; la consulta sigue.
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [esGerente])

  return (
    <ListaProspectos
      modo="finalizados"
      vendedores={vendedores ?? undefined}
      puedeCambiarEtapa={sesion?.rol === 'VENTAS'}
    />
  )
}
