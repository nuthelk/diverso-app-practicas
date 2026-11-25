# Diverso App — viajero (Expo)

App del viajero en React Native + Expo (SDK 58, Expo Router, TypeScript `strict`). Reemplaza a `apps/viajero` (Flutter) durante la migración.

## Instalar

```bash
cd apps/viajero_expo
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
npx expo start --web   # navegador (SPA, URLs sin #)
```

## Testear

```bash
npm test               # jest-expo + Testing Library; tests en tests/ (espejo de src/)
npm run typecheck      # tsc --noEmit
```

## Arquitectura

Por funcionalidad (Screaming Architecture) en capas, patrón MVVM + Repository + inyección por Context. Detalle y decisiones en [`odd/tasks/migracion-expo.md`](../../odd/tasks/migracion-expo.md) (S2, S3).

- `src/app/` — Expo Router: solo rutas, layouts y guards; cada ruta re-exporta una pantalla.
- `src/core/` — port de `diverso_core`: TypeScript puro sin React (config, modelos, errores, utils, legal, comparación, servicios y repositorios).
- `src/ui/` — sistema de diseño compartido (`theme/` tokens claro/oscuro, `components/`).
- `src/features/<funcionalidad>/` — `views/` (presentación pura), `view-models/` (hooks `useXxxViewModel`), `components/`.
- `src/composition/` — raíz de composición: crea los repositorios una vez y los provee por Context.
- `tests/` — espejo de `src/`; el alias `@/` apunta a `src/` en TypeScript, Metro y Jest.
