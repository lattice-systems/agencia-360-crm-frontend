import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface Miga {
  texto: string
  ruta?: string
}

interface Props {
  titulo: string
  descripcion?: string
  /** Ruta de navegación, por ejemplo Vehículos / Agregar vehículo. */
  migas?: Miga[]
  /** Acción principal de la pantalla (un solo botón default). */
  accion?: ReactNode
}

/** Título de la página (el único h1), con su descripción y acción principal. */
export function EncabezadoPagina({ titulo, descripcion, migas, accion }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        {migas && (
          <nav aria-label="Ruta" className="text-sm text-muted-foreground">
            {migas.map((miga, i) => (
              <span key={miga.texto}>
                {i > 0 && ' / '}
                {miga.ruta ? (
                  <Link to={miga.ruta} className="rounded-sm hover:text-foreground hover:underline">
                    {miga.texto}
                  </Link>
                ) : (
                  <span aria-current="page">{miga.texto}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold text-primary">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}
