import { UserRoundCog } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { UsuarioApi } from '../api/acceso.ts'
import { cambiarEtapa, listarProspectos } from './api.ts'
import { DialogoReasignar } from './DialogoReasignar.tsx'
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

interface Props {
  /** Si se indican, se muestra el selector para reasignar (CRM-0.1, gerente). */
  vendedores?: UsuarioApi[]
  /**
   * Solo el vendedor cambia la etapa (decisión del PO del 12 de octubre). Sin
   * permiso, la etapa se muestra como texto.
   */
  puedeCambiarEtapa?: boolean
}

/** Cierre en captura: el prospecto pasa a Cerrado solo al confirmar el motivo. */
interface Cierre {
  prospectoId: number
  motivo: string
  faltaMotivo: boolean
}

// CRM-1.1 (MVP): lista filtrable por etapa donde se cambia la etapa.
// La visibilidad (VENTAS solo ve los suyos) la aplica el servidor.
function ListaProspectos({ vendedores, puedeCambiarEtapa = true }: Props) {
  const [filtro, setFiltro] = useState<Etapa | ''>('')
  const [intento, setIntento] = useState(0)
  const [carga, setCarga] = useState<Carga>('cargando')
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [guardando, setGuardando] = useState<ReadonlySet<number>>(new Set())
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [cierre, setCierre] = useState<Cierre | null>(null)
  const [reasignando, setReasignando] = useState<Prospecto | null>(null)

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

  function elegirEtapa(prospecto: Prospecto, etapa: Etapa) {
    // Cerrar exige motivo (decisión del PO): primero se pide y luego se guarda.
    if (etapa === 'CERRADO') {
      setAviso(null)
      setCierre({ prospectoId: prospecto.id, motivo: '', faltaMotivo: false })
      return
    }
    setCierre(null)
    manejarCambioEtapa(prospecto, etapa)
  }

  function confirmarCierre(
    evento: FormEvent<HTMLFormElement>,
    prospecto: Prospecto,
  ) {
    evento.preventDefault()
    if (!cierre) return
    const motivo = cierre.motivo.trim()
    if (!motivo) {
      setCierre({ ...cierre, faltaMotivo: true })
      return
    }
    setCierre(null)
    manejarCambioEtapa(prospecto, 'CERRADO', motivo)
  }

  async function manejarCambioEtapa(
    prospecto: Prospecto,
    etapa: Etapa,
    motivoCierre?: string,
  ) {
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
      const actualizado = await cambiarEtapa(prospecto.id, etapa, motivoCierre)
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

  function alReasignar(actualizado: Prospecto) {
    setReasignando(null)
    setProspectos((lista) =>
      lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
    )
    const nombre =
      vendedores?.find((v) => v.id === actualizado.vendedorId)?.nombre ??
      'otro vendedor'
    toast.success(`${actualizado.nombre} ahora lo atiende ${nombre}.`)
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
                  {prospecto.etapa === 'CERRADO' && prospecto.motivoCierre && (
                    <p className="motivo">
                      Motivo de cierre: {prospecto.motivoCierre}
                    </p>
                  )}
                </div>
                {puedeCambiarEtapa ? (
                  <div className="etapa">
                    <label htmlFor={idSelector} className="solo-lector">
                      Etapa de {prospecto.nombre}
                    </label>
                    <select
                      id={idSelector}
                      value={prospecto.etapa}
                      disabled={
                        guardando.has(prospecto.id) ||
                        cierre?.prospectoId === prospecto.id
                      }
                      onChange={(e) =>
                        elegirEtapa(prospecto, e.target.value as Etapa)
                      }
                    >
                      {ETAPAS.map((etapa) => (
                        <option key={etapa} value={etapa}>
                          {NOMBRES_ETAPA[etapa]}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="etapa etapa-texto">
                    <span className="etiqueta">Etapa</span>{' '}
                    {NOMBRES_ETAPA[prospecto.etapa]}
                  </p>
                )}
                {cierre?.prospectoId === prospecto.id && (
                  <form
                    className="cierre"
                    onSubmit={(e) => confirmarCierre(e, prospecto)}
                    noValidate
                  >
                    <label htmlFor={`motivo-${prospecto.id}`}>
                      Motivo de cierre de {prospecto.nombre}
                    </label>
                    <input
                      id={`motivo-${prospecto.id}`}
                      value={cierre.motivo}
                      maxLength={200}
                      autoFocus
                      onChange={(e) =>
                        setCierre({ ...cierre, motivo: e.target.value })
                      }
                      aria-invalid={cierre.faltaMotivo ? true : undefined}
                      aria-describedby={
                        cierre.faltaMotivo
                          ? `error-motivo-${prospecto.id}`
                          : undefined
                      }
                    />
                    {cierre.faltaMotivo && (
                      <p id={`error-motivo-${prospecto.id}`} className="error">
                        Escribe el motivo de cierre.
                      </p>
                    )}
                    <div className="acciones-cierre">
                      <button
                        type="button"
                        className="boton-secundario"
                        onClick={() => setCierre(null)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="boton-primario">
                        Cerrar prospecto
                      </button>
                    </div>
                  </form>
                )}
                {vendedores && (
                  <div className="vendedor">
                    <span className="nombre-vendedor">
                      {vendedores.find((v) => v.id === prospecto.vendedorId)
                        ?.nombre ?? 'Vendedor sin acceso'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Reasignar a ${prospecto.nombre}`}
                      onClick={() => setReasignando(prospecto)}
                    >
                      <UserRoundCog aria-hidden="true" />
                      Reasignar
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {vendedores && (
        <DialogoReasignar
          prospecto={reasignando}
          vendedores={vendedores}
          onCerrar={() => setReasignando(null)}
          onReasignado={alReasignar}
        />
      )}
    </section>
  )
}

export default ListaProspectos
