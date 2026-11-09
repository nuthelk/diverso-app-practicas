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
| Agencia (B2B) | `apps/panel_svelte` (Svelte 5 + SvelteKit estático + Tailwind 4 / PWA) | Onboarding con verificación RNT y autorización de datos, **perfil de la agencia** (logo y datos de contacto editables —nombre, descripción, ciudad, teléfono, correo y WhatsApp—; el RNT y la matrícula se ven pero no se cambian; desde el menú de cuenta), **Resumen «Tablero operativo»** (por resolver, cifras del período y salidas con ocupación, pendientes y vendido; un ícono de calendario filtra por día, semana o rango y marca cuántos viajeros salen cada día y cada semana; «Ver todos» en Tus planes lleva a Planes y «Ver todas» en Reseñas recientes a la página de reseñas), **página Reseñas** (`#/resenas`: todas las reseñas de sus planes, de a 20 con «Cargar más»), **menú de cuenta único con tema Sistema / Claro / Oscuro**, **confirmación antes de publicar, despublicar o eliminar una fecha**, CRUD de planes con ficha estandarizada y **política de cancelación por horas (con notas opcionales)**, calendario de cupos, conciliación con comisión 12%, avisos de RNT por vencer o vencido, **Liquidaciones** (dispersión semanal y anticipos de prueba), **Cuenta para dispersiones** |
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
apps/panel_svelte     → Svelte 5 + SvelteKit estático (URLs #/) + Tailwind 4 (SPA/PWA) — panel B2B + admin
packages/diverso_core → modelos, errores, `data/services` y `data/repositories` compartidos
supabase/             → migraciones SQL, seed, pruebas SQL, Edge Functions de pagos y métricas
tools/iconos          → generador de los íconos de la app y de las webs (Pillow)
```

- **Guía para aprender la app y Flutter:** [`docs/guia/`](docs/guia/README.md) (plan de
  aprendizaje, capítulos para quien viene de React Native y TypeScript y un recorrido de los
  flujos de la app: entrar, catálogo, reservar y pagar, cancelar). **Guía del panel y de
  Svelte 5:** [`docs/guia/svelte/`](docs/guia/svelte/README.md) (Svelte desde React, runes,
  SvelteKit estático con rutas por carpetas, la arquitectura por funcionalidad de
  `apps/panel_svelte` —cada una con `pages/`, `components/`, `api/` y `model/`—, su sistema visual
  (tokens en `app.css` y componentes de `shared/ui`) y sus pruebas en `tests/unit/`).
- **Capa de datos de Flutter** (`packages/diverso_core/lib/data`): un *service* (`*_api.dart`:
  `BookingApi`, `CatalogApi`, `EdgeFunctionsApi`) solo hace las consultas a Supabase
  y devuelve filas; un *repository* (`*_repository.dart`) las convierte en modelos y aplica las
  reglas de datos (ventana de 30 minutos, filtro de fecha del catálogo, reseñas de «Mis
  reservas»…) y traduce los fallos a `DiversoException` (`errors/`). `AuthRepository` y
  `ReviewRepository` usan el cliente directo, y `PaymentGateway` (`WompiPaymentGateway`) es la
  única interfaz. Nada en `diverso_core` lee `Supabase.instance`: cada app crea el
  `SupabaseClient` una vez en su `main.dart`, arma los servicios y repositorios por constructor y
  los entrega con Provider; las pantallas hacen `context.read<…Repository>()`.
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
  `/reserva/:bookingId`, `/pago/resultado`, `/resena/:bookingId` y `/comparar?ids=a,b` llevan los
  ids en la URL y sobreviven a recargar la página; una URL desconocida muestra «No encontramos
  esta página».

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
| `0012_reservar_antes_de_salir.sql` | `create_booking` rechaza con `FECHA_YA_SALIO` una fecha cuya salida (fecha + `plans.hora_salida`, hora de Bogotá) ya ocurrió; `crear_intento_pago` rechaza con `RESERVA_YA_SALIO` pagar una reserva cuya `salida_at` ya pasó; «hoy» es la fecha de Bogotá, no la UTC |
| `0013_checkout_vence_en_la_salida.sql` | `crear_intento_pago` firma la expiración del checkout de Wompi como el menor de `created_at + 30 min` y `salida_at`: una reserva hecha minutos antes de partir no se puede pagar después de la salida |
| `0015_quienes_van.sql` | Lectura para el panel de agencias, solo `authenticated` y solo para el dueño de la agencia: `quienes_van(uuid[])` (reservas `pendiente_pago`/`confirmada` de sus planes: código, nombre corto «Laura V.», personas, estado; sin teléfono, correo ni documento) y `resenas_recientes_agencia(int)` (últimas reseñas de sus planes, tope 20, con el mismo nombre corto) |
| `0016_nombre_corto_seguro.sql` | El nombre corto que ve la agencia descarta toda palabra con @ o dígitos y separa por cualquier espacio Unicode: un correo o teléfono escrito como nombre nunca llega al panel («Viajero» si no queda nada) |
| `0018_resenas_agencia.sql` | `resenas_agencia(p_limite, p_desde)`: todas las reseñas de los planes de la agencia, paginadas (límite 1–50, por defecto 20), con la misma privacidad y el mismo filtro por dueña que `resenas_recientes_agencia`, que no cambia (no hay `0017` en migraciones: ese número es de la prueba de editar datos de la agencia) |

### RPC y tareas programadas

- `create_booking`: reserva y descuenta cupos de forma atómica; **una sola reserva pendiente
  de pago (no vencida) por viajero y fecha** (si ya existe responde
  `RESERVA_PENDIENTE_EXISTENTE` con el id existente); congela la política de cancelación del
  plan en la reserva (`politica_*`, `salida_at`), de modo que editar el plan después no cambia
  lo que se le prometió al viajero. **No reserva un viaje que ya salió**: si fecha +
  `hora_salida` del plan (Bogotá) es ≤ `now()` responde `FECHA_YA_SALIO` (`FECHA_PASADA` queda
  para fechas anteriores a hoy); la app tampoco ofrece esas fechas.
- `vista_previa_cancelacion(booking)`: lo que reembolsaría la política *ahora* (aplica,
  porcentaje, monto, horas antes, motivo); la usa el diálogo de cancelar. Si el viaje ya salió
  responde `RESERVA_YA_SALIO` (igual que `cancelar_reserva`).
- `expire_stale_bookings`: libera cupos de reservas sin pagar tras 30 minutos y vence sus
  intentos de pago; la ejecuta el cron (la app ya no la llama).
- `quienes_van(p_plan_date_ids uuid[])`: para el panel de agencias; devuelve (`plan_date_id`, `booking_id`,
  `codigo`, `nombre_corto`, `pax`, `estado`) de las reservas `pendiente_pago` y `confirmada` de esas fechas
  **solo si el plan es de la agencia de quien llama**; `nombre_corto` = primera palabra + inicial del último
  apellido («Laura V.», «Viajero» si no hay nombre); nunca teléfono, correo ni documento.
- `resenas_recientes_agencia(p_limite int default 3)`: últimas reseñas (`calificacion`, `comentario`,
  `nombre_corto`, `plan_titulo`, `created_at`) de los planes de la agencia de quien llama, la más nueva
  primero, tope 20. Ambas son `security definer`, `stable`, con `search_path` fijo y solo `authenticated`.
- `resenas_agencia(p_limite int default 20, p_desde int default 0)`: la página «Reseñas» del panel; las mismas columnas
  que `resenas_recientes_agencia` más `id` (llave de la lista), de los planes de la agencia de quien llama, la más
  nueva primero (`created_at desc, id desc`, así las páginas no se solapan), `p_limite` acotado a 1–50 y `p_desde`
  nunca negativo. Mismos permisos que las anteriores.
- Solo `service_role` (las llama el servidor, no la app): `crear_intento_pago` (si el viaje de la
  reserva ya salió responde `RESERVA_YA_SALIO`, HTTP 409 en `pagos-iniciar`; el checkout vence a
  más tardar en la salida),
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
  piden aceptar de nuevo. Textos en `apps/panel_svelte/src/lib/features/legal/model/legal.ts` y
  `packages/diverso_core/lib/legal/documento_legal.dart` (**borradores** para revisión jurídica).
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

# 4. Panel de agencias (Svelte 5 + SvelteKit estático + Tailwind 4)
cd ../panel_svelte
npm install
npm run dev            # desarrollo con SvelteKit (http://localhost:5173; URLs #/ruta)
npm run check          # tipos y avisos de Svelte (svelte-kit sync + svelte-check)
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

En la app del viajero el botón «Usar cuenta demo» (rellena `viajero@demo.com`) solo aparece en
builds de **debug** (`flutter run`); en una build de release no existe.

| Cuenta | Rol | Para ver |
|---|---|---|
| `viajero@demo.com` | Viajero | Catálogo, reservar, mis reservas (2 próximas + historial con reseñas) |
| `santiago@demo.com` | Viajero | Segundo viajero con historial |
| `graffiti@demo.com` | Agencia verificada | Panel completo: 3 planes, ventas reales del seed |
| `patrimonio@demo.com` | Agencia pendiente | Banner de "en verificación", planes en borrador |
| `ecoandes@demo.com` | Agencia verificada | 5 planes, más volumen |
| `admin@demo.com` | Admin | Verificación de agencias (aprobar la pendiente) |
| `camila@`, `juandavid@`, `mariana@`, `sebastian@`, `daniela@`, `andres@`, `laura@`, `esteban@` (`@demo.com`) | Viajeros | Autores de las reseñas demo: cada plan publicado tiene de 3 a 6 opiniones (2 a 5 ★) |

Las reseñas extra viven en `supabase/seed.sql`, entre `-- BEGIN opiniones_demo` y `-- END opiniones_demo`.
El bloque es idempotente; para cargarlo en una base ya sembrada sin `db reset`:

```bash
sed -n '/^-- BEGIN opiniones_demo/,/^-- END opiniones_demo/p' supabase/seed.sql \
  | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -1
```

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
| SQL 0009 (agencias públicas) | ver «Pruebas SQL» | 24 |
| SQL 0011 (búsqueda sin tildes) | ver «Pruebas SQL» | 11 |
| SQL 0012 (no reservar ni pagar tras la salida) | ver «Pruebas SQL» | 24 |
| SQL 0013 (el checkout vence en la salida) | ver «Pruebas SQL» | 8 |
| SQL 0014 (RLS: reservas ajenas y consentimientos) | ver «Pruebas SQL» | 10 |
| SQL 0015 (quiénes van y reseñas recientes) | ver «Pruebas SQL» | 48 |
| SQL 0016 (nombre corto sin correos ni teléfonos) | ver «Pruebas SQL» | 15 |
| SQL 0017 (la dueña edita los datos de su agencia) | ver «Pruebas SQL» | 15 |
| SQL 0018 (todas las reseñas de la agencia, paginadas) | ver «Pruebas SQL» | 39 |
| Edge Functions, HTTP de punta a punta (mock de Wompi) | `python -I -B supabase/functions/_tests/test_pagos.py` | 43 |
| Vectores de Wompi (firmas, checksum, guardia, URL de retorno) | `node --test supabase/functions/_tests/vectores_wompi.test.ts` | 14 |
| Panel Svelte (vitest) | `npm test --prefix apps/panel_svelte` | 1082 (76 archivos) |
| `diverso_core` | `cd packages/diverso_core && flutter test` | 140 |
| App del viajero (incluye integración) | `cd apps/viajero && flutter test` | 517 (con `SUPABASE_SERVICE_ROLE_KEY`; sin ella se omiten 4) |

### Pruebas SQL: siempre dentro de `begin … rollback`

Los archivos de `supabase/tests/` crean y modifican datos. **Nunca los ejecutes sueltos con
`psql -f`** (una vez dejaron cambios en los datos demo): envuélvelos para que todo termine en
`rollback`, sin `supabase db reset`:

```bash
(echo 'begin;'; cat supabase/tests/0003_pagos_wompi.sql; echo 'rollback;')   | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1
```

Cambia el nombre del archivo para las demás (`0002_verificacion_cumplimiento`,
`0004_dispersiones`, `0005_endurecimiento_pagos`, `0006_politica_notas`,
`0007_notas_sin_politica`, `0008_cancelar_antes_de_salir`, `0012_reservar_antes_de_salir`, `0013_checkout_vence_en_la_salida`, `0014_rls_resena_ajena`, `0015_quienes_van`, `0016_nombre_corto_seguro`, `0017_editar_datos_agencia`, `0018_resenas_agencia`). Si una aserción
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

- `test/integration/anti_sobreventa_test.dart` — integración contra el Supabase local: carrera por el
  último cupo (exactamente un ganador), una sola reserva pendiente por fecha, y que
  `confirm_payment`/`cancel_booking` ya no existen y las funciones de pago son solo del
  servidor. Las pruebas que escriben en la base limpian lo que crean con la llave
  `service_role`, que se lee **solo** de `SUPABASE_SERVICE_ROLE_KEY` (nunca va en el repo);
  sin esa variable se omiten, con el motivo a la vista.
- `test/ui/features/checkout/pago_wompi_test.dart`, `test/router/rutas_pago_test.dart`,
  `test/ui/features/checkout/checkout_pendiente_test.dart`,
  `test/ui/features/bookings/widgets/cancel_dialog_test.dart` — pasarela, rutas que sobreviven
  a la recarga, aviso de reserva pendiente y diálogo de cancelación.
- `test/ui/features/checkout/pago_abierto_test.dart`,
  `test/ui/features/checkout/view_models/*_test.dart` (`checkout`, `checkout_plan`, `reserva`,
  `pago_resultado`), `checkout/views/pago_resultado_view_test.dart` — el resultado explícito de
  abrir el pago (`PagoAbierto`: en web `redirigido` termina «Procesando…» y deja bloqueado «Pagar con Wompi» hasta que la página se descarga), los view models del
  checkout con repositorios y pasarela falsos (carga, error, reserva pendiente, verificar y
  reintentar, guardia de `dispose`) y el reintento de pago desde la vista.
- `test/router/sesion_redirect_test.dart`, `test/router/consentimiento_test.dart`,
  `test/router/consentimiento_guard_test.dart`, `test/router/rutas_con_ids_test.dart`,
  `test/app_test.dart` — el redirect de sesión y consentimiento (función pura, `?desde=` validado,
  recorrido completo con «Reintentar», nada protegido se abre mientras se verifica, falla o falta
  aceptar), las rutas con ids
  (`/resena/:bookingId`, `/comparar?ids=…`), la página no encontrada y que cambiar el tema no
  reinicie la navegación.
- `test/ui/features/catalog/view_models/catalog_view_model_test.dart`,
  `test/ui/features/plan/view_models/plan_detail_view_model_test.dart`,
  `test/ui/features/catalog/views/filtros_test.dart`,
  `test/ui/features/plan/views/detalle_fechas_test.dart`, `detalle_resena_test.dart` — los view models
  del catálogo y de la ficha con repositorios falsos (carga, error, vacío, una sola consulta al
  aplicar filtros, guardia de `dispose`), la barra de reserva y la inicial de las reseñas.
- `test/ui/features/bookings/view_models/*_test.dart` (`bookings`, `reserva_detalle`, `review`),
  `test/ui/features/profile/view_models/profile_view_model_test.dart`,
  `test/ui/features/auth/view_models/login_view_model_test.dart`,
  `test/ui/features/auth/views/login_view_test.dart`, `bookings/views/cancelar_reserva_test.dart`,
  `bookings/views/review_view_test.dart`, `profile/views/profile_view_test.dart` — los view models
  de reservas, reseña, perfil y acceso con repositorios falsos (carga, error, vacío, aviso que la
  vista consume, guardia de `dispose`) y que «Usar cuenta demo» no existe con el flag apagado.
- `test/ui/core/notifica_si_vive_test.dart` — la guarda de `dispose` que comparten los view models
  (`NotificaSiVive`): notifica mientras vive y no lanza después de `dispose`.
- `test/router/verificacion_final_probe_test.dart` — sondas de la verificación final: URL de retorno
  e intercepción del pago, guarda del consentimiento con `desde`, `destinoSeguro`, enums de la base
  y el mensaje `FECHA_YA_SALIO`.
- `test/ui/core/theme/modo_oscuro_test.dart`, `chip_filtro_contraste_test.dart` — el tema: los
  textos secundarios toman el color del tema en oscuro, y el chip de filtro activo (texto e ícono de
  borrar) llega a contraste WCAG AA (4.5:1) en claro y oscuro, medido sobre lo que se pinta.
- `test/ui/features/catalog/views/comparison_test.dart`, `test/ui/core/widgets/widget_test.dart`,
  `test/ui/features/agencies/agency_vigencia_test.dart` — comparador por viajeros, widgets base
  y sello de verificación/documentos legales.

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
- **Tokens de diseño del viajero** (`apps/viajero/lib/ui/core/theme/`): `AppTheme` (temas claro y
  oscuro), `DiversoColors` (`ThemeExtension` con los colores que no están en el `ColorScheme`:
  dorado de las estrellas, píldoras de estado, «pocos cupos», fondos sobre foto; se lee con
  `DiversoColors.of(context)`), `AppText` (escala de tamaños de letra), `AppRadios` y `AppInsets`
  (radios y espaciados repetidos). No se escriben colores, tamaños de letra ni radios sueltos en
  los widgets. Lints estrictos en `analysis_options.yaml`, entre ellos
  `avoid_catches_without_on_clauses` y `avoid_dynamic_calls`.
- **Pasarela en modo prueba** (decisión del usuario): `WompiPaymentGateway` (en
  `diverso_core`, detrás de la abstracción `PaymentGateway`) inicia y verifica el pago
  llamando a las Edge Functions; la plataforma opera solo con transacciones de prueba hasta
  que se decida lo contrario.
- **Marca:** el colibrí de la primera versión de la app. La máscara maestra
  (`packages/diverso_core/assets/logo_diverso.png`, negro + alfa) la dibuja `DiversoLogo`
  teñida con el color que pida cada pantalla; el panel Svelte usa una copia como máscara CSS
  (`apps/panel_svelte/static/logo_diverso.png`). Todos los íconos (launcher Android e iOS,
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
