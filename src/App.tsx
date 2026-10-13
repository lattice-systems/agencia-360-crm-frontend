import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './componentes/Layout.tsx'
import { RutaProtegida } from './navegacion/RutaProtegida.tsx'
import { rolesDe } from './navegacion/secciones.ts'
import { InicioPage } from './paginas/InicioPage.tsx'
import { LoginPage } from './paginas/LoginPage.tsx'
import { ProspectosPage } from './paginas/ProspectosPage.tsx'
import { UsuariosPage } from './paginas/UsuariosPage.tsx'
import RegistroProspectoForm from './prospectos/RegistroProspectoForm.tsx'
import { SesionProvider } from './sesion/SesionProvider.tsx'

function App() {
  return (
    <SesionProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          <Route index element={<InicioPage />} />
          <Route
            path="prospectos"
            element={
              <RutaProtegida roles={rolesDe('/prospectos')}>
                <div className="estilo-anterior">
                  <ProspectosPage />
                </div>
              </RutaProtegida>
            }
          />
          <Route
            path="registrar"
            element={
              <RutaProtegida roles={rolesDe('/registrar')}>
                <div className="estilo-anterior">
                  <RegistroProspectoForm />
                </div>
              </RutaProtegida>
            }
          />
          <Route
            path="usuarios"
            element={
              <RutaProtegida roles={rolesDe('/usuarios')}>
                <UsuariosPage />
              </RutaProtegida>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SesionProvider>
  )
}

export default App
