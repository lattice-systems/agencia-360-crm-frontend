import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { iniciales } from '../sesion/iniciales.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

/**
 * Ícono de perfil con las iniciales del nombre (CRM-UX-2). Al abrirlo muestra
 * quién inició sesión, con qué rol, y la opción para cerrar sesión.
 */
export function MenuPerfil() {
  const { sesion, cerrar } = useSesion()
  if (!sesion) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={`Perfil de ${sesion.nombre}`}>
          <Avatar>
            <AvatarFallback>
              {iniciales(sesion.nombre)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate font-semibold text-foreground">{sesion.nombre}</span>
          <span className="truncate text-xs text-muted-foreground">{NOMBRE_ROL[sesion.rol]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => cerrar()}>
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
