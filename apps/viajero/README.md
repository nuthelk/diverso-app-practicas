# Diverso App — viajero (Expo)

App del viajero en React Native + Expo (SDK 58, Expo Router, TypeScript `strict`). Reemplazó a la app Flutter: el inventario de lo migrado está en [`docs/migracion-expo/`](../../docs/migracion-expo/).

## Instalar

```bash
cd apps/viajero
npm install
```

Para agregar dependencias usá siempre `npx expo install <paquete>` (elige la versión compatible con el SDK).

## Configurar

```bash
cp .env.example .env
```

Completá `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` (con Supabase local: `http://127.0.0.1:54331` (puerto de `supabase/config.toml`) y la key anon/publishable que imprime `supabase status`). `.env` no se versiona.

## Correr

```bash
npx expo start         # Expo Go / emulador (a: Android, i: iOS)
npx expo start --web --port 8080   # navegador (SPA, URLs sin #); 8080 está en la allowlist de pagos-iniciar
```

En un dispositivo (emulador, simulador o celular) la app busca el Supabase local en el PC que sirve
Metro, así que no hace falta `.env` para desarrollar.

### Build nativa (splash, ícono y todo lo que Expo Go no muestra)

Expo Go no muestra el splash ni el ícono de la app. Para verlos hace falta una development build:

```bash
npx expo run:android   # compila e instala en el emulador o el celular conectado
```

En **Windows** la parte en C++ (Reanimated, Worklets, gesture-handler) arma rutas de más de 260
caracteres y el ninja 1.10 de la CMake 3.22 del SDK no las soporta, aunque Windows tenga
`LongPathsEnabled`. Lo que funciona:

1. Instalar una CMake con ninja ≥ 1.12: `sdkmanager "cmake;3.31.6"` (no la 4.x: dejó de aceptar
   `cmake_minimum_required` antiguos que usan algunas librerías).
2. Compilar desde una ruta corta (p. ej. un `git worktree` en `C:\dv\vb`). No usar `subst`: Gradle
   mezcla `V:\` y `C:\` y falla con «different roots».
3. Después del prebuild, en `android/local.properties` (archivo local, no se versiona):
   `cmake.dir=C\:/Users/<usuario>/AppData/Local/Android/Sdk/cmake/3.31.6`.

`expo run:android` reescribe los scripts `android`/`ios` de `package.json` (`expo run:*`): revertirlo
si se quiere seguir usando Expo Go con `npm run android`. En el emulador, la build de desarrollo
llega a Metro por `localhost:8081` con `adb reverse tcp:8081 tcp:8081` (por `10.0.2.2` la descarga
del bundle falla con `ProtocolException`). iOS solo se compila en macOS (o con EAS Build).

## Testear

```bash
npm test               # jest-expo + Testing Library; tests en tests/ (espejo de src/)
                       # integración contra Supabase local: solo con SUPABASE_SERVICE_ROLE_KEY en el entorno
npm run typecheck      # tsc --noEmit
```

## Arquitectura

Por funcionalidad (Screaming Architecture) en capas, patrón MVVM + Repository + inyección por Context. Detalle y decisiones en [`odd/tasks/migracion-expo.md`](../../odd/tasks/migracion-expo.md) (S2, S3).

- `src/app/` — Expo Router: solo rutas, layouts y guards; cada ruta re-exporta una pantalla.
- `src/core/` — port del antiguo paquete Dart `diverso_core`: TypeScript puro sin React (config, modelos, errores, utils, legal, comparación, servicios y repositorios).
- `src/ui/` — sistema de diseño compartido (`theme/` tokens claro/oscuro, `components/`).
- `src/features/<funcionalidad>/` — `views/` (presentación pura), `view-models/` (hooks `useXxxViewModel`), `components/`.
- `src/router/` — tabla de rutas tipada, guard puro `sesionRedirect`, `destinoSeguro` y `volverSeguro`.
- `src/composition/` — raíz de composición: crea los repositorios una vez y los provee por Context.
- `tests/` — espejo de `src/`; el alias `@/` apunta a `src/` en TypeScript, Metro y Jest.
