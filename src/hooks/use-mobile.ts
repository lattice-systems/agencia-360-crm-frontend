import { useSyncExternalStore } from "react"

// Guía de estilos y mockups: desde 1024 px el menú lateral queda fijo; por
// debajo se abre como Sheet desde la izquierda.
const MOBILE_BREAKPOINT = 1024
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function suscribir(avisar: () => void) {
  const mql = window.matchMedia(CONSULTA)
  mql.addEventListener("change", avisar)
  return () => mql.removeEventListener("change", avisar)
}

function esMovil() {
  return window.matchMedia(CONSULTA).matches
}

export function useIsMobile() {
  return useSyncExternalStore(suscribir, esMovil, () => false)
}
