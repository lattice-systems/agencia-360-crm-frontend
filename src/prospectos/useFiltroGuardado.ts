import { useState } from 'react'

// Filtros persistentes (CRM-UX-1): al salir de la lista y volver, se conservan
// la búsqueda, la etapa y los demás filtros. Se guardan en sessionStorage, como
// la sesión: duran mientras la pestaña esté abierta y no pasan a otra pestaña.
// La clave lleva al usuario para que otra sesión en la misma pestaña empiece
// limpia.

const PREFIJO = 'agencia360.crm.filtros'

function leer<T>(clave: string, inicial: T): T {
  try {
    const guardado = sessionStorage.getItem(clave)
    return guardado === null ? inicial : (JSON.parse(guardado) as T)
  } catch {
    return inicial
  }
}

function escribir<T>(clave: string, valor: T): void {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento (modo privado o bloqueado) el filtro solo dura en pantalla.
  }
}

/**
 * Como useState, pero el valor sobrevive a salir de la página.
 *
 * @param lista "prospectos" o "finalizados"
 * @param usuario quien tiene la sesión; sin sesión no se guarda nada
 * @param nombre el filtro: "busqueda", "etapa"…
 * @param valido descarta un valor guardado que ya no aplica
 */
export function useFiltroGuardado<T>(
  lista: string,
  usuario: string | undefined,
  nombre: string,
  inicial: T,
  valido: (valor: unknown) => boolean = () => true,
): [T, (valor: T) => void] {
  const clave = usuario ? `${PREFIJO}.${lista}.${usuario}.${nombre}` : null
  const [valor, setValor] = useState<T>(() => {
    if (!clave) return inicial
    const guardado = leer<unknown>(clave, inicial)
    return valido(guardado) ? (guardado as T) : inicial
  })

  function cambiar(nuevo: T) {
    setValor(nuevo)
    if (clave) escribir(clave, nuevo)
  }

  return [valor, cambiar]
}
