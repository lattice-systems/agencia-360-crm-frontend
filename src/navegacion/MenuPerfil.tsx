import { EllipsisVertical, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { iniciales } from '../sesion/iniciales.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

/**
 * Perfil al pie del menú lateral (CRM-UX-2): iniciales, nombre y rol de quien
 * inició sesión. Al abrirlo ofrece cerrar sesión.
 */
export function MenuPerfil() {
  const { sesion, cerrar } = useSesion()
  const { isMobile } = useSidebar()
  if (!sesion) {
    return null
  }

  const identidad = (
    <>
      <Avatar className="rounded-lg">
        <AvatarFallback className="rounded-lg">{iniciales(sesion.nombre)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{sesion.nombre}</span>
        <span className="truncate text-xs text-muted-foreground">{NOMBRE_ROL[sesion.rol]}</span>
      </div>
    </>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={`Perfil de ${sesion.nombre}`}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {identidad}
              <EllipsisVertical aria-hidden="true" className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">{identidad}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => cerrar()}>
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
