import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TEMAS: { valor: string; nombre: string; icono: LucideIcon }[] = [
  { valor: 'light', nombre: 'Tema claro', icono: Sun },
  { valor: 'dark', nombre: 'Tema oscuro', icono: Moon },
  { valor: 'system', nombre: 'Tema del sistema', icono: Monitor },
]

/** Claro, oscuro o el del sistema; next-themes lo recuerda en este navegador. */
export function SelectorTema({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  return (
    <Tabs value={theme ?? 'system'} onValueChange={setTheme} className={className}>
      <TabsList aria-label="Tema de la aplicación">
        {TEMAS.map(({ valor, nombre, icono: Icono }) => (
          <TabsTrigger key={valor} value={valor} aria-label={nombre} title={nombre}>
            <Icono aria-hidden="true" />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
