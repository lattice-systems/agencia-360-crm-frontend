import { LogOut } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { GRUPOS, seccionDe, seccionesPara } from '../navegacion/secciones.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

/**
 * Estructura de la aplicación, igual que en el ERP: menú lateral izquierdo con
 * las secciones del rol y barra superior con el control para plegarlo. En
 * pantallas de menos de 1024 px el menú se abre como Sheet desde la izquierda.
 */
export function Layout() {
  const { sesion } = useSesion()
  const { pathname } = useLocation()
  if (!sesion) {
    return null
  }

  return (
    <SidebarProvider>
      <MenuLateral />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 md:px-6">
          <SidebarTrigger className="size-10 border" aria-label="Mostrar u ocultar el menú" />
          <span className="font-semibold text-primary">Agencia360 · CRM</span>
          <span className="ml-auto text-sm text-muted-foreground">
            {seccionDe(pathname)?.titulo ?? 'Inicio'}
          </span>
        </header>
        <div className="mx-auto w-full max-w-[960px] flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function MenuLateral() {
  const { sesion, cerrar } = useSesion()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  if (!sesion) {
    return null
  }
  const secciones = seccionesPara(sesion.rol)

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 px-4 pt-5">
        <Link to="/" onClick={() => setOpenMobile(false)} className="rounded-md">
          <img
            src="/agencia360-logo-blanco.svg"
            alt="Agencia360"
            className="h-auto w-[180px]"
          />
        </Link>
        <span className="text-sm text-sidebar-foreground/75">Agencia360 · CRM</span>
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
      <SidebarFooter className="gap-3 px-4 pb-5">
        <SidebarSeparator className="mx-0" />
        <div className="flex flex-col">
          <span className="font-semibold">{sesion.nombre}</span>
          <span className="text-xs text-sidebar-foreground/75">{NOMBRE_ROL[sesion.rol]}</span>
        </div>
        <Button
          variant="outline"
          className="justify-start border-sidebar-foreground/40 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => cerrar()}
        >
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
