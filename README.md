# Diverso App

Marketplace de dos lados que conecta a los viajeros del Valle de Aburrá con agencias
turísticas antioqueñas **verificadas** (RNT + Cámara de Comercio). Implementación del
MVP definido en los Anexos 4–6 del proyecto de Ingeniería de Software
(Corporación Universitaria Iberoamericana).

> Eje central validado: **confianza y transparencia** — no visibilidad.
> "Los viajeros sí encuentran agencias, pero no confían en ellas ni en la
> información que publican, y por eso no cierran la compra."

## Qué incluye este MVP (Fase 1 del Anexo 6)

| Lado | App | Funciones |
|---|---|---|
| Viajero (B2C) | `apps/viajero` (Flutter móvil) | Catálogo con buscador y filtros, ficha estandarizada con precio final e itinerario, cupos en tiempo real, reserva + pago simulado (PSE/Nequi/Daviplata/tarjeta) con confirmación inmediata, mis reservas con cancelación, reseñas verificadas (solo quien viajó) |
| Agencia (B2B) | `apps/panel_svelte` (Svelte 5 + Tailwind 4 / PWA) | Onboarding con verificación RNT y autorización de datos, dashboard de ventas y cupos, CRUD de planes con ficha estandarizada, calendario de cupos, conciliación con comisión 12%, avisos de RNT por vencer o vencido |
| Admin | ídem panel (rol admin) | Verificar con vigencia del RNT, rechazar con motivo, renovar vigencia, retirar verificación e historial auditable |

**Fuera de alcance (Fase 2/3):** recomendador IA, suscripción sorpresa, gamificación,
inventario compartido entre agencias, alertas de temporada, bienestar corporativo,
pasarela real en producción. El pago es **simulado** pero el diseño ya tiene la
abstracción `PaymentGateway` (paquete `diverso_core`) para enchufar Wompi/PayU sandbox
sin reescribir flujos: la RPC `confirm_payment` es el punto único de confirmación.

## Arquitectura

```
apps/viajero          → Flutter (Android/iOS/Web) — app del viajero
apps/panel_svelte     → Svelte 5 + Tailwind 4 (SPA/PWA) — panel B2B + admin
apps/panel_agencias   → (legado) versión Flutter Web del panel, misma API
packages/diverso_core → modelos, servicios y PaymentGateway compartidos
supabase/             → migraciones SQL, seed y config del stack local
```

- **Backend:** Supabase (PostgreSQL + Auth + Storage + API REST auto-generada),
  enfoque API-first como pide el Anexo 6.
- **Anti-sobreventa (el reto de ingeniería central):** la reserva vive en la RPC
  `create_booking`, que descuenta cupos con un `UPDATE` atómico condicional
  (`WHERE cupo_disponible >= pax`, decremento atómico condicional; no es bloqueo
  optimista con columna de versión). Si dos viajeros compiten por el último cupo,
  exactamente uno gana y el otro recibe `SIN_CUPO`. Desde la migración 0002 la misma
  sentencia exige además plan publicado, fecha futura y agencia habilitada.
  Probado con carrera real (test de integración + curl concurrente).
- **RLS por rol** en todas las tablas; la vista de conciliación usa
  `security_invoker` para que cada agencia solo vea sus ventas.
- **Reseñas verificadas:** solo se aceptan sobre reservas propias confirmadas con
  fecha ya pasada; `plan_id` y `viajero_id` se derivan de la reserva por trigger,
  nunca del cliente.

## Verificación de agencias y cumplimiento (migración 0002)

`supabase/migrations/0002_verificacion_cumplimiento.sql` agrega:

- **Vigencia del RNT:** `rnt_vigente_hasta`, `verificado_at`, `verificado_por` y
  `motivo_rechazo` en `agencies`. Una agencia solo vende si está *verificada y con RNT
  vigente* (`agencia_habilitada()`); se aplica en las políticas RLS del catálogo, al
  publicar planes y dentro de `create_booking`. Supuesto: renovación anual, por
  defecto hasta el 31 de marzo del año siguiente (confirmar con la normativa vigente).
- **Re-verificación automática:** si una agencia verificada cambia su RNT o su
  matrícula, vuelve a `pendiente` y sus planes se ocultan hasta revisarla.
- **Historial auditable:** `agency_verification_log` (registro, verificación,
  rechazo con motivo, re-verificación y renovaciones), visible para admin y dueño.
- **Ley 1581 de 2012:** autorización expresa (casillas no marcadas) en el registro
  del viajero y de la agencia; la evidencia se guarda en `consents` con versión y
  fecha. Si cambia la versión (`version_documentos_legales()`), la app y el panel
  piden aceptar de nuevo. Textos en `apps/panel_svelte/src/lib/legal.ts` y
  `packages/diverso_core/lib/legal.dart` (**borradores** para revisión jurídica).
- **Seguridad:** el rol `admin` ya no se puede pedir desde los metadatos del registro
  (solo `raw_app_meta_data`), y los viajeros ya no ven correos ni teléfonos de agencias
  pendientes o rechazadas.

Pruebas: `supabase db reset` y luego
`psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -f supabase/tests/0002_verificacion_cumplimiento.sql`
(26 casos; modifica datos demo, así que conviene volver a hacer `supabase db reset`).

## Cómo correr (desarrollo local)

Requisitos: Docker Desktop corriendo, Flutter (testeado con 3.47.5), Supabase CLI.

```bash
cd diverso-app

# 1. Levantar el stack local (Postgres, Auth, REST, Studio en 127.0.0.1:54331)
supabase start
supabase db reset        # aplica migraciones + seed demo

# 2. App del viajero (web para demo rápida)
cd apps/viajero
flutter pub get
flutter run -d chrome    # o: flutter run -d <emulador-android> con la URL de abajo

# 3. Panel de agencias (Svelte 5 + Tailwind 4)
cd ../panel_svelte
npm install
npm run dev            # desarrollo (http://localhost:5173)
npm run build          # producción → dist/ (servir con cualquier estático)
```

**Emulador de Android:** el host local no es `127.0.0.1` sino `10.0.2.2`:

```bash
flutter run -d emulator-5554 --dart-define=SUPABASE_URL=http://10.0.2.2:54331
```

### Probar en celular Android (USB)

1. Activa **Opciones de desarrollador → Depuración USB** y conecta el teléfono.
2. Crea un túnel para que el `localhost` del teléfono llegue al Supabase del PC
   (no requiere compartir WiFi y evita el firewall):

   ```bash
   adb reverse tcp:54331 tcp:54331
   ```

3. Ejecuta la app en el dispositivo:

   ```bash
   cd apps/viajero
   flutter run -d R5CW60JDZPE   # usa el ID que muestre `flutter devices`
   ```

La app queda instalada (`com.diversoapp.viajero`) y puedes abrirla normalmente;
solo recuerda que mientras el backend sea local necesita el cable puesto y el
túnel activo (se pierde al desconectar; basta repetir el `adb reverse`).

Si prefieres **WiFi en vez de cable** (ambos en la misma red), omite el túnel y
agrega `--dart-define=SUPABASE_URL=http://192.168.1.4:54331` (la IP LAN del PC);
si el firewall de Windows bloquea, permite el puerto 54331 en entrada.

Los builds `debug` y `profile` ya tienen `usesCleartextTraffic` para permitir el
HTTP local; el build `release` con pasarela real usará HTTPS.

Los puertos del stack se movieron al rango 5433x (`supabase/config.toml`) para no
chocar con otros proyectos Supabase de la máquina.

### Cuentas demo (contraseña: `demo1234`)

| Cuenta | Rol | Para ver |
|---|---|---|
| `viajero@demo.com` | Viajero | Catálogo, reservar, mis reservas (2 próximas + historial con reseñas) |
| `santiago@demo.com` | Viajero | Segundo viajero con historial |
| `graffiti@demo.com` | Agencia verificada | Panel completo: 3 planes, ventas reales del seed |
| `patrimonio@demo.com` | Agencia pendiente | Banner de "en verificación", planes en borrador |
| `ecoandes@demo.com` | Agencia verificada | 5 planes, más volumen |
| `admin@demo.com` | Admin | Verificación de agencias (aprobar la pendiente) |

### Pruebas

```bash
cd apps/viajero && flutter test
```

- `test/anti_sobreventa_test.dart` — integración contra el Supabase local:
  carrera por el último cupo (exactamente un ganador, cupo final 0) y pago
  simulado (referencia `SIMULADO-…`, reserva queda `confirmada`).
- `test/widget_test.dart` — widgets base (RatingStars, VerifiedBadge).
- `test/agency_vigencia_test.dart` — el sello solo aparece con RNT vigente; documentos legales.

> El test de integración usa un binding propio que habilita HTTP real;
> requiere el stack local corriendo.

## Modelo de datos (resumen)

`profiles` (rol) · `agencies` (RNT, matrícula, estado_verificacion, comisión 12%)
· `plans` (ficha estandarizada: incluye, itinerario jsonb, precio final COP,
política de cancelación) · `plan_dates` (cupo_total/cupo_disponible por fecha)
· `bookings` · `payments` (provider + flag `simulated`, listo para Wompi)
· `reviews` (unique por booking) · vista `agency_sales` (comisión y saldo).

RPCs: `create_booking`, `confirm_payment`, `cancel_booking`,
`expire_stale_bookings` (libera cupos de reservas sin pagar > 30 min, se llama
oportunísticamente al cargar el catálogo).

## Decisiones y notas

- **Flutter 3.47.5** (actualizado desde 3.32.5 al iniciar el proyecto). El código
  usa las APIs actuales: `CardThemeData`, `RadioGroup`, `withValues`, wildcards `_`.
- **Pago simulado primero** (decisión del usuario): `SimulatedPaymentGateway`
  confirma vía RPC con latencia visual de ~2 s; la real (Wompi sandbox) es la
  siguiente iteración y solo toca el gateway + un webhook.
- **Ley 1581/2012:** autorización expresa con evidencia en `consents` (ver migración 0002);
  política y términos legibles en la app (`/legal/...`) y en el panel (`#/legal/...`).
  **PCI-DSS:** la plataforma no almacena datos de tarjeta (ni siquiera los simula).
- **Seed:** 12 agencias (11 verificadas), 30 planes con destinos y precios reales
  de Antioquia (Guatapé, Jardín, Jericó, Santa Fe, Río Claro, Comuna 13…),
  ~610 fechas futuras con cupos y historial con reseñas.
- OneDrive sincroniza esta carpeta; si los builds se vuelven lentos, conviene
  excluir `build/` y `.dart_tool/` de la sincronización.
