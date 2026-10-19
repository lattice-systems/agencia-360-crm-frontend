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
 * plegarlo, las migas de pan y el menú de perfil. En pantallas de menos de
 * 1024 px el menú se abre como Sheet desde la izquierda.
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
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 md:px-6">
          <SidebarTrigger className="size-10 shrink-0 border" aria-label="Mostrar u ocultar el menú" />
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
      <SidebarHeader className="px-4 pt-5 pb-4">
        {/* 128 px: arriba del mínimo de 120 px de la guía (sección 1). */}
        <Link
          to="/"
          onClick={() => setOpenMobile(false)}
          aria-label="Agencia360, ir a Inicio"
          className="w-fit rounded-md"
        >
          <img src="/agencia360-logo-blanco.svg" alt="" className="h-auto w-32" />
        </Link>
      </SidebarHeader>
      <div aria-hidden="true" className="mx-4 h-px bg-sidebar-border" />
      <SidebarContent>
        <nav aria-label="Principal">
          {GRUPOS.map((grupo) => {
            const delGrupo = secciones.filter((seccion) => seccion.grupo === grupo)
            if (delGrupo.length === 0) {
              return null
            }
            return (
              <SidebarGroup key={grupo}>
                <SidebarGroupLabel className="text-xs font-medium tracking-wide text-sidebar-foreground/75 uppercase">
                  {grupo}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {delGrupo.map((seccion) => {
                      const activa =
                        pathname === seccion.ruta || pathname.startsWith(`${seccion.ruta}/`)
                      const Icono = seccion.icono
                      return (
                        <SidebarMenuItem key={seccion.ruta}>
                          <SidebarMenuButton
                            asChild
                            isActive={activa}
                            className="relative h-10 text-sidebar-foreground/75 data-active:before:absolute data-active:before:inset-y-1.5 data-active:before:left-0 data-active:before:w-[3px] data-active:before:rounded-full data-active:before:bg-sidebar-primary [&_svg]:size-5"
                          >
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
