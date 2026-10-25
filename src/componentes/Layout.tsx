import { Link, Outlet, useLocation } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { MenuPerfil } from '../navegacion/MenuPerfil.tsx'
import { MigasDePan } from '../navegacion/MigasDePan.tsx'
import { GRUPOS, seccionesPara } from '../navegacion/secciones.ts'
import { useSesion } from '../sesion/useSesion.ts'

/**
 * Estructura de la aplicación, igual que en el ERP (CRM-UX-2): menú lateral
 * izquierdo con las secciones del rol y barra superior con el control para
 * plegarlo, las migas de pan y el menú de perfil. En celulares el menú se abre
 * como Sheet desde la izquierda.
 */
export function Layout() {
  const { sesion } = useSesion()
  if (!sesion) {
    return null
  }

  return (
    <SidebarProvider>
      <MenuLateral />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar el menú" />
          <MigasDePan />
          <div className="ml-auto shrink-0">
            <MenuPerfil />
          </div>
        </header>
        <div className="mx-auto w-full max-w-[960px] flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function MenuLateral() {
  const { sesion } = useSesion()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  if (!sesion) {
    return null
  }
  const secciones = seccionesPara(sesion.rol)

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          to="/"
          onClick={() => setOpenMobile(false)}
          aria-label="Agencia360, ir a Inicio"
          className="w-fit rounded-md p-2"
        >
          <img src="/agencia360-logo.svg" alt="" className="h-auto w-32" />
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <nav aria-label="Principal">
          {GRUPOS.map((grupo) => {
            const delGrupo = secciones.filter((seccion) => seccion.grupo === grupo)
            if (delGrupo.length === 0) {
              return null
            }
            return (
              <SidebarGroup key={grupo}>
                <SidebarGroupLabel>{grupo}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {delGrupo.map((seccion) => {
                      const activa =
                        pathname === seccion.ruta || pathname.startsWith(`${seccion.ruta}/`)
                      const Icono = seccion.icono
                      return (
                        <SidebarMenuItem key={seccion.ruta}>
                          <SidebarMenuButton asChild isActive={activa}>
                            <Link
                              to={seccion.ruta}
                              aria-current={activa ? 'page' : undefined}
                              onClick={() => setOpenMobile(false)}
                            >
                              <Icono aria-hidden="true" />
                              <span>{seccion.titulo}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
