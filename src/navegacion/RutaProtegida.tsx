import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Rol } from '../api/acceso.ts'
import { useSesion } from '../sesion/useSesion.ts'

interface Props {
  children: ReactNode
  /** Si se indica, solo estos roles pueden ver el contenido. */
  roles?: Rol[]
}

export function RutaProtegida({ children, roles }: Props) {
  const { sesion } = useSesion()
  const ubicacion = useLocation()

  if (!sesion) {
    return (
      <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
    )
  }
  if (roles && !roles.includes(sesion.rol)) {
    return (
      <section className="pagina">
        <h2>Sin permiso</h2>
        <p>Tu rol no tiene acceso a esta sección.</p>
      </section>
    )
  }
  return children
}
