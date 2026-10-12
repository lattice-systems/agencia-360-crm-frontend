# Agencia360 · CRM Frontend

Aplicación web del **CRM de CareCar**, el sistema con el que los vendedores de la agencia automotriz dan seguimiento a sus prospectos, desde el primer contacto hasta la entrega de la unidad. Está pensada para usarse principalmente desde el celular.

> **Estado:** estructura inicial del proyecto. `src/App.tsx` todavía es la pantalla de ejemplo de la plantilla de Vite; no hay funcionalidad del CRM implementada.

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

| Aplicación        | Usuarios                                         | Repositorio                                                                               |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **CRM web**       | Vendedores, gerente de marketing y administrador | Este repositorio                                                                          |
| **ERP web**       | Personal de los departamentos de la agencia      | [`agencia-360-erp-frontend`](https://github.com/lattice-systems/agencia-360-erp-frontend) |
| **API (backend)** | Atiende al ERP, al CRM y a la app CareCar        | [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend)           |

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

| Tecnología                     | Uso                                |
| ------------------------------ | ---------------------------------- |
| React + TypeScript             | Librería de UI y tipado estático   |
| Vite                           | Servidor de desarrollo y build     |
| ESLint                         | Análisis estático del código       |
| Vitest + React Testing Library | Pruebas unitarias y de componentes |

Las librerías complementarias (navegación, formularios, consumo de API y componentes de UI) aún no están definidas. Ver [Pendientes por definir](#pendientes-por-definir).

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
│   ├── test/setup.ts    # Configuración común de las pruebas
│   ├── assets/          # Imágenes importadas desde el código
│   ├── App.tsx          # Componente raíz (todavía la pantalla de ejemplo de Vite)
│   ├── App.test.tsx     # Prueba del componente raíz
│   ├── main.tsx         # Punto de entrada de la aplicación
│   └── index.css        # Estilos globales
├── index.html           # HTML base
├── eslint.config.js     # Configuración de ESLint
├── tsconfig*.json       # Configuración de TypeScript
├── vite.config.ts       # Configuración de Vite y Vitest
└── package.json
```

La organización de carpetas dentro de `src/` se definirá conforme avance el desarrollo.

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
- El acceso se controla por roles: vendedor, gerente de marketing y administrador.
- La interfaz debe funcionar bien en pantallas de celular, porque los vendedores la usan en piso de ventas.

---

## Pruebas

| Tipo                       | Herramienta                    | Estado         |
| -------------------------- | ------------------------------ | -------------- |
| Unitarias y de componentes | Vitest + React Testing Library | Configurado    |
| Simulación de la API       | MSW (Mock Service Worker)      | Por configurar |
| End-to-end                 | Playwright                     | Por configurar |

Las pruebas corren en un DOM simulado con `jsdom` y usan los matchers de `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveTextContent`, etc.). Para simular lo que hace el usuario (clics, escribir en un campo) se usa `@testing-library/user-event`; `src/App.test.tsx` tiene un ejemplo con el botón del contador.

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

| Tema                 | Qué falta                                                   |
| -------------------- | ----------------------------------------------------------- |
| Pantallas del CRM    | Reemplazar la pantalla de ejemplo de Vite por la del CRM    |
| Etapas del prospecto | Lista definitiva de etapas y motivos de pérdida             |
| Librerías            | Navegación, formularios, consumo de API y componentes de UI |
| Estructura de `src/` | Organización de carpetas y convenciones de código           |
| Pruebas              | Instalación y configuración de MSW y Playwright             |
| Despliegue           | Servicio de Azure y ambientes                               |

---

## Documentación relacionada

- **Wiki del proyecto (Azure DevOps):** [Agente360 Wiki](https://dev.azure.com/latticesystems/Agente360/_wiki/wikis/Agente360.wiki), sección _Arquitectura y Tecnologías_.
- **Convenciones de ramas, commits y PR:** [`docs/convenciones-commits.md`](docs/convenciones-commits.md)
- **ERP frontend:** [`agencia-360-erp-frontend`](https://github.com/lattice-systems/agencia-360-erp-frontend)
- **Backend:** [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend)
