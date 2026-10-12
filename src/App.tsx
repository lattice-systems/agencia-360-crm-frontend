import { useState } from 'react'
import ListaProspectos from './prospectos/ListaProspectos.tsx'
import RegistroProspectoForm from './prospectos/RegistroProspectoForm.tsx'
import './App.css'

type Vista = 'prospectos' | 'registrar'

const VISTAS: { id: Vista; nombre: string }[] = [
  { id: 'prospectos', nombre: 'Prospectos' },
  { id: 'registrar', nombre: 'Registrar' },
]

// La librería de navegación todavía no está definida (ver README, "Pendientes
// por definir"); mientras tanto la vista se elige con estado local.
function App() {
  const [vista, setVista] = useState<Vista>('prospectos')

  return (
    <>
      <header className="encabezado">
        <div className="contenido">
          <h1>Agencia360 · CRM</h1>
          <nav aria-label="Secciones">
            {VISTAS.map(({ id, nombre }) => (
              <button
                key={id}
                type="button"
                aria-current={vista === id ? 'page' : undefined}
                onClick={() => setVista(id)}
              >
                {nombre}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="principal">
        {vista === 'prospectos' ? <ListaProspectos /> : <RegistroProspectoForm />}
      </main>
    </>
  )
}

export default App
