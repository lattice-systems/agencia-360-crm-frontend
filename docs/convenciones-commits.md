# Contribuir a Agencia360

Estas reglas aplican a los tres repositorios de Agencia360: el backend, el ERP frontend y el CRM frontend (este repositorio). Los tres siguen el mismo flujo; solo cambian los checks de cada uno.

## Regla principal

`main` debe permanecer estable. Integramos cambios únicamente mediante pull request (PR), con al menos una aprobación de otra persona y todos los checks requeridos en verde. No hagas push directo a `main`.

## Flujo de trabajo

1. Actualiza tu copia local de `main`.
2. Crea una rama corta para una sola tarea.
3. Haz commits con mensajes claros y publica la rama.
4. Abre un PR hacia `main`, completa la descripción y espera a que termine CI.
5. Atiende los comentarios y consigue al menos una aprobación.
6. Cuando todos los checks estén verdes y no queden conversaciones pendientes, integra el PR con **Create a merge commit** (es el único método que permite la regla de `main`) y borra la rama.

## Nombres de ramas

Usa este formato:

```text
<tipo>/<issue>-<descripcion-corta>
```

Ejemplos:

```text
feat/tec-2-git-workflow
fix/api-validar-vin
docs/tec-2-guia-git
```

Tipos comunes: `feat` para una función nueva, `fix` para una corrección, `docs` para documentación, `test` para pruebas, `build` para `package.json` y dependencias, y `ci` o `chore` para automatización o mantenimiento.

## Mensajes de commit

Usa este formato:

```text
<tipo>(<alcance>): <verbo + cambio>
```

Ejemplos:

```text
feat(inventario): agregar recepción de refacciones
fix(api): validar formato del VIN
docs(tec-2): documentar flujo de PR
test(crm): cubrir validación del formulario de prospectos
ci(backend): ejecutar pruebas en cada push
```

Escribe mensajes breves y concretos. Evita mensajes como `cambios`, `update` o `fix` sin contexto. El alcance entre paréntesis puede ser un módulo o área; se puede omitir si no aporta claridad.

## Pull requests

El título del PR debe resumir el cambio. Puedes usar el mismo formato que un commit:

```text
docs(TEC-2): documentar flujo de ramas y PR
```

Incluye en la descripción:

- **Qué cambió:** resumen breve y issue relacionada.
- **Cómo se probó:** pruebas ejecutadas o checks de CI que cubren el cambio.
- **Capturas:** cuando el cambio afecta una pantalla.

Antes de pedir revisión, comprueba que el PR tiene un alcance claro, que CI terminó y que no hay conflictos. Resuelve los comentarios antes de integrar.

## Revisión y checks requeridos

- Cada PR necesita al menos **una aprobación de otra persona**.
- Todos los checks requeridos deben terminar correctamente.
- Los workflows deben ejecutarse en cada push y en los PRs dirigidos a `main`.
- Backend: build y pruebas, incluidas las pruebas con Testcontainers.
- ERP frontend: lint, build y pruebas con Vitest y React Testing Library.
- CRM frontend: lint, build y pruebas con Vitest y React Testing Library.

Los nombres exactos de los checks requeridos se configuran en GitHub después de que los workflows hayan corrido al menos una vez.

### CRM frontend: CI en cada push

El workflow `.github/workflows/ci.yml` corre en cada push a cualquier rama y en cada PR hacia `main`. Tiene un job por revisión, que corren en paralelo, para que en el PR se vea directamente cuál falló:

| Check | Qué revisa |
| --- | --- |
| `CI / Lint (ESLint)` | Reglas de ESLint |
| `CI / Build (TypeScript + Vite)` | Tipos de TypeScript y build de producción |
| `CI / Pruebas (Vitest + React Testing Library)` | Pruebas unitarias y de componentes |

Además hay dos revisiones de seguridad:

| Check | Cuándo corre | Qué revisa |
| --- | --- | --- |
| `CodeQL / Análisis de CodeQL (TypeScript)` | Push y PR a `main`, y todos los lunes | Vulnerabilidades y código inseguro (XSS, inyecciones, etc.). Los hallazgos aparecen en **Security → Code scanning** |
| `Dependency Review / Revisión de dependencias nuevas/cambiadas` | Solo en PR | Bloquea el PR si agrega una dependencia con vulnerabilidad alta o crítica, y deja un comentario con el resumen |

Antes de hacer push, corre lo mismo en local:

```bash
npm run lint    # ESLint
npm run build   # revisión de tipos con TypeScript + build de Vite
npm test        # pruebas con Vitest y React Testing Library
```

Las pruebas viven junto al componente que prueban, con el sufijo `.test.tsx` (por ejemplo, `src/App.test.tsx`). Usa `npm run test:watch` mientras desarrollas para que se vuelvan a correr al guardar.

Las dependencias no se actualizan con bots: los cambios de versión en `package.json` se hacen a mano en un PR propio (`build(deps): ...`).

## Protección de `main` en GitHub

Configura una regla de protección para `main` que:

- Exija un PR antes de integrar.
- Exija al menos una aprobación y checks requeridos en verde.
- Exija resolver las conversaciones de revisión.
- Bloquee push directo, force-push y borrado de la rama.
- Evite excepciones de bypass para el trabajo normal.

## Resumen

```text
actualizar main -> crear rama -> commit y push -> abrir PR -> aprobación + CI verde -> merge
```
