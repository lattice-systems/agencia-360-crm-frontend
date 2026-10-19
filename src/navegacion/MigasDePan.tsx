import { Fragment } from 'react'
import { Link, useLocation } from 'react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { migasDe } from './migas.ts'

/**
 * Migas de pan de la barra superior (CRM-UX-2). En celular solo se ve la
 * página actual y la anterior para que no se corten.
 */
export function MigasDePan() {
  const { pathname } = useLocation()
  const migas = migasDe(pathname)

  return (
    <Breadcrumb aria-label="Migas de pan" className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {migas.map((miga, i) => {
          const enCelular = (posicion: number) =>
            posicion < migas.length - 2 ? 'hidden md:inline-flex' : undefined
          const oculta = enCelular(i)
          return (
            <Fragment key={miga.texto}>
              {/* El separador se va con la miga anterior, para no dejar uno suelto. */}
              {i > 0 && <BreadcrumbSeparator className={enCelular(i - 1)} />}
              <BreadcrumbItem className={oculta}>
                {miga.ruta ? (
                  <BreadcrumbLink asChild>
                    <Link to={miga.ruta} className="rounded-sm">
                      {miga.texto}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate font-medium">{miga.texto}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
