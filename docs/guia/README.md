# Guías de Diverso App

Material para entender el código del repositorio. Para instalar, correr y probar todo el sistema,
el [README principal](../../README.md).

| Qué quieres entender | Dónde |
|---|---|
| El panel de agencias y admin (`apps/panel_svelte`) y Svelte 5 desde React | [Guía de Svelte](svelte/README.md) |
| Por qué la app del viajero (`apps/viajero`, React Native + Expo) está organizada como está: arquitectura por funcionalidad en capas y patrón MVVM + Repository + inyección por Context | [`odd/tasks/migracion-expo.md`](../../odd/tasks/migracion-expo.md) (S2 y S3) |
| Qué hace cada pantalla, ruta, modelo y consulta de la app del viajero (la especificación usada para la migración) | [`docs/migracion-expo/`](../migracion-expo/): [`inventario-viajero.md`](../migracion-expo/inventario-viajero.md) y [`inventario-core.md`](../migracion-expo/inventario-core.md) |

> **La guía de Flutter y Dart ya no está aquí.** Explicaba la versión Flutter de la app del
> viajero, que se reemplazó por la de Expo. Sigue en el historial de git: por ejemplo,
> `git show 079c72c:docs/guia/README.md` (o `git checkout 079c72c -- docs/guia` en una rama aparte).
