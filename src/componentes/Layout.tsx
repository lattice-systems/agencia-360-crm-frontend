import { NavLink, Outlet } from 'react-router'
import { seccionesPara } from '../navegacion/secciones.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

export function Layout() {
  const { sesion, cerrar } = useSesion()
  if (!sesion) {
    return null
  }

  return (
    <>
      <header className="encabezado">
        <div className="contenido">
          <h1>Agencia360 · CRM</h1>
          <div className="usuario-actual">
            <span>
              {sesion.nombre} · {NOMBRE_ROL[sesion.rol]}
            </span>
            <button type="button" onClick={() => cerrar()}>
              Cerrar sesión
            </button>
          </div>
          <nav aria-label="Secciones">
            {seccionesPara(sesion.rol).map((seccion) => (
              <NavLink key={seccion.ruta} to={seccion.ruta}>
                {seccion.titulo}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="principal">
        <Outlet />
      </main>
    </>
  )
}
