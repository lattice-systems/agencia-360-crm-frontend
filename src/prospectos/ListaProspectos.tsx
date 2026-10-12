import { useEffect, useState } from 'react'
import { cambiarEtapa, listarProspectos } from './api.ts'
import { ETAPAS, NOMBRES_ETAPA, type Etapa, type Prospecto } from './tipos.ts'
import './ListaProspectos.css'

type Carga = 'cargando' | 'lista' | 'error'

interface Aviso {
  tipo: 'exito' | 'error'
  texto: string
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function contacto(prospecto: Prospecto): string {
  return [prospecto.telefono, prospecto.correo].filter(Boolean).join(' · ')
}

// CRM-1.1 (MVP): lista filtrable por etapa donde se cambia la etapa.
// La visibilidad (VENTAS solo ve los suyos) la aplica el servidor.
function ListaProspectos() {
  const [filtro, setFiltro] = useState<Etapa | ''>('')
  const [intento, setIntento] = useState(0)
  const [carga, setCarga] = useState<Carga>('cargando')
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [guardando, setGuardando] = useState<ReadonlySet<number>>(new Set())
  const [aviso, setAviso] = useState<Aviso | null>(null)

  useEffect(() => {
    const control = new AbortController()
    listarProspectos(filtro || undefined, control.signal)
      .then((lista) => {
        if (control.signal.aborted) return
        setProspectos(lista)
        setCarga('lista')
      })
      .catch(() => {
        if (control.signal.aborted) return
        setCarga('error')
      })
    return () => control.abort()
  }, [filtro, intento])

  function cambiarFiltro(valor: string) {
    setFiltro(valor as Etapa | '')
    setCarga('cargando')
    setAviso(null)
  }

  function reintentar() {
    setIntento((n) => n + 1)
    setCarga('cargando')
  }

  function marcarGuardando(id: number, activo: boolean) {
    setGuardando((actual) => {
      const siguiente = new Set(actual)
      if (activo) siguiente.add(id)
      else siguiente.delete(id)
      return siguiente
    })
  }

  async function manejarCambioEtapa(prospecto: Prospecto, etapa: Etapa) {
    const anterior = prospecto.etapa
    const actualizarEtapa = (nueva: Etapa) =>
      setProspectos((lista) =>
        lista.map((p) => (p.id === prospecto.id ? { ...p, etapa: nueva } : p)),
      )

    // Se muestra el cambio de inmediato y se revierte si el servidor falla.
    actualizarEtapa(etapa)
    marcarGuardando(prospecto.id, true)
    setAviso(null)

    try {
      const actualizado = await cambiarEtapa(prospecto.id, etapa)
      setProspectos((lista) =>
        lista
          .map((p) => (p.id === actualizado.id ? actualizado : p))
          // Con un filtro activo, el prospecto que cambia de etapa sale de la vista.
          .filter((p) => !filtro || p.etapa === filtro),
      )
      setAviso({
        tipo: 'exito',
        texto: `${actualizado.nombre} pasó a la etapa ${NOMBRES_ETAPA[actualizado.etapa]}.`,
      })
    } catch {
      actualizarEtapa(anterior)
      setAviso({
        tipo: 'error',
        texto: `No se pudo cambiar la etapa de ${prospecto.nombre}. Intenta de nuevo.`,
      })
    } finally {
      marcarGuardando(prospecto.id, false)
    }
  }

  return (
    <section className="lista-prospectos" aria-labelledby="titulo-prospectos">
      <div className="barra">
        <div>
          <h2 id="titulo-prospectos">Prospectos</h2>
          {carga === 'lista' && (
            <p className="conteo">
              {prospectos.length === 1
                ? '1 prospecto'
                : `${prospectos.length} prospectos`}
            </p>
          )}
        </div>

        <div className="filtro">
        <label htmlFor="filtro-etapa">Filtrar por etapa</label>
        <select
          id="filtro-etapa"
          value={filtro}
          onChange={(e) => cambiarFiltro(e.target.value)}
        >
          <option value="">Todas las etapas</option>
          {ETAPAS.map((etapa) => (
            <option key={etapa} value={etapa}>
              {NOMBRES_ETAPA[etapa]}
            </option>
          ))}
        </select>
        </div>
      </div>

      {aviso?.tipo === 'exito' && (
        <p role="status" className="aviso aviso-exito">
          {aviso.texto}
        </p>
      )}
      {aviso?.tipo === 'error' && (
        <p role="alert" className="aviso aviso-error">
          {aviso.texto}
        </p>
      )}

      {carga === 'cargando' && <p className="estado">Cargando prospectos…</p>}

      {carga === 'error' && (
        <div role="alert" className="aviso aviso-error">
          <p>No se pudieron cargar los prospectos.</p>
          <button
            type="button"
            className="boton-secundario"
            onClick={reintentar}
          >
            Reintentar
          </button>
        </div>
      )}

      {carga === 'lista' && prospectos.length === 0 && (
        <p className="estado">
          {filtro
            ? 'No hay prospectos en esta etapa.'
            : 'Todavía no tienes prospectos registrados.'}
        </p>
      )}

      {carga === 'lista' && prospectos.length > 0 && (
        <ul aria-label="Prospectos" className="renglones">
          {prospectos.map((prospecto) => {
            const idSelector = `etapa-${prospecto.id}`
            return (
              <li key={prospecto.id} className="renglon">
                <div className="datos">
                  <p className="nombre">{prospecto.nombre}</p>
                  <p className="contacto">{contacto(prospecto)}</p>
                  <p className="fecha">
                    Registrado el{' '}
                    {formatoFecha.format(new Date(prospecto.creadoEn))}
                  </p>
                </div>
                <div className="etapa">
                  <label htmlFor={idSelector} className="solo-lector">
                    Etapa de {prospecto.nombre}
                  </label>
                  <select
                    id={idSelector}
                    value={prospecto.etapa}
                    disabled={guardando.has(prospecto.id)}
                    onChange={(e) =>
                      manejarCambioEtapa(prospecto, e.target.value as Etapa)
                    }
                  >
                    {ETAPAS.map((etapa) => (
                      <option key={etapa} value={etapa}>
                        {NOMBRES_ETAPA[etapa]}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ListaProspectos
