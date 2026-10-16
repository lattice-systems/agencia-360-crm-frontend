# Agencia360 · CRM Frontend

Aplicación web del **CRM de CareCar**, el sistema con el que los vendedores de la agencia automotriz dan seguimiento a sus prospectos, desde el primer contacto hasta la entrega de la unidad. Está pensada para usarse principalmente desde el celular.

> **Estado:** inicio de sesión, menú por rol y administración de usuarios (CRM-0.1); registro y lista de prospectos con cambio de etapa (CRM-1.0 y CRM-1.1). Mientras el backend no tenga los endpoints de prospectos, en desarrollo se simulan con MSW.

---

## Contenido

- [Contexto del proyecto](#contexto-del-proyecto)
- [Alcance del CRM](#alcance-del-crm)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos](#requisitos)
- [Cómo empezar](#cómo-empezar)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Arquitectura](#arquitectura)
- [Pruebas](#pruebas)
- [CI y checks del PR](#ci-y-checks-del-pr)
- [Forma de trabajo](#forma-de-trabajo)
- [Pendientes por definir](#pendientes-por-definir)
- [Documentación relacionada](#documentación-relacionada)

---

## Contexto del proyecto

**Agencia360** se compone de:

| Aplicación        | Usuarios                                    | Repositorio                                                                               |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **CRM web**       | Vendedores y gerente de marketing           | Este repositorio                                                                          |
| **ERP web**       | Personal de los departamentos de la agencia | [`agencia-360-erp-frontend`](https://github.com/lattice-systems/agencia-360-erp-frontend) |
| **API (backend)** | Atiende al ERP, al CRM y a la app CareCar   | [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend)           |

La app móvil de clientes (**CareCar**, Flutter) es un proyecto aparte que consume la misma API.

---

## Alcance del CRM

Alcance del MVP según el documento de stack y arquitectura (v2):

| Funcionalidad              | Descripción                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Prospectos por etapas      | Seguimiento de cada prospecto desde el primer contacto hasta la entrega de la unidad        |
| Categorización de perdidos | Registrar por qué se perdió un prospecto, para que el gerente de marketing pueda analizarlo |
| Integración con el ERP     | Cuando Facturación timbra la factura, el prospecto pasa a _Facturado / Listo para entrega_  |

Las historias de usuario, su prioridad y el sprint de cada una se gestionan en el tablero de Azure DevOps.

---

## Stack tecnológico

| Tecnología                         | Uso                                      |
| ---------------------------------- | ---------------------------------------- |
| React + TypeScript                 | Librería de UI y tipado estático         |
| Vite                               | Servidor de desarrollo y build           |
| ESLint                             | Análisis estático del código             |
| Vitest + React Testing Library     | Pruebas unitarias y de componentes       |
| React Router 7                     | Navegación entre pantallas               |
| MSW 2 (Mock Service Worker)        | Simula la API en desarrollo y en pruebas |
| shadcn/ui (Radix) + Tailwind CSS 4 | Componentes de interfaz y estilos        |
| Lucide (`lucide-react`)            | Íconos                                   |
| react-hook-form + zod              | Formularios y validación                 |
| Inter y JetBrains Mono             | Fuentes locales (`@fontsource-variable`) |
| Sonner                             | Avisos de resultado                      |

El consumo de la API usa `fetch` con un cliente propio (`src/api/cliente.ts`) que agrega el token de la sesión. La sesión se guarda en `sessionStorage`: sobrevive a recargar la página y se borra al cerrar la pestaña.

La interfaz sigue la **guía de estilos de Agencia360** (`estilos.pdf`) y los mockups del equipo, igual que el ERP: Azul Agencia `#1D3557` como color principal, turquesa solo como acento, menú lateral izquierdo y componentes de shadcn/ui. Los tokens de color, tipografía y radios están en `src/index.css`. Los componentes se agregan con `npx shadcn@latest add <componente>`; los de `src/components/ui/` son los mismos que usa el ERP.

El login, el menú lateral, la administración de usuarios y el diálogo para reasignar prospectos ya usan shadcn/ui. La lista y el registro de prospectos todavía usan su CSS anterior (`src/estilos-anteriores.css`, aislado dentro de `.estilo-anterior`); al migrarlas se borra ese archivo.

---

## Requisitos

| Herramienta | Versión                              |
| ----------- | ------------------------------------ |
| Node.js     | 20.19 o superior, o 22.12 o superior |
| npm         | Incluido con Node.js                 |
| Git         | Cualquier versión reciente           |

Verificar con:

```bash
node -v
npm -v
```

---

## Cómo empezar

```bash
# 1. Clonar el repositorio
git clone https://github.com/lattice-systems/agencia-360-crm-frontend.git
cd agencia-360-crm-frontend

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. Si el ERP también está corriendo, Vite usa el siguiente puerto libre (`5174`) y lo indica en la terminal.

### Entrar al CRM en desarrollo

Con `npm run dev`, MSW simula el backend (login, usuarios, roles y prospectos) con estas cuentas de ejemplo. Todas usan la contraseña `Secreta123`:

| Usuario     | Rol                  | Qué ve                                                                |
| ----------- | -------------------- | --------------------------------------------------------------------- |
| `vendedor1` | Ventas               | Sus prospectos y el registro                                          |
| `vendedor2` | Ventas               | Ningún prospecto (sirve para probar la visibilidad)                   |
| `gerente`   | Gerente de marketing | Todos los prospectos (y los reasigna) y la administración de usuarios |
| `conta1`    | Contabilidad         | No entra: su rol no tiene acceso al CRM                               |
| `caja1`     | Caja                 | No entra: su rol no tiene acceso al CRM                               |

### Usar el backend real con datos de ejemplo

Crea `.env.development.local` con `VITE_API_MOCK=false` (ver `.env.example`). Las llamadas a `/api` pasan por el proxy de Vite a `http://localhost:8080`, así que el backend debe estar corriendo.

El backend trae un juego de datos de ejemplo (TEC-3) con usuarios del CRM y 12 prospectos en las 7 etapas. Desde la carpeta del backend:

```bash
docker compose up -d
ADMIN_INICIAL_USUARIO=admin ADMIN_INICIAL_CONTRASENA=Admin12345 \
GERENTE_INICIAL_USUARIO=gerente GERENTE_INICIAL_CONTRASENA=Gerente12345 \
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# En otra terminal:
./scripts/cargar-datos-de-ejemplo.sh
```

> **Solo para desarrollo local.** Estas contraseñas son públicas y **no son las de MSW**.

| Usuario     | Contraseña     | Rol                  | Qué debe ver                                                                       |
| ----------- | -------------- | -------------------- | ---------------------------------------------------------------------------------- |
| `vendedor1` | `Vendedor123`  | Ventas (Sergio Luna) | Sus 6 prospectos, de Primer contacto a Cerrado                                     |
| `vendedor2` | `Vendedor123`  | Ventas (Elena Ríos)  | Sus 6 prospectos, incluido Ricardo Fuentes, que el Gerente le reasignó             |
| `gerente`   | `Gerente12345` | Gerente de marketing | Los 12 prospectos, con al menos uno en cada etapa, y la administración de usuarios |

Para ver el aviso de contacto repetido, entra con `vendedor2` y registra un prospecto con el teléfono `477 555 0101`, que ya tiene Ana López.

Qué contiene cada dato está en `docs/datos-de-ejemplo.md` del backend; cómo cargar, verificar y limpiar, en su README (sección 5.6). Si el ERP también está corriendo y el CRM quedó en el `5174`, el backend con perfil `dev` ya permite ese puerto.

---

## Scripts disponibles

| Comando              | Descripción                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `npm run dev`        | Inicia el servidor de desarrollo con recarga automática                   |
| `npm run build`      | Revisa los tipos de TypeScript y genera el build de producción en `dist/` |
| `npm run preview`    | Sirve localmente el build de producción para revisarlo                    |
| `npm run lint`       | Ejecuta ESLint sobre el proyecto                                          |
| `npm test`           | Corre todas las pruebas con Vitest una vez                                |
| `npm run test:watch` | Corre las pruebas en modo observador mientras desarrollas                 |

---

## Estructura del proyecto

```
agencia-360-crm-frontend/
├── .github/workflows/   # CI (lint, build, pruebas), CodeQL y Dependency Review
├── docs/                # Convenciones de ramas, commits y PR
├── public/              # Archivos estáticos servidos tal cual
├── src/
│   ├── api/             # Cliente HTTP y endpoints de acceso (login, usuarios, roles)
│   ├── componentes/     # Layout con menú lateral y piezas compartidas de las pantallas
│   ├── components/ui/   # Componentes de shadcn/ui
│   ├── hooks/           # Hooks compartidos
│   ├── lib/             # Utilidades (cn, paginación)
│   ├── mocks/           # Handlers de MSW y datos de ejemplo
│   ├── navegacion/      # Secciones por rol y rutas protegidas
│   ├── paginas/         # Login, inicio y usuarios
│   ├── prospectos/      # Registro y lista de prospectos
│   ├── sesion/          # Sesión: almacenamiento, contexto y nombres de rol
│   ├── test/            # Configuración común y utilidades de las pruebas
│   ├── App.tsx          # Rutas de la aplicación
│   ├── App.test.tsx     # Pruebas de navegación de la aplicación
│   ├── main.tsx         # Punto de entrada de la aplicación
│   ├── index.css        # Tema: tokens de la guía de estilos y Tailwind
│   └── estilos-anteriores.css  # CSS de la lista y el registro de prospectos, hasta migrarlos
├── components.json      # Configuración de shadcn/ui
├── index.html           # HTML base
├── eslint.config.js     # Configuración de ESLint
├── tsconfig*.json       # Configuración de TypeScript
├── vite.config.ts       # Configuración de Vite y Vitest
└── package.json
```

### Roles y secciones

Las secciones de cada rol están en `src/navegacion/secciones.ts`, según la matriz de roles. Cada pantalla nueva agrega ahí su sección y sus roles:

| Sección    | Ruta          | Roles                         |
| ---------- | ------------- | ----------------------------- |
| Prospectos | `/prospectos` | Ventas y Gerente de marketing |
| Registrar  | `/registrar`  | Ventas                        |
| Usuarios   | `/usuarios`   | Gerente de marketing          |

En Prospectos, el gerente de marketing además ve y cambia el vendedor de cada prospecto (reasignación).

Quien no tiene sesión va a `/login`. Un rol sin permiso para una ruta ve «Sin permiso». Si el token vence o el backend responde 401, la sesión se cierra y el login avisa que expiró.

---

## Arquitectura

El CRM y el ERP son aplicaciones web que consumen una **única API REST** construida con Spring Boot. El backend es un **monolito modular**: lo relacionado con el CRM vive en su módulo `ventascrm`, y los módulos se comunican por eventos de dominio.

```
  ERP web            CRM web (este repo)       App CareCar
     │                       │                      │
     └───────────────────────┼──────────────────────┘
                             ▼
           API REST · Spring Boot + Spring Modulith
                             │
         PostgreSQL · Redis · Almacenamiento · PAC (CFDI)
```

Lineamientos que afectan al frontend:

- La API se documenta con OpenAPI; el cliente TypeScript del frontend se generará a partir de ese contrato.
- Las reglas de negocio (por ejemplo, el cambio de etapa de un prospecto cuando se factura) las resuelve el backend; el CRM solo las muestra.
- El acceso se controla por roles: el vendedor ve y edita solo sus prospectos, y el gerente de marketing ve todos y administra los usuarios del CRM. La regla la aplica el backend; el CRM solo muestra lo que recibe.
- La interfaz debe funcionar bien en pantallas de celular, porque los vendedores la usan en piso de ventas.

---

## Pruebas

| Tipo                       | Herramienta                    | Estado         |
| -------------------------- | ------------------------------ | -------------- |
| Unitarias y de componentes | Vitest + React Testing Library | Configurado    |
| Simulación de la API       | MSW (Mock Service Worker)      | Configurado    |
| End-to-end                 | Playwright                     | Por configurar |

Las pruebas corren en un DOM simulado con `jsdom` y usan los matchers de `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveTextContent`, etc.). Para simular lo que hace el usuario (clics, escribir en un campo) se usa `@testing-library/user-event`.

Las pruebas usan los mismos handlers de MSW que `npm run dev` (`src/mocks/`). Una petición sin handler hace fallar la prueba. Para simular otra respuesta en una prueba se usa `server.use(...)`, y para entrar con un rol, `conSesion('VENTAS')` de `src/test/utilidades.ts`.

Cada prueba vive junto al componente que prueba, con el sufijo `.test.tsx`:

```bash
npm test             # corre todas las pruebas una vez
npm run test:watch   # vuelve a correrlas al guardar
```

---

## CI y checks del PR

Todo vive en `.github/workflows/` y corre en GitHub Actions. La rama `main` está protegida: solo se integra por PR, con una aprobación y **todos estos checks en verde**:

| Check                                       | Workflow          | Cuándo corre                          |
| ------------------------------------------- | ----------------- | ------------------------------------- |
| `Lint (ESLint)`                             | CI                | Cada push a cualquier rama y cada PR  |
| `Build (TypeScript + Vite)`                 | CI                | Cada push a cualquier rama y cada PR  |
| `Pruebas (Vitest + React Testing Library)`  | CI                | Cada push a cualquier rama y cada PR  |
| `Análisis de CodeQL (TypeScript)`           | CodeQL            | PR y push a `main`, y todos los lunes |
| `Revisión de dependencias nuevas/cambiadas` | Dependency Review | Solo en PR                            |

Antes de hacer push, corre lo mismo en local para no enterarte del error hasta abrir el PR:

```bash
npm run lint
npm run build
npm test
```

El detalle de cada check está en [`docs/convenciones-commits.md`](docs/convenciones-commits.md).

---

## Forma de trabajo

- Metodología **Scrumban + XP**, en parejas de desarrollador + Claude.
- Límite WIP: 1 historia activa por desarrollador.
- Tablero, iteraciones y wiki en **Azure DevOps**; código en **GitHub**; CI/CD con **GitHub Actions**.
- Ramas, commits y PR siguen [`docs/convenciones-commits.md`](docs/convenciones-commits.md): rama corta por tarea, commits `tipo(alcance): verbo + cambio`, PR con una aprobación y se integra con **merge commit**.

**Propuesta del backlog V2 (pendiente de aprobación):**

- **Definition of Ready:** la historia tiene formato _Como / quiero / para_, criterios comprobables, dependencias resueltas o simuladas, y cabe en un sprint.
- **Definition of Done:** criterios validados por el PO, pruebas unitarias (TDD) y CI en verde, revisión de la otra pareja, integración a la rama principal y requisitos no funcionales generales cumplidos (contraseñas con hash y HTTPS, bitácora de acciones sensibles y datos personales tratados según el aviso de privacidad).

---

## Pendientes por definir

| Tema                 | Qué falta                                               |
| -------------------- | ------------------------------------------------------- |
| Etapas del prospecto | Lista definitiva de etapas y motivos de pérdida         |
| Pantallas anteriores | Migrar la lista y el registro de prospectos a shadcn/ui |
| Pruebas              | Instalación y configuración de Playwright               |
| Despliegue           | Servicio de Azure y ambientes                           |

---

## Documentación relacionada

- **Wiki del proyecto (Azure DevOps):** [Agente360 Wiki](https://dev.azure.com/latticesystems/Agente360/_wiki/wikis/Agente360.wiki), sección _Arquitectura y Tecnologías_.
- **Convenciones de ramas, commits y PR:** [`docs/convenciones-commits.md`](docs/convenciones-commits.md)
- **ERP frontend:** [`agencia-360-erp-frontend`](https://github.com/lattice-systems/agencia-360-erp-frontend)
- **Backend:** [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend)
