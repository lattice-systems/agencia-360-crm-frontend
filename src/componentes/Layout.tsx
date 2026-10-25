import type { CSSProperties } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Separator } from '@/components/ui/separator'
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { MenuPerfil } from '../navegacion/MenuPerfil.tsx'
import { MigasDePan } from '../navegacion/MigasDePan.tsx'
import { GRUPOS, seccionesPara } from '../navegacion/secciones.ts'
import { useSesion } from '../sesion/useSesion.ts'

/**
 * Estructura de la aplicación, igual que en el ERP (CRM-UX-2), con la forma
 * del bloque dashboard-01 de shadcn: menú lateral inset que se pliega a
 * íconos, con el perfil al pie, y barra superior con el control para plegarlo
 * y las migas de pan. En celulares el menú se abre como Sheet.
 */
export function Layout() {
  const { sesion } = useSesion()
  if (!sesion) {
    return null
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 64)',
          '--header-height': 'calc(var(--spacing) * 14)',
        } as CSSProperties
      }
    >
      <MenuLateral />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar el menú" />
          <Separator orientation="vertical" className="mx-2 data-vertical:h-4 data-vertical:self-center" />
          <MigasDePan />
        </header>
        <div className="@container/main mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 lg:p-6">
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
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" onClick={() => setOpenMobile(false)} aria-label="Agencia360, ir a Inicio">
                <img src="/agencia360-icono.svg" alt="" className="size-8 shrink-0" />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Agencia360</span>
                  <span className="truncate text-xs text-muted-foreground">CRM CareCar</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
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
                          <SidebarMenuButton asChild isActive={activa} tooltip={seccion.titulo}>
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
      <SidebarFooter>
        <MenuPerfil />
      </SidebarFooter>
    </Sidebar>
  )
}
