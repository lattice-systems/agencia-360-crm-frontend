import { useState, type FormEvent } from 'react'
import { registrarProspecto } from './api.ts'
import { NOMBRES_ETAPA, type Prospecto, type ProspectoNuevo } from './tipos.ts'
import './RegistroProspectoForm.css'

interface Errores {
  nombre?: string
  contacto?: string
}

type Aviso =
  | { tipo: 'creado'; prospecto: Prospecto }
  | { tipo: 'duplicado' }
  | { tipo: 'error' }

// CRM-1.0: nombre obligatorio y además teléfono o correo.
function validar(datos: ProspectoNuevo): Errores {
  const errores: Errores = {}
  if (!datos.nombre) {
    errores.nombre = 'Escribe el nombre del prospecto.'
  }
  if (!datos.telefono && !datos.correo) {
    errores.contacto = 'Escribe al menos un teléfono o un correo.'
  }
  return errores
}

function RegistroProspectoForm() {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setAviso(null)

    // Solo se mandan los campos que traen algo, sin espacios sobrantes.
    const datos: ProspectoNuevo = { nombre: nombre.trim() }
    if (telefono.trim()) datos.telefono = telefono.trim()
    if (correo.trim()) datos.correo = correo.trim()

    const nuevosErrores = validar(datos)
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setEnviando(true)
    const resultado = await registrarProspecto(datos)
    setEnviando(false)
    setAviso(resultado)

    if (resultado.tipo === 'creado') {
      setNombre('')
      setTelefono('')
      setCorreo('')
    }
  }

  return (
    <form className="registro-prospecto" onSubmit={manejarEnvio} noValidate>
      <div className="cabecera">
        <h2>Registrar prospecto</h2>
        <p className="descripcion">
          El prospecto se crea en la etapa Primer contacto.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="prospecto-nombre">Nombre</label>
        <input
          id="prospecto-nombre"
          name="nombre"
          autoComplete="name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-invalid={errores.nombre ? true : undefined}
          aria-describedby={errores.nombre ? 'error-nombre' : undefined}
        />
        {errores.nombre && (
          <p id="error-nombre" className="error">
            {errores.nombre}
          </p>
        )}
      </div>

      <fieldset
        className="contacto"
        aria-describedby={errores.contacto ? 'error-contacto' : undefined}
      >
        <legend>Datos de contacto</legend>
        <p className="indicacion">Captura al menos un teléfono o un correo.</p>

        <div className="campo">
          <label htmlFor="prospecto-telefono">Teléfono</label>
          <input
            id="prospecto-telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            aria-invalid={errores.contacto ? true : undefined}
          />
        </div>

        <div className="campo">
          <label htmlFor="prospecto-correo">Correo</label>
          <input
            id="prospecto-correo"
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            aria-invalid={errores.contacto ? true : undefined}
          />
        </div>

        {errores.contacto && (
          <p id="error-contacto" className="error">
            {errores.contacto}
          </p>
        )}
      </fieldset>

      <div className="acciones">
        <button type="submit" className="boton-primario" disabled={enviando}>
          Registrar prospecto
        </button>
      </div>

      {aviso?.tipo === 'creado' && (
        <p role="status" className="aviso aviso-exito">
          Se registró a {aviso.prospecto.nombre} en la etapa{' '}
          {NOMBRES_ETAPA[aviso.prospecto.etapa]}.
        </p>
      )}
      {aviso?.tipo === 'duplicado' && (
        <p role="alert" className="aviso aviso-duplicado">
          Ya existe un prospecto con ese teléfono o correo.
        </p>
      )}
      {aviso?.tipo === 'error' && (
        <p role="alert" className="aviso aviso-error">
          No se pudo registrar el prospecto. Intenta de nuevo.
        </p>
      )}
    </form>
  )
}

export default RegistroProspectoForm
