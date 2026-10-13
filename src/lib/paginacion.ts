/** Elementos de la página indicada (las páginas empiezan en 1). */
export function deLaPagina<T>(elementos: T[], pagina: number, porPagina: number): T[] {
  return elementos.slice((pagina - 1) * porPagina, pagina * porPagina)
}
