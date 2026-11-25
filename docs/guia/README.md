# Guías de Diverso App

Material para entender el código del repositorio. Para instalar, correr y probar todo el sistema,
el [README principal](../../README.md).

| Qué quieres entender | Dónde |
|---|---|
| El panel de agencias y admin (`apps/panel`, React 19 + TypeScript + Vite): arquitectura por funcionalidad, patrón Contenedor/Presentacional con hooks propios, rutas con React Router y cómo probarlo | [`apps/panel/ARQUITECTURA.md`](../../apps/panel/ARQUITECTURA.md) |
| Por qué la app del viajero (`apps/viajero`, React Native + Expo) está organizada como está: arquitectura por funcionalidad en capas y patrón MVVM + Repository + inyección por Context | [`odd/tasks/migracion-expo.md`](../../odd/tasks/migracion-expo.md) (S2 y S3) |
| Qué hace cada pantalla, ruta, modelo y consulta de la app del viajero (la especificación usada para la migración) | [`docs/migracion-expo/`](../migracion-expo/): [`inventario-viajero.md`](../migracion-expo/inventario-viajero.md) y [`inventario-core.md`](../migracion-expo/inventario-core.md) |

> **Las guías de Flutter/Dart y de Svelte ya no están aquí.** Explicaban versiones anteriores de
> las dos apps (el viajero en Flutter y el panel en Svelte), que se reemplazaron por Expo y React.
> Siguen en el historial de git: por ejemplo, `git show 079c72c:docs/guia/README.md` (o
> `git checkout 079c72c -- docs/guia` en una rama aparte).
