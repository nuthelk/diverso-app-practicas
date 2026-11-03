# Arquitectura del panel Svelte (apps/panel_svelte)

Reorganizar `apps/panel_svelte/src` por funcionalidad, partir el código grande sin cambiar comportamiento y escribir una guía de Svelte.
Rama `refactor/arquitectura-panel-svelte` en el worktree `.worktrees/panel-svelte` (sale de `feat/arquitectura-viajero` @ 7c1c17a).

## Specs

- S1 Pedido: «Necesito que organices la arquitectura de carpetas de svelte, tengas buenas practicas tambien, codigo limpio y dividido y tambien esxribeme una guia para entender svelte»
- S2 Estructura: «Por funcionalidad (Recomendado)» — `src/app/` (App, rutas, guards), `src/features/<funcionalidad>/` (páginas, componentes, lógica y API propios), `src/shared/` (ui, lib, api genéricos). Igual que viajero.
- S3 Profundidad: «Mover + dividir lo grande (Recomendado)» — «Mover archivos, partir api.ts por funcionalidad, router declarativo y partir PlanForm/Admin/AdminDispersiones en subcomponentes. Sin cambiar comportamiento; los 414 tests deben seguir verdes.»
- S4 Rama: «Worktree aparte (Recomendado)» — «Creo un git worktree con la rama refactor/arquitectura-panel-svelte; no toco tu carpeta ni tus cambios de viajero.»
- S5 Guía: «Desde React/TS, con este código (Recomendado)» — «Nueva sección docs/guia/svelte/: Svelte 5 explicado desde React, runes ($state, $derived, $effect, $props), la arquitectura nueva y cómo probar, todo con ejemplos reales del panel.»
- S6 SvelteKit: «no veo que estes implementando arquitectura de carpetas … me gusta que lo hagamos asi» con el árbol de SvelteKit (`src/lib/` con alias `$lib`, `src/params/`, `src/routes/` con `+layout.svelte`/`+page.svelte`, `app.html`, `app.d.ts`, `hooks.client.ts`, `static/`, `tests/`, `svelte.config.js`, `vite.config.ts`). Elegido: «SvelteKit estático, URLs #/ (Recomendado)» — «adapter-static + router por hash: mismas URLs (#/planes) y mismo hosting estático. Sin hooks.server ni $lib/server porque no hay servidor. Suma @sveltejs/kit y adapter-static; el build sigue saliendo en dist/.» Árbol aprobado: `routes/+layout.svelte` (sesión + toast), `+layout.ts` (ssr=false), `login/ starter/ consentimiento/`, `legal/[doc=doc]/`, `admin/ admin/dispersiones/`, `(panel)/+layout.svelte` = Shell, `(panel)/dashboard/ planes/ planes/nuevo/ planes/editar/[id]/ ventas/ liquidaciones/[id]/ …`; `lib/features/<funcionalidad>/` y `lib/shared/`; `static/` con favicon, íconos y manifest.
- S7 Orden interno: «aun me parece que esta un poco desordenado» (captura de `lib/features/agencias` plano). Elegido: «Subcarpetas por rol (Recomendado)» — «Cada funcionalidad con las mismas carpetas: pages/, components/, api/ y model/ (tipos y lógica pura). Se lee igual en todas.»; y «tests/ en la raíz, espejo de src (Recomendado)» — «Como en el árbol de SvelteKit que me mostraste: tests/unit/ refleja la estructura de src/lib; src queda solo con código. Los helpers siguen en tests/.»

## Tasks

- T1+T2 [x] Alias `@`, `src/shared/` (ui, lib, api: supabase + errores) y `src/features/*` (páginas, componentes, lógica y `*.api.ts` por funcionalidad; tipos repartidos; código muerto fuera) — S2, S3 — inline — commit: 415a5a7
- T3 [x] `src/app/`: tabla de rutas declarativa, guard de sesión puro, Toast y Shell — S2, S3 — worker + parent — commit: 1ed6aac
- T4 [x] Partir PlanForm en subcomponentes — S3 — worker — commit: 36baad3
- T5 [x] Partir Admin y AdminDispersiones en subcomponentes — S3 — worker — commit: d474a0c
- T6 [x] Guía `docs/guia/svelte/` + README de la guía y del repo — S5 — worker — commit: fea2991 (y 38760b8: `oncerrar`)
- T7 [x] Verificación final: tests, build, svelte-check sin errores nuevos — S3 — inline — commit: — (512 tests / 34 archivos, build OK, check 12 = base)
- T8 [x] Migrar a SvelteKit estático con router por hash (S6): deps, config, `routes/`, `lib/`, `static/`, `app.html`, params, hooks.client, tests — S3, S6 — worker — commit: 90ba75b (+ 67ad853 script de íconos, 94808a5 tests de regresión)
- T9 [x] Guía y README al día con SvelteKit — S5, S6 — worker — commit: f1cc3cd, c5aa959
- T10 [x] Verificación independiente (riesgo ítem 5: dependencias y build) — S3, S6 — gentle-ai-verify — commit: — (PASS en las 6 comprobaciones, sin bloqueos)
- T11 [ ] Subcarpetas pages/ components/ api/ model/ en cada funcionalidad y tests a tests/unit/ espejo de src — S7 — worker — commit: pendiente
- T12 [ ] Guía y README con las rutas nuevas — S5, S7 — worker — commit: pendiente

## Log

- L1 (usuario): «Necesito que organices la arquitectura de carpetas de svelte, tengas buenas practicas tambien, codigo limpio y dividido y tambien esxribeme una guia para entender svelte»
- L2 (usuario, cuestionario): Estructura → «Por funcionalidad (Recomendado)»; Profundidad → «Mover + dividir lo grande (Recomendado)»; Rama → «Worktree aparte (Recomendado)»; Guía → «Desde React/TS, con este código (Recomendado)».
- L3 (evidencia): línea base en el worktree: 414 tests verdes. Sin uso fuera de sus tests: `ocupacion.ts` (reemplazado por `resumen.ts` en el rediseño), `StatCard.svelte`, interfaz `Profile`.
- L4 (contexto): `odd/tasks/rediseno-panel-agencias.md` (T3–T7 pendientes, pantalla por pantalla) nombra rutas viejas (`Dashboard.svelte`…); al terminar, esas tareas trabajan sobre las rutas nuevas. Ese archivo tiene cambios sin commitear de otra sesión en la carpeta principal: no se toca desde aquí.
- L5 (decisión T1+T2): T1 y T2 van en un solo commit porque un paso intermedio no compila. `api.ts` se parte en `<funcionalidad>.api.ts` + `shared/api/errores.ts` (puro, los tests de páginas ya no lo mockean); `types.ts` en `agencias/agencia.ts`, `planes/plan.ts` y `VentaRow` en `ventas/ventas.ts`; el Supabase falso de los tests de datos pasa a `src/test/supabase-falso.ts`. Imports: relativos dentro de una funcionalidad, `@/…` entre carpetas. Tests: 409 = 414 − 5 de `ocupacion.test.ts` (código muerto borrado).
- L6 (evidencia T1+T2): el build falló la primera vez aunque los tests pasaban (`auth.svelte.ts` seguía importando `./supabase`; los tests mockean `auth`): build y svelte-check son parte de cada verificación. El alias usa `'@': '/src'` para no sumar `@types/node`. svelte-check: 12 errores, igual que la base. Tramo de esta rama: commits desde 7c1c17a (la rama madre arrastra la cadena de viajero no fusionada a main).
- L7 (parent T3–T5): backstop de contexto → T3, T4 y T5 a workers en paralelo con superficies disjuntas. Revisión del parent: el router nuevo resolvía /planes/nuevo y /planes/editar/x al mismo componente, así que Svelte ya no volvía a montar PlanForm (que lee planId una vez al montar); `RutaResuelta.patron` + `{#key ruta.patron}` en App reproduce el montaje de antes, con prueba. Verificado: 509 tests (31 archivos), build OK, svelte-check 12 errores = base.
- L8 (usuario): «no veo que estes implementando arquitectura de carpetas

mi-app/
├── src/
│   ├── lib/                 ← código reutilizable (alias $lib)
│   │   ├── server/          ← código que SOLO corre en el servidor ($lib/server)
│   │   └── index.ts
│   ├── params/              ← "matchers" para validar parámetros de ruta
│   ├── routes/              ← el enrutamiento por sistema de archivos
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   └── about/
│   │       └── +page.svelte
│   ├── app.html             ← plantilla HTML base
│   ├── app.d.ts             ← tipos globales (Locals, PageData, Error...)
│   ├── hooks.server.ts      ← middleware del servidor (auth, logging...)
│   └── hooks.client.ts      ← manejo de errores en el cliente
├── static/                  ← archivos servidos tal cual (favicon, robots.txt)
├── tests/
├── svelte.config.js
├── vite.config.ts
└── package.json

me gusta que lo hagamos asi»
- L9 (parent): el usuario miraba la carpeta principal; el trabajo vive en el worktree. Explicado que ese árbol es SvelteKit (otro framework), que `hooks.server.ts` y `$lib/server` no aplican (sin servidor: estático + Supabase desde el navegador con RLS) y que las URLs `#/` existen porque el hosting estático no devuelve index.html en otras rutas. Cuestionario → «SvelteKit estático, URLs #/ (Recomendado)». Riesgo ítem 5 (dependencias nuevas y build) → verificación independiente (T10).
- L10 (worker T8 + verify T10): Kit 3.x exige vite 8 → se usa Kit 2.70.3 + adapter-static 3.0.10 (peers OK). Con `router.type: 'hash'`: `goto` recibe `'#/ruta'` (`goto('/ruta')` es navegación nativa → 404 en el estático), la ruta vive en `page.url.hash` (`rutaActual`), y el build rechaza `ssr`/`prerender`, así que no hay `+layout.ts` (desvío forzado de S6). `legal/[[doc=doc]]` en vez de `[doc=doc]` para que `/legal` siga dibujando LegalPage. Shell vive en `features/agencias/components` (shared no importa features). Diferencias aceptadas: sin coincidencia por prefijo, error sin Shell, `/` → `/starter`, documento legal desconocido → error; editar el hash a mano recarga la página (comportamiento de Kit). Verificación independiente: rutas equivalentes, guard byte a byte igual, sin código de servidor, 488/32 → con los tests de regresión propuestos, 512/34.
- L11 (pendiente fuera de alcance): al pasar de `/planes/editar/a` a `/planes/editar` sin id el borrador conserva el plan anterior (ya pasaba con el router viejo). `npm audit` no se corrió (sin red); `cookie<0.7` llega con Kit y solo lo usa el servidor de Kit, que este build no usa.
- L12 (usuario): «veo que los archivos aun siguen desordenado, tambien los componentes .svelte mantienen el script el dom y el style en el mismo lugar» (miraba la carpeta principal, no el worktree). Explicado: el componente de un solo archivo es el diseño de Svelte (estilos scoped; vitePreprocess no soporta `<style src>`); solo 3 de 65 componentes tienen `<style>`; la lógica pura ya vive en `.ts` con tests.
- L13 (usuario): «aun me parece que esta un poco desordenado [captura de lib/features/agencias], olvida lo que te dije antes era proque no estaba en el worktree indicado» → cuestionario de S7.
