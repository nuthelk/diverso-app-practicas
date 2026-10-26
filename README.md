# Diverso App

Marketplace de dos lados que conecta a los viajeros del Valle de Aburrá con agencias
turísticas antioqueñas **verificadas** (RNT + Cámara de Comercio). Implementación del
MVP definido en los Anexos 4–6 del proyecto de Ingeniería de Software
(Corporación Universitaria Iberoamericana).

> Eje central validado: **confianza y transparencia** — no visibilidad.
> "Los viajeros sí encuentran agencias, pero no confían en ellas ni en la
> información que publican, y por eso no cierran la compra."

## Qué incluye este MVP (Fase 1 del Anexo 6)

> **Todo el dinero es de prueba.** Los pagos van por **Wompi en modo prueba (sandbox)** con
> llaves `*_test_*` y datos de prueba: nunca se cobra ni se mueve dinero real. Las funciones
> del servidor se niegan a arrancar con llaves que no sean de prueba (ver [Guardia de solo
> modo prueba](#guardia-de-solo-modo-prueba)).

| Lado | App | Funciones |
|---|---|---|
| Viajero (B2C) | `apps/viajero` (Flutter móvil/web) | Catálogo con buscador y filtros, comparador por número de viajeros, ficha estandarizada con precio final e itinerario, cupos en tiempo real, reserva + **pago con Wompi en modo prueba** (Web Checkout: tarjeta, PSE, Nequi, Daviplata y Bancolombia) con confirmación verificada en el servidor, mis reservas con **cancelación y reembolso de prueba según la ventana de cada plan** (24, 48 o 72 h), reseñas verificadas (solo quien viajó) |
| Agencia (B2B) | `apps/panel_svelte` (Svelte 5 + Tailwind 4 / PWA) | Onboarding con verificación RNT y autorización de datos, dashboard de ventas y cupos, CRUD de planes con ficha estandarizada y **política de cancelación por horas (con notas opcionales)**, calendario de cupos, conciliación con comisión 12%, avisos de RNT por vencer o vencido, **Liquidaciones** (dispersión semanal y anticipos de prueba), **Cuenta para dispersiones** |
| Admin | ídem panel (rol admin) | Verificar con vigencia del RNT, rechazar con motivo, renovar vigencia, retirar verificación e historial auditable, **Admin dispersiones** (generar liquidaciones y anticipos, ejecutar la dispersión de prueba, bloquear o desbloquear el anticipo de una agencia) |

**Dispersión a agencias (modo prueba):** cada lunes (hora de Bogotá) se liquida a cada
agencia lo prestado la semana anterior (saldo menos comisión del 12 %), descontando los
anticipos ya entregados; las agencias con 10 o más servicios prestados y sin bloqueo reciben
un anticipo del 30 % del neto 48 horas antes de la salida. Todo queda registrado como
**«Dispersión de prueba»** con referencia `PRUEBA-…`: no se mueve dinero real (Wompi no
ofrece pagos a terceros con las llaves de comercio).

**Fuera de alcance (por ahora):** firma y publicación en tiendas (Play Store / App Store) y
despliegue a producción, recomendador IA, suscripción sorpresa, gamificación, inventario
compartido entre agencias, alertas de temporada, bienestar corporativo y la **suscripción de
visibilidad**, que se construirá al cierre del piloto ampliado, antes de operar en 2027, con
la evidencia de ventas del piloto.

## Arquitectura

```
apps/viajero          → Flutter (Android/iOS/Web) — app del viajero
apps/panel_svelte     → Svelte 5 + Tailwind 4 (SPA/PWA) — panel B2B + admin
apps/panel_agencias   → (legado) versión Flutter Web del panel, misma API
packages/diverso_core → modelos, servicios y PaymentGateway (WompiPaymentGateway) compartidos
supabase/             → migraciones SQL, seed, pruebas SQL, Edge Functions de pagos y métricas
tools/iconos          → generador de los íconos de la app y de las webs (Pillow)
```

- **Backend:** Supabase (PostgreSQL + Auth + Storage + API REST auto-generada + Edge
  Functions), enfoque API-first como pide el Anexo 6.
- **Anti-sobreventa (el reto de ingeniería central):** la reserva vive en la RPC
  `create_booking`, que descuenta cupos con un `UPDATE` atómico condicional
  (`WHERE cupo_disponible >= pax`, decremento atómico condicional; no es bloqueo
  optimista con columna de versión). Si dos viajeros compiten por el último cupo,
  exactamente uno gana y el otro recibe `SIN_CUPO`. Exige además plan publicado, fecha
  futura y agencia habilitada. Probado con carrera real (test de integración + curl
  concurrente).
- **RLS por rol** en todas las tablas; la vista de conciliación usa
  `security_invoker` para que cada agencia solo vea sus ventas.
- **Reseñas verificadas:** solo se aceptan sobre reservas propias confirmadas con
  fecha ya pasada; `plan_id` y `viajero_id` se derivan de la reserva por trigger,
  nunca del cliente.

### Pagos con Wompi (modo prueba)

El viajero paga en la página de **Web Checkout de Wompi** (la app nunca ve datos de tarjeta,
cuentas ni claves). Los secretos viven solo en estas Edge Functions
(`supabase/functions/`, Deno/TypeScript; código común en `_shared/`):

| Función | Quién la llama | Qué hace |
|---|---|---|
| `pagos-iniciar` | App (JWT del viajero) | Valida que la reserva sea suya, esté `pendiente_pago` y su retención de 30 minutos no haya vencido; crea el intento de pago con referencia única y devuelve la URL del checkout firmada con el secreto de integridad (el monto no se puede alterar). Solo acepta URLs de retorno de la lista de permitidos. |
| `pagos-verificar` | App, al volver de Wompi (JWT del viajero) | Consulta la transacción **a Wompi desde el servidor** (con la llave privada), comprueba referencia, monto y moneda, y aplica el resultado. Devuelve `aprobado`, `rechazado`, `pendiente` o `error`. |
| `pagos-webhook` | Wompi (sin JWT) | Verifica el checksum del evento, vuelve a consultar la transacción a Wompi por su id y aplica solo lo que Wompi responde (firma inválida → 401 sin efectos; eventos desconocidos se ignoran con 200). Es idempotente. |
| `reservas-cancelar` | App (JWT del viajero) | Cancela según la política **congelada** en la reserva y, si corresponde reembolso de un pago aprobado, lo pide a Wompi (sandbox) y registra el resultado. |

- **La confirmación del pago solo ocurre en el servidor.** Lo que dice la URL de retorno
  nunca se acepta: una reserva pasa a `confirmada` únicamente cuando el servidor obtiene de
  Wompi una transacción `APPROVED` con la referencia, el monto y la moneda esperados, mediante
  una función SQL que solo puede ejecutar `service_role`. El cliente no puede marcar pagos
  (las antiguas RPC `confirm_payment` y `cancel_booking` ya no existen).
- Un pago aprobado **después** de vencer la retención, o con un monto distinto al esperado,
  genera automáticamente una obligación de reembolso del 100 %.
- <a id="guardia-de-solo-modo-prueba"></a>**Guardia de solo modo prueba:** si alguna llave no
  empieza por su prefijo de prueba (`pub_test_`, `prv_test_`, `test_events_`,
  `test_integrity_`) o la API/checkout no son los de sandbox de Wompi, **todas** las funciones
  responden `503 {"error":"SOLO_MODO_PRUEBA"}` y no hacen nada. No hay configuración posible
  que las apunte a producción.
- **Móvil vs. web:** en Android/iOS el checkout se abre en un WebView y la app intercepta la
  URL de retorno `https://diverso.app/pago/resultado` (nunca se carga); en web se navega a
  Wompi y vuelve a `/pago/resultado`. Las rutas `/checkout/:planId/:fechaId`,
  `/reserva/:bookingId` y `/pago/resultado` sobreviven a recargar la página.

### Migraciones

| Migración | Qué hace |
|---|---|
| `0001_schema.sql` | Esquema base, RLS, vistas y RPC iniciales |
| `0002_verificacion_cumplimiento.sql` | Vigencia del RNT, historial auditable y consentimientos Ley 1581 |
| `0003_pagos_wompi.sql` | Intentos de pago y reembolsos, política de cancelación por horas en `plans`, funciones de pago solo para `service_role`, `vista_previa_cancelacion`, cron de expiración; elimina `confirm_payment` y `cancel_booking` |
| `0004_dispersiones.sql` | Cuentas de pago de agencias, liquidaciones (semanales y anticipos) con sus ítems, funciones de generación/ejecución y crons |
| `0005_endurecimiento_pagos.sql` | Política congelada en cada reserva, regla de una reserva pendiente por fecha, reembolso por monto distinto, ventanas exactas, texto de política sincronizado con sus números, protección de fechas con reservas y versión legal `v2-2026-10` |
| `0006_politica_notas.sql` | `plans.politica_notas`: las frases de la política que no son reglas (p. ej. «Reprogramación gratuita por clima») nunca se pierden al regenerar el texto |
| `0007_notas_sin_politica.sql` | Las notas no pueden contener reglas de reembolso que contradigan los números (`NOTAS_CON_POLITICA`); `horas_antes` se trunca para mostrarlo |
| `0008_cancelar_antes_de_salir.sql` | `cancelar_reserva` y `vista_previa_cancelacion` rechazan con `RESERVA_YA_SALIO` una reserva viva cuyo viaje ya salió (`salida_at`); reintentar una cancelación ya hecha sigue siendo idempotente |
| `0011_busqueda_sin_tildes.sql` | Buscador sin tildes ni mayúsculas: extensión `unaccent`, `f_unaccent` (IMMUTABLE) y la columna generada `plans.busqueda`, sobre la que el catálogo filtra con un solo `ilike` (la app normaliza el texto con `normalizarBusqueda`) |

### RPC y tareas programadas

- `create_booking`: reserva y descuenta cupos de forma atómica; **una sola reserva pendiente
  de pago (no vencida) por viajero y fecha** (si ya existe responde
  `RESERVA_PENDIENTE_EXISTENTE` con el id existente); congela la política de cancelación del
  plan en la reserva (`politica_*`, `salida_at`), de modo que editar el plan después no cambia
  lo que se le prometió al viajero.
- `vista_previa_cancelacion(booking)`: lo que reembolsaría la política *ahora* (aplica,
  porcentaje, monto, horas antes, motivo); la usa el diálogo de cancelar. Si el viaje ya salió
  responde `RESERVA_YA_SALIO` (igual que `cancelar_reserva`).
- `expire_stale_bookings`: libera cupos de reservas sin pagar tras 30 minutos y vence sus
  intentos de pago; la ejecuta el cron (la app ya no la llama).
- Solo `service_role` (las llama el servidor, no la app): `crear_intento_pago`,
  `aplicar_resultado_pago`, `cancelar_reserva`, `registrar_resultado_reembolso`.
- Solo admin o `service_role`: `generar_liquidaciones`, `generar_anticipos`,
  `ejecutar_liquidacion`.
- **Crons (pg_cron):** `expirar-reservas-pendientes` cada 5 minutos, `anticipos-por-hora`
  cada hora y `liquidacion-semanal` los lunes a las 06:00 hora de Bogotá (11:00 UTC).

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

Pruebas SQL: ver [Pruebas](#pruebas) (siempre dentro de `begin … rollback`).

Los documentos legales están en la versión **`v2-2026-10`**: describen los pagos con Wompi
en modo prueba, y quien aceptó una versión anterior debe volver a aceptarla al entrar.

## Configurar Wompi en modo prueba

Sin llaves la app arranca, pero **pagar responde `SOLO_MODO_PRUEBA`**. Para probar el
pago completo:

1. Crea una cuenta gratis en <https://comercios.wompi.co> e ingresa a la sección
   **Desarrolladores** (ambiente de pruebas / sandbox).
2. Copia la plantilla de variables (el archivo real está en `.gitignore`: **nunca lo subas ni
   pegues sus valores en un chat, issue o PR**):

   ```bash
   cp supabase/functions/.env.example supabase/functions/.env
   ```

3. Edita `supabase/functions/.env` y reemplaza los cuatro valores `REEMPLAZAR` por tus
   llaves **de prueba**:

   | Variable | Prefijo | Dónde está en Wompi |
   |---|---|---|
   | `WOMPI_PUBLIC_KEY` | `pub_test_` | Desarrolladores → Llaves del API |
   | `WOMPI_PRIVATE_KEY` | `prv_test_` | Desarrolladores → Llaves del API (secreta) |
   | `WOMPI_EVENTS_SECRET` | `test_events_` | Desarrolladores → Secretos para integración técnica → Eventos |
   | `WOMPI_INTEGRITY_SECRET` | `test_integrity_` | Desarrolladores → Secretos para integración técnica → Integridad |

   Deja `WOMPI_ENV=sandbox`, `WOMPI_API_URL=https://sandbox.wompi.co/v1` y
   `WOMPI_CHECKOUT_URL=https://checkout.wompi.co/p/` como vienen.
4. Con el stack corriendo (`supabase start`), sirve las funciones y déjalas abiertas:

   ```bash
   supabase functions serve --env-file supabase/functions/.env
   ```

   Si cambias el `.env`, reinicia este comando y espera el mensaje «Serving functions».

**Qué significa `SOLO_MODO_PRUEBA`:** es la guardia del servidor. Si alguna llave no tiene
prefijo de prueba, falta, o la URL de la API/checkout no es la de sandbox de Wompi, las cuatro
funciones responden `503 {"error":"SOLO_MODO_PRUEBA"}` y no hacen nada. Si lo ves, revisa que
las cuatro llaves estén completas y sean de prueba.

**Webhook (opcional en local).** Wompi solo puede avisar a una URL pública; tu
`http://127.0.0.1:54331` no lo es. Por eso en local **el pago se confirma igual**: al volver
del checkout la app llama a `pagos-verificar`, que consulta la transacción a Wompi desde el
servidor (y existe el botón «Ya pagué, verificar» en la reserva pendiente). Si además quieres
recibir los eventos reales, expón el puerto 54331 con un túnel público (por ejemplo
`ngrok http 54331` o `cloudflared tunnel --url http://127.0.0.1:54331`; no vienen incluidos ni
se probaron en este repositorio) y registra en Wompi → Desarrolladores → *URL de eventos*:
`https://<tu-túnel>/functions/v1/pagos-webhook`. Ese túnel expone todo el API local mientras
esté abierto: ciérralo al terminar.

### Datos de prueba de Wompi (sandbox)

Se escriben en la página de pago de Wompi (la app también los muestra en el checkout).
Fuente: documentación de Wompi, sección «Datos de prueba en Sandbox»
(<https://docs.wompi.co>).

| Método | Resultado **aprobado** | Resultado **rechazado** |
|---|---|---|
| Tarjeta | `4242 4242 4242 4242` (vencimiento futuro, CVC de 3 dígitos cualquiera) | `4111 1111 1111 1111` (ídem) |
| Nequi | celular `3991111111` | celular `3992222222` |
| PSE | banco con código `1` | banco con código `2` |
| Daviplata | OTP `574829` | OTP `932015` |
| Bancolombia | se elige el resultado en la pantalla de simulación de Wompi | ídem |

## Cómo correr (desarrollo local)

Requisitos: Docker Desktop corriendo, Flutter (testeado con 3.47.5), Node (para el panel; se usó la 24), Supabase CLI. Los comandos con `eval`/`(echo …)` están pensados para bash (en Windows,
Git Bash).

```bash
cd diverso-app

# 1. Levantar el stack local (Postgres, Auth, REST, Studio en 127.0.0.1:54331)
supabase start
supabase db reset        # SOLO la primera vez: aplica migraciones + seed demo (¡borra tus datos locales!)
# Si ya tienes datos propios en la base local, usa en su lugar:
#   supabase migration up --local

# 2. Edge Functions de pagos (ver «Configurar Wompi en modo prueba»), en otra terminal
supabase functions serve --env-file supabase/functions/.env

# 3. App del viajero en web, en el puerto 3000
cd apps/viajero
flutter pub get
flutter run -d web-server --web-port=3000     # abre http://localhost:3000

# 4. Panel de agencias (Svelte 5 + Tailwind 4)
cd ../panel_svelte
npm install
npm run dev            # desarrollo (http://localhost:5173)
npm run build          # producción → dist/ (servir con cualquier estático)
```

**¿Por qué el puerto 3000?** Después de pagar, Wompi devuelve al viajero a una URL de retorno
y el servidor solo acepta las de una lista de permitidos (para que nadie pueda redirigir el
resultado de un pago a un sitio ajeno). Por defecto: la app web local en los puertos **8080 y
3000** y `https://diverso.app/pago/resultado` (la URL que intercepta el WebView móvil). Si
necesitas otro puerto u origen, defínelo en `supabase/functions/.env` (y reinicia
`functions serve`); esa variable **reemplaza** la lista por defecto, así que repite lo que
sigas necesitando:

```bash
PAGOS_REDIRECT_ALLOWLIST=http://localhost:4000/,https://diverso.app/pago/resultado
```

(una entrada que termina en `/` autoriza cualquier ruta de ese origen; una con ruta exacta,
solo esa ruta).

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

En Android el checkout de Wompi se abre en un WebView dentro de la app y el permiso
`INTERNET` ya está declarado en el manifiesto. Los builds `debug` y `profile` tienen
`usesCleartextTraffic` para permitir el HTTP local; firmar y publicar un build `release` está
fuera del alcance actual.

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

## Pruebas

Desde la raíz del repo, con `supabase start` corriendo. Conteos de la última corrida completa:

| Suite | Comando | Pruebas |
|---|---|---|
| SQL 0002 (verificación y cumplimiento) | ver «Pruebas SQL» | 27 |
| SQL 0003 (pagos y reembolsos) | ver «Pruebas SQL» | 94 |
| SQL 0004 (dispersiones) | ver «Pruebas SQL» | 157 |
| SQL 0005 (endurecimiento) | ver «Pruebas SQL» | 81 |
| SQL 0006 (notas de política) | ver «Pruebas SQL» | 49 |
| SQL 0007 (notas sin reglas de reembolso) | ver «Pruebas SQL» | 62 |
| SQL 0008 (cancelar solo antes de la salida) | ver «Pruebas SQL» | 14 |
| SQL 0011 (búsqueda sin tildes) | ver «Pruebas SQL» | 11 |
| Edge Functions, HTTP de punta a punta (mock de Wompi) | `python -I -B supabase/functions/_tests/test_pagos.py` | 41 |
| Vectores de Wompi (firmas, checksum, guardia, URL de retorno) | `node --test supabase/functions/_tests/vectores_wompi.test.ts` | 14 |
| Panel Svelte (vitest) | `npm test --prefix apps/panel_svelte` | 320 (19 archivos) |
| `diverso_core` | `cd packages/diverso_core && flutter test` | 50 |
| App del viajero (incluye integración) | `cd apps/viajero && flutter test` | 67 |
| Panel Flutter legado | `cd apps/panel_agencias && flutter test` | 3 |

### Pruebas SQL: siempre dentro de `begin … rollback`

Los archivos de `supabase/tests/` crean y modifican datos. **Nunca los ejecutes sueltos con
`psql -f`** (una vez dejaron cambios en los datos demo): envuélvelos para que todo termine en
`rollback`, sin `supabase db reset`:

```bash
(echo 'begin;'; cat supabase/tests/0003_pagos_wompi.sql; echo 'rollback;')   | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1
```

Cambia el nombre del archivo para las demás (`0002_verificacion_cumplimiento`,
`0004_dispersiones`, `0005_endurecimiento_pagos`, `0006_politica_notas`,
`0007_notas_sin_politica`, `0008_cancelar_antes_de_salir`). Si una aserción
falla, `psql` se detiene con `FALLA: …` y el código de salida es distinto de 0; si pasan todas,
sale con 0 (los avisos «already a transaction in progress» de los archivos que traen su
propio `begin` son normales).

### Pruebas HTTP de pagos y humo con el mock de Wompi

No necesitan llaves reales: `test_pagos.py` levanta un Wompi falso
(`supabase/functions/_tests/mock_wompi.py`) y sirve las funciones él mismo con
`WOMPI_ENV=mock` (cierra primero tu propio `functions serve` si lo tienes abierto). Crea
viajeros, planes y reservas desechables y los borra al terminar.

```bash
python -I apps/viajero/scripts/smoke_pago_mock.py            # humo: pago aprobado (4242…) y rechazado (4111…), con cancelación y reembolso
python -I apps/viajero/scripts/smoke_pago_mock.py --servir   # solo deja el mock y las funciones servidos hasta Ctrl+C
```

### Pruebas de la app del viajero

```bash
eval "$(supabase status -o env | sed 's/^/export SUPABASE_/')"   # bash: exporta SUPABASE_SERVICE_ROLE_KEY, SUPABASE_API_URL…
cd apps/viajero && flutter test
```

- `test/anti_sobreventa_test.dart` — integración contra el Supabase local: carrera por el
  último cupo (exactamente un ganador), una sola reserva pendiente por fecha, y que
  `confirm_payment`/`cancel_booking` ya no existen y las funciones de pago son solo del
  servidor. Las pruebas que escriben en la base limpian lo que crean con la llave
  `service_role`, que se lee **solo** de `SUPABASE_SERVICE_ROLE_KEY` (nunca va en el repo);
  sin esa variable se omiten, con el motivo a la vista.
- `test/pago_wompi_test.dart`, `rutas_pago_test.dart`, `checkout_pendiente_test.dart`,
  `cancel_dialog_test.dart` — pasarela, rutas que sobreviven a la recarga, aviso de reserva
  pendiente y diálogo de cancelación.
- `test/comparison_test.dart`, `widget_test.dart`, `agency_vigencia_test.dart` — comparador
  por viajeros, widgets base y sello de verificación/documentos legales.

> La prueba de integración usa un binding propio que habilita HTTP real; requiere el stack
> local corriendo.

### Métricas

Las consultas de la métrica Norte y de la tabla 18 del Anexo 8 están versionadas en
[`supabase/metricas/`](supabase/metricas/README.md) (solo lectura); ahí está cómo ejecutarlas.

## Modelo de datos (resumen)

`profiles` (rol) · `agencies` (RNT, matrícula, estado_verificacion, comisión 12%)
· `plans` (ficha estandarizada: incluye, itinerario jsonb, precio final COP,
política de cancelación por horas + `politica_notas`) · `plan_dates` (cupo_total/cupo_disponible por fecha)
· `bookings` (con la política congelada al reservar) · `payment_attempts` (intentos de pago,
solo servidor) · `payments` (pago aprobado, con id y método de la transacción de Wompi)
· `refunds` · `agency_payout_accounts` (cuenta para dispersiones, protegida por RLS)
· `liquidaciones` y `liquidacion_items` · `reviews` (unique por booking)
· vista `agency_sales` (comisión y saldo). Las RPC y funciones programadas están en
[Arquitectura](#rpc-y-tareas-programadas).

## Decisiones y notas

- **Flutter 3.47.5** (actualizado desde 3.32.5 al iniciar el proyecto). El código
  usa las APIs actuales: `CardThemeData`, `RadioGroup`, `withValues`, wildcards `_`.
- **Pasarela en modo prueba** (decisión del usuario): `WompiPaymentGateway` (en
  `diverso_core`, detrás de la abstracción `PaymentGateway`) inicia y verifica el pago
  llamando a las Edge Functions; la plataforma opera solo con transacciones de prueba hasta
  que se decida lo contrario.
- **Marca:** el colibrí de la primera versión de la app. La máscara maestra
  (`packages/diverso_core/assets/logo_diverso.png`, negro + alfa) la dibuja `DiversoLogo`
  teñida con el color que pida cada pantalla; el panel Svelte usa una copia como máscara CSS
  (`apps/panel_svelte/public/logo_diverso.png`). Todos los íconos (launcher Android e iOS,
  favicon y PWA de la app y del panel) salen de esa máscara, ave blanca sobre `#0E6E4F`:
  `python -I -B tools/iconos/generar_iconos.py` (requiere Pillow) los regenera, y la zona
  segura y los márgenes por plataforma están documentados en el script.
  La pantalla de arranque de Android muestra solo el colibrí grande, sin círculo ni fondo
  (`splash_colibri.png`, verde en claro y menta en oscuro; Android 12+ vía `values-v31`).
- **Ley 1581/2012:** autorización expresa con evidencia en `consents` (ver migración 0002);
  política y términos legibles en la app (`/legal/...`) y en el panel (`#/legal/...`).
  **PCI-DSS:** la plataforma no almacena datos de tarjeta: se digitan en la página de Wompi.
- **Seed:** 12 agencias (11 verificadas), 30 planes con destinos y precios reales
  de Antioquia (Guatapé, Jardín, Jericó, Santa Fe, Río Claro, Comuna 13…),
  ~610 fechas futuras con cupos y historial con reseñas.
- OneDrive sincroniza esta carpeta; si los builds se vuelven lentos, conviene
  excluir `build/` y `.dart_tool/` de la sincronización.
