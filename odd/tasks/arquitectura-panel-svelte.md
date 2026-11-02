# Arquitectura del panel Svelte (apps/panel_svelte)

Reorganizar `apps/panel_svelte/src` por funcionalidad, partir el código grande sin cambiar comportamiento y escribir una guía de Svelte.
Rama `refactor/arquitectura-panel-svelte` en el worktree `.worktrees/panel-svelte` (sale de `feat/arquitectura-viajero` @ 7c1c17a).

## Specs

- S1 Pedido: «Necesito que organices la arquitectura de carpetas de svelte, tengas buenas practicas tambien, codigo limpio y dividido y tambien esxribeme una guia para entender svelte»
- S2 Estructura: «Por funcionalidad (Recomendado)» — `src/app/` (App, rutas, guards), `src/features/<funcionalidad>/` (páginas, componentes, lógica y API propios), `src/shared/` (ui, lib, api genéricos). Igual que viajero.
- S3 Profundidad: «Mover + dividir lo grande (Recomendado)» — «Mover archivos, partir api.ts por funcionalidad, router declarativo y partir PlanForm/Admin/AdminDispersiones en subcomponentes. Sin cambiar comportamiento; los 414 tests deben seguir verdes.»
- S4 Rama: «Worktree aparte (Recomendado)» — «Creo un git worktree con la rama refactor/arquitectura-panel-svelte; no toco tu carpeta ni tus cambios de viajero.»
- S5 Guía: «Desde React/TS, con este código (Recomendado)» — «Nueva sección docs/guia/svelte/: Svelte 5 explicado desde React, runes ($state, $derived, $effect, $props), la arquitectura nueva y cómo probar, todo con ejemplos reales del panel.»

## Tasks

- T1+T2 [ ] Alias `@`, `src/shared/` (ui, lib, api: supabase + errores) y `src/features/*` (páginas, componentes, lógica y `*.api.ts` por funcionalidad; tipos repartidos; código muerto fuera) — S2, S3 — inline — commit: pendiente
- T3 [ ] `src/app/`: tabla de rutas declarativa, guard de sesión puro, Toast y Shell — S2, S3 — inline — commit: pendiente
- T4 [ ] Partir PlanForm en subcomponentes — S3 — inline — commit: pendiente
- T5 [ ] Partir Admin y AdminDispersiones en subcomponentes — S3 — inline — commit: pendiente
- T6 [ ] Guía `docs/guia/svelte/` + README de la guía y del repo — S5 — inline — commit: pendiente
- T7 [ ] Verificación final: 414+ tests, build, svelte-check sin errores nuevos — S3 — inline — commit: —

## Log

- L1 (usuario): «Necesito que organices la arquitectura de carpetas de svelte, tengas buenas practicas tambien, codigo limpio y dividido y tambien esxribeme una guia para entender svelte»
- L2 (usuario, cuestionario): Estructura → «Por funcionalidad (Recomendado)»; Profundidad → «Mover + dividir lo grande (Recomendado)»; Rama → «Worktree aparte (Recomendado)»; Guía → «Desde React/TS, con este código (Recomendado)».
- L3 (evidencia): línea base en el worktree: 414 tests verdes. Sin uso fuera de sus tests: `ocupacion.ts` (reemplazado por `resumen.ts` en el rediseño), `StatCard.svelte`, interfaz `Profile`.
- L4 (contexto): `odd/tasks/rediseno-panel-agencias.md` (T3–T7 pendientes, pantalla por pantalla) nombra rutas viejas (`Dashboard.svelte`…); al terminar, esas tareas trabajan sobre las rutas nuevas. Ese archivo tiene cambios sin commitear de otra sesión en la carpeta principal: no se toca desde aquí.
- L5 (decisión T1+T2): T1 y T2 van en un solo commit porque un paso intermedio no compila. `api.ts` se parte en `<funcionalidad>.api.ts` + `shared/api/errores.ts` (puro, los tests de páginas ya no lo mockean); `types.ts` en `agencias/agencia.ts`, `planes/plan.ts` y `VentaRow` en `ventas/ventas.ts`; el Supabase falso de los tests de datos pasa a `src/test/supabase-falso.ts`. Imports: relativos dentro de una funcionalidad, `@/…` entre carpetas. Tests: 409 = 414 − 5 de `ocupacion.test.ts` (código muerto borrado).
