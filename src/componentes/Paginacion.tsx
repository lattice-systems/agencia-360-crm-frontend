import { Button } from '@/components/ui/button'

interface Props {
  pagina: number
  porPagina: number
  total: number
  /** En plural y minúsculas: "vehículos". */
  nombre: string
  onCambiar: (pagina: number) => void
}

/** "Mostrando 1 a 10 de 23 vehículos" con Anterior y Siguiente. */
export function Paginacion({ pagina, porPagina, total, nombre, onCambiar }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Mostrando {desde} a {hasta} de {total} {nombre}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={pagina >= paginas}
          onClick={() => onCambiar(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
