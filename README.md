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
| Agencia (B2B) | `apps/panel_agencias` (Flutter Web / PWA) | Onboarding con verificación RNT, dashboard de ventas y cupos, CRUD de planes con ficha estandarizada, calendario de cupos, conciliación de pagos con comisión 12% |
| Admin | ídem panel (rol admin) | Aprobar/rechazar la verificación de agencias |

**Fuera de alcance (Fase 2/3):** recomendador IA, suscripción sorpresa, gamificación,
inventario compartido entre agencias, alertas de temporada, bienestar corporativo,
pasarela real en producción. El pago es **simulado** pero el diseño ya tiene la
abstracción `PaymentGateway` (paquete `diverso_core`) para enchufar Wompi/PayU sandbox
sin reescribir flujos: la RPC `confirm_payment` es el punto único de confirmación.

## Arquitectura

```
apps/viajero          → Flutter (Android/iOS/Web) — app del viajero
apps/panel_agencias   → Flutter Web (PWA ligera) — panel B2B + admin
packages/diverso_core → modelos, servicios y PaymentGateway compartidos
supabase/             → migraciones SQL, seed y config del stack local
```

- **Backend:** Supabase (PostgreSQL + Auth + Storage + API REST auto-generada),
  enfoque API-first como pide el Anexo 6.
- **Anti-sobreventa (el reto de ingeniería central):** la reserva vive en la RPC
  `create_booking`, que descuenta cupos con un `UPDATE` atómico condicional
  (`WHERE cupo_disponible >= pax`, bloqueo optimista). Si dos viajeros compiten por
  el último cupo, exactamente uno gana y el otro recibe `SIN_CUPO`. Probado con
  carrera real (test de integración + curl concurrente).
- **RLS por rol** en todas las tablas; la vista de conciliación usa
  `security_invoker` para que cada agencia solo vea sus ventas.
- **Reseñas verificadas:** solo se aceptan sobre reservas propias confirmadas con
  fecha ya pasada; `plan_id` y `viajero_id` se derivan de la reserva por trigger,
  nunca del cliente.

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

# 3. Panel de agencias
cd ../panel_agencias
flutter pub get
flutter run -d chrome
```

**Emulador de Android:** el host local no es `127.0.0.1` sino `10.0.2.2`:

```bash
flutter run -d emulator-5554 --dart-define=SUPABASE_URL=http://10.0.2.2:54331
```

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
- **Ley 1581/2012:** aviso de tratamiento de datos en registro y perfil.
  **PCI-DSS:** la plataforma no almacena datos de tarjeta (ni siquiera los simula).
- **Seed:** 12 agencias (11 verificadas), 30 planes con destinos y precios reales
  de Antioquia (Guatapé, Jardín, Jericó, Santa Fe, Río Claro, Comuna 13…),
  ~610 fechas futuras con cupos y historial con reseñas.
- OneDrive sincroniza esta carpeta; si los builds se vuelven lentos, conviene
  excluir `build/` y `.dart_tool/` de la sincronización.
