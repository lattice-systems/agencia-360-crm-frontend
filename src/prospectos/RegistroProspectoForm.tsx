import { useState, type FormEvent } from 'react'
import { registrarProspecto, type ResultadoRegistro } from './api.ts'
import { NOMBRES_ETAPA, type ProspectoNuevo } from './tipos.ts'
import './RegistroProspectoForm.css'

interface Errores {
  nombre?: string
  telefono?: string
  contacto?: string
}

// Se aceptan espacios, guiones, puntos y paréntesis al capturar el teléfono.
const SEPARADORES_TELEFONO = /[\s().-]/g

// CRM-1.0: nombre obligatorio y además teléfono o correo. El teléfono es de
// México a 10 dígitos (decisión del PO del 12 de octubre).
function validar(datos: ProspectoNuevo): Errores {
  const errores: Errores = {}
  if (!datos.nombre) {
    errores.nombre = 'Escribe el nombre del prospecto.'
  }
  if (!datos.telefono && !datos.correo) {
    errores.contacto = 'Escribe al menos un teléfono o un correo.'
  }
  if (datos.telefono && !/^\d{10}$/.test(datos.telefono)) {
    errores.telefono = 'El teléfono debe tener 10 dígitos.'
  }
  return errores
}

function RegistroProspectoForm() {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [aviso, setAviso] = useState<ResultadoRegistro | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setAviso(null)

    // Solo se mandan los campos que traen algo, sin espacios sobrantes; el
    // teléfono va solo con sus dígitos.
    const datos: ProspectoNuevo = { nombre: nombre.trim() }
    const digitosTelefono = telefono.replace(SEPARADORES_TELEFONO, '')
    if (digitosTelefono) datos.telefono = digitosTelefono
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
            aria-invalid={errores.contacto || errores.telefono ? true : undefined}
            aria-describedby={errores.telefono ? 'error-telefono' : undefined}
          />
          {errores.telefono && (
            <p id="error-telefono" className="error">
              {errores.telefono}
            </p>
          )}
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
        <p
          role="status"
          className={`aviso ${aviso.contactoRepetido ? 'aviso-duplicado' : 'aviso-exito'}`}
        >
          Se registró a {aviso.prospecto.nombre} en la etapa{' '}
          {NOMBRES_ETAPA[aviso.prospecto.etapa]}.
          {aviso.contactoRepetido &&
            ' Aviso: ya existe otro prospecto con ese teléfono o correo.'}
        </p>
      )}
      {aviso?.tipo === 'invalido' && (
        <p role="alert" className="aviso aviso-error">
          {aviso.mensaje}
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
