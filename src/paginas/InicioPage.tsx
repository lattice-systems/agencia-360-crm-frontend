import { Navigate } from 'react-router'
import { seccionesPara } from '../navegacion/secciones.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

// Al entrar, cada rol abre en su primera sección. Un rol con acceso al CRM pero
// sin pantallas todavía (por ejemplo, Contabilidad) ve un aviso.
export function InicioPage() {
  const { sesion } = useSesion()
  if (!sesion) {
    return null
  }
  const [primera] = seccionesPara(sesion.rol)
  if (primera) {
    return <Navigate to={primera.ruta} replace />
  }

  return (
    <section className="pagina">
      <h2>Hola, {sesion.nombre}</h2>
      <p>Rol: {NOMBRE_ROL[sesion.rol]}</p>
      <p className="ayuda">
        Todavía no hay secciones del CRM disponibles para tu rol.
      </p>
    </section>
  )
}
