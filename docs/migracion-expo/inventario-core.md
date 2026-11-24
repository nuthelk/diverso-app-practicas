# Inventario del núcleo (`packages/diverso_core`) y del backend (`supabase/`)

> Objetivo: portar el núcleo Dart a TypeScript (React Native + Expo + supabase-js) **1:1**, sin perder
> comportamiento. Este documento es la fuente para el port; el inventario de pantallas está en
> `docs/migracion-expo/inventario-viajero.md`.
>
> Rama: `feat/migracion-expo` (base `a4d1cca`). Todo lo de abajo se leyó del código; donde hay una
> conclusión propia (bug, riesgo) se marca **[hallazgo]**.

---

## 0. Mapa del paquete

| Ruta (`packages/diverso_core/…`) | Qué es |
|---|---|
| `pubspec.yaml` | deps: `supabase_flutter ^2.9.0`, `go_router ^18.0.2`, `intl ^0.20.2`; asset `assets/logo_diverso.png` |
| `lib/diverso_core.dart` | barrel: exporta TODO lo de abajo |
| `lib/models/` | 10 archivos de modelos + enums |
| `lib/data/services/` | 3 «Api» crudas (Supabase): `CatalogApi`, `BookingApi`, `EdgeFunctionsApi` |
| `lib/data/repositories/` | 5 repos + helper `llamarEdgeFunction` |
| `lib/errors/` | `DiversoException` + extensión `mensajeUsuario` |
| `lib/utils/` | `busqueda.dart`, `formatters.dart`, `hora_bogota.dart` |
| `lib/legal/documento_legal.dart` | 3 documentos legales + `kVersionLegal` |
| `lib/comparison/comparison_row.dart` | filas del comparador de planes |
| `lib/config/diverso_config.dart` | URL/clave Supabase (dart-define) + rutas de retorno de pago |
| `lib/ui/` | `DiversoLogo` (widget) y `DiversoPageTransitions` (go_router) |
| `assets/logo_diverso.png` | máscara 1024×1024 negro+alfa del colibrí |
| `test/` | 16 archivos de test (~133 declaraciones `test/testWidgets`) + 1 soporte + 2 goldens |

Arquitectura (ver `apps/viajero/lib/main.dart`): `SupabaseClient` → *Api* (filas crudas, errores
PostgREST sin traducir) → *Repository* (mapea a modelos, traduce a `DiversoException`) → UI. La UI solo ve
repositorios. Composición en `main.dart`:

```
Supabase.initialize(url: DiversoConfig.supabaseUrl, publishableKey: DiversoConfig.supabaseKey)
client = Supabase.instance.client; edgeFunctions = EdgeFunctionsApi(client)
AuthRepository(client) · BookingRepository(BookingApi(client), edgeFunctions)
CatalogRepository(CatalogApi(client)) · ReviewRepository(client) · WompiPaymentGateway(edgeFunctions)
```

No hay caché en el núcleo (ni en memoria ni en disco), ni streams salvo `onAuthStateChanged`, ni Realtime,
ni Storage (las fotos y logos son URLs públicas ya guardadas en columnas).

---

## 1. Modelos

Convención de parseo: todos los modelos tienen `factory X.fromMap(Map<String,dynamic>)` (no hay `toJson`
salvo los dos indicados). Los números de PostgREST (`numeric`, `int`) llegan como `num` y se convierten con
`(x as num).toDouble()/toInt()`. Las fechas `timestamptz` se parsean con `DateTime.parse` (quedan en UTC si
traen offset). Las `date` (`'YYYY-MM-DD'`) se parsean con `DateTime.parse` → **medianoche local sin zona**.

### 1.1 Enums (`lib/models/enums.dart`)

Interfaz `DbEnum { String get db; }` y `T? enumFromDb<T extends DbEnum>(Iterable<T> values, String? valor)`:
devuelve el valor cuyo `.db == valor`; `null` si `valor` es null o desconocido (cada `fromMap` aplica luego
su propio valor por defecto).

| Enum Dart | Valores (Dart → texto BD) | Tipo PG | Extensión |
|---|---|---|---|
| `UserRole` | viajero, agencia, admin | `user_role` | — |
| `VerificationStatus` | pendiente, verificado, rechazado | `verification_status` | — |
| `PlanStatus` | borrador, publicado, archivado | `plan_status` | — |
| `BookingStatus` | `pendientePago`→`pendiente_pago`, confirmada, cancelada, completada | `booking_status` | `label`: «Pendiente de pago», «Confirmada», «Cancelada», «Completada» |
| `PaymentMethodOption` | pse, nequi, daviplata, tarjeta, bancolombia, otro | `payment_method` (bancolombia/otro se añaden en 0003) | `label`: «PSE», «Nequi», «Daviplata», «Tarjeta», «Bancolombia», «Otro medio» |
| `PaymentStatus` | pendiente, aprobado, rechazado, reembolsado | `payment_status` | — |
| `ExperienceCategory` | aventura, naturaleza, cultura, gastronomia, relax, urbano | `experience_category` | `label`: Aventura, Naturaleza, Cultura, Gastronomía, Relax, Urbano · `emoji`: 🧭 🌿 🏘️ 🍽️ 💤 🏙️ |
| `EstadoPago` (`pago.dart`) | aprobado, rechazado, pendiente, error | respuesta `pagos-verificar.estado_pago` | — |
| `EstadoReembolso` (`reembolso.dart`, NO es DbEnum) | aprobado, pendiente, rechazado, noAplica | `refunds.estado` / respuesta | ver 1.7 |
| `OrdenCatalogo` (`filtros_catalogo.dart`) | rating, precioAsc, precioDesc, recientes | (solo cliente) | — |
| `OrdenAgencias` (`agencia_resumen.dart`) | puntaje, masPlanes, nombre | (solo cliente) | `label`: «Puntaje», «Más planes», «Nombre» |

### 1.2 `Profile` y `Agency` (`lib/models/profile.dart`)

**Profile** — tabla `profiles`

| Campo | Tipo | Columna | Default si falta |
|---|---|---|---|
| id | String | `id` | requerido |
| rol | UserRole | `rol` | `viajero` |
| nombre | String | `nombre` | `''` |
| telefono | String? | `telefono` | null |

**Agency** — tabla `agencies` (llega embebida en `Plan` como `agencies(*)`)

| Campo | Tipo | Columna | Default |
|---|---|---|---|
| id | String | `id` | req. |
| ownerUserId | String? | `owner_user_id` | null |
| nombre | String | `nombre` | req. |
| descripcion | String | `descripcion` | `''` |
| numeroRnt | String | `numero_rnt` | req. (cast directo) |
| matriculaCamaraComercio | String | `matricula_camara_comercio` | `''` |
| ciudad | String | `ciudad` | `'Medellín'` |
| telefono, email, whatsapp, logoUrl | String? | `telefono`,`email`,`whatsapp`,`logo_url` | null |
| estadoVerificacion | VerificationStatus | `estado_verificacion` | `pendiente` |
| comisionPct | double | `comision_pct` | 12 |
| rntVigenteHasta | DateTime? | `rnt_vigente_hasta` | `DateTime.tryParse(toString())`, null si falla |

Getter `verificada`: `estadoVerificacion == verificado && rntVigenteHasta != null && !rntVigenteHasta.isBefore(hoyLocal00:00)`
(usa la fecha **local del teléfono**, no Bogotá; el servidor usa `current_date`). Lo usa la UI para el sello
«verificada» (`plan_card.dart`, `tarjeta_agencia.dart`).

### 1.3 `AgenciaResumen` (`lib/models/agencia_resumen.dart`) — fila de RPC `agencias_publicas`

| Campo | Tipo | Columna | Default |
|---|---|---|---|
| id, nombre | String | `id`,`nombre` | req. |
| ciudad, descripcion | String | `ciudad`,`descripcion` | `''` |
| logoUrl, portadaUrl | String? | `logo_url`,`portada_url` | null |
| planesCount | int | `planes_count` | 0 |
| rating | double? | `rating` | null (sin reseñas) |
| reviewsTotal | int | `reviews_total` | 0 |

Derivados:
- `esNueva = rating == null`
- `puntajeTexto = rating == null ? 'Nueva' : rating.toStringAsFixed(1)`
- `planesTexto = '$planesCount ' + (planesCount == 1 ? 'plan' : 'planes')`
- `iniciales`: `nombre.trim().split(/\s+/)`, filtra vacías y conectores `{de, del, la, las, el, los, y, e, en}`
  (comparando en minúsculas). 0 palabras → `'?'`; 1 palabra → sus 2 primeras letras (o 1 si es de 1 letra)
  en mayúsculas; ≥2 → primera letra de las dos primeras, en mayúsculas.

Función pura `ordenarAgencias(Iterable<AgenciaResumen>, OrdenAgencias) → List` (copia, no muta):
- clave de nombre `_claveNombre`: `toLowerCase()` y reemplazo carácter a carácter `á→a é→e í→i ó→o ú→u ü→u ñ→n`;
  comparación `String.compareTo` (orden por unidades UTF-16, **no** `localeCompare`).
- `puntaje`: las `esNueva` al final; luego `rating` desc; luego `reviewsTotal` desc; luego nombre.
- `masPlanes`: `planesCount` desc; luego nombre.
- `nombre`: por clave de nombre.

### 1.4 `Plan`, `PlanDate`, `ItinerarioPaso` (`lib/models/plan.dart`)

**ItinerarioPaso** — elemento del `jsonb` `plans.itinerario`: `hora` (String, `''`), `actividad` (String, `''`).
`toMap() → {'hora','actividad'}` (no lo usa la app viajero).

**PlanDate** — tabla `plan_dates`

| Campo | Tipo | Columna |
|---|---|---|
| id, planId | String | `id`, `plan_id` |
| fecha | DateTime (medianoche local) | `fecha` (`date`) |
| cupoTotal, cupoDisponible | int | `cupo_total`, `cupo_disponible` |

`tieneCupos = cupoDisponible > 0`. `toInsertMap()` → `{plan_id, fecha:'YYYY-MM-DD', cupo_total, cupo_disponible}`
(resto del panel Flutter antiguo; la app viajero no lo usa).

**Plan** — tabla `plans` (+ embebidos)

| Campo | Tipo | Columna | Default |
|---|---|---|---|
| id, agencyId, titulo, destino | String | `id`,`agency_id`,`titulo`,`destino` | req. |
| categoria | ExperienceCategory | `categoria` | `aventura` |
| resumen, descripcion | String | `resumen`,`descripcion` | `''` |
| duracionTexto | String | `duracion_texto` | `'1 día'` |
| duracionHoras | double | `duracion_horas` | 12 |
| puntoEncuentro | String | `punto_encuentro` | `''` |
| horaSalida | Duration | `hora_salida` (`time`, `'HH:MM:SS'`) | 6 h |
| precioCop | double | `precio_cop` | req. |
| incluye | List<String> | `incluye` (`text[]`) | [] |
| incluyeTransporte/Comida/Hospedaje | bool | `incluye_transporte`/`_comida`/`_hospedaje` | false |
| itinerario | List<ItinerarioPaso> | `itinerario` | [] |
| politicaCancelacion | String | `politica_cancelacion` | `''` |
| fotos | List<String> | `fotos` (`text[]`, URLs absolutas) | [] |
| estado | PlanStatus | `estado` | `borrador` |
| ratingPromedio | double | `rating_promedio` | 0 |
| reviewsCount | int | `reviews_count` | 0 |
| agency | Agency? | embebido **`agencies`** | null |
| dates | List<PlanDate> | embebido `plan_dates` | [] |

`_horaDesdePostgres(String?)`: `split(':')`; si null o <2 partes → 6 h; si no `horas=int(p0)`, `min=int(p1)`
(acepta `'HH:MM'` y `'HH:MM:SS'`; ignora segundos).

Derivados (la regla de negocio de «ya salió» vive aquí):
- `fotoPrincipal = fotos.first | null`; `esNuevo = reviewsCount == 0`.
- `salidaDe(PlanDate f) = DateTime.utc(f.fecha.year, month, day) + horaSalida + 5 h` → instante UTC.
  Equivale a `(fecha + hora_salida) at time zone 'America/Bogota'` del servidor.
- `yaSalio(f, [ahora]) = !salidaDe(f).isAfter((ahora ?? now).toUtc())` (exactamente ahora = ya salió).
- `fechasDisponiblesA(ahora)`: `dates.where(tieneCupos && !yaSalio)` ordenadas por `fecha` asc.
  `fechasDisponibles` = con `DateTime.now()`.
- `tieneSalidaEl(dia, [ahora])`: alguna `fechasDisponiblesA(ahora)` con mismo año/mes/día que `dia`.

### 1.5 `Booking` y `Payment` (`lib/models/booking.dart`)

**Payment** — tabla `payments` (embebida `payments(*)`)

| Campo | Tipo | Columna | Default |
|---|---|---|---|
| id, bookingId | String | `id`,`booking_id` | req. |
| metodo | PaymentMethodOption | `metodo` | `otro` |
| estado | PaymentStatus | `estado` | `pendiente` |
| monto | double | `monto` | 0 |
| referencia | String | `referencia` | `''` |
| provider | String | `provider` | `'simulado'` |
| simulated | bool | `simulated` | true |

`textoReferencia = 'Pagado con ${metodo.label} · ref. $referencia (prueba)'`.

**Booking** — tabla `bookings`

| Campo | Tipo | Columna / origen | Default |
|---|---|---|---|
| id, codigo, planDateId, viajeroId | String | `id`,`codigo`,`plan_date_id`,`viajero_id` | req. |
| pax | int | `pax` | req. |
| montoTotal | double | `monto_total` | 0 |
| estado | BookingStatus | `estado` | `pendientePago` |
| createdAt | DateTime | `created_at` | req. |
| salidaAt | DateTime? | `salida_at` (congelada al reservar) | null |
| planDate | PlanDate? | embebido `plan_date` (alias) | null |
| plan | Plan? | `plan_date.plan` (alias) | null |
| payments | List<Payment> | `payments` | [] |
| refunds | List<Refund> | `refunds` | [] |
| tieneResena | bool | **no viene de la BD**: lo marca el repositorio | false |

Derivados:
- `pago = payments.first | null`.
- `static retencion = 30 min` (mismo valor que el servidor: `expire_stale_bookings`, `create_booking`).
- `venceAt = createdAt + 30 min`.
- `reembolso`: el `Refund` con `createdAt` más reciente (copia ordenada desc), o null.
- `etiquetaReembolso`: `reembolso?.etiqueta`; si no hay y `estado == cancelada && pago != null` →
  `'Sin reembolso'`; si no, null.
- `conResena()`: copia con `tieneResena = true` (inmutable, conserva todo).
- `salida = salidaAt ?? planDate?.fecha` (ojo: el fallback es medianoche local, no la hora de salida).
- `esFutura([ahora]) = salida?.isAfter(ahora ?? now) ?? false`.
- `vigente([ahora]) = (confirmada || pendientePago) && esFutura(ahora)` — única cancelable.
- `puedeResenar([ahora]) = (confirmada || completada) && salida != null && !esFutura(ahora) && !tieneResena`.

### 1.6 `CreatedBooking` (`lib/models/created_booking.dart`)

Resultado de `create_booking`: `bookingId`, `codigo`, `montoTotal` (double), `planTitulo` (String, `''` si
falta), `fecha` (DateTime?, `DateTime.parse(fecha.toString())`). El RPC devuelve además `cupos_restantes`,
que se ignora.

### 1.7 Reembolsos (`lib/models/reembolso.dart`)

`EstadoReembolso.etiqueta`: aprobado → «Reembolso de prueba aprobado»; pendiente → «Reembolso de prueba
pendiente»; rechazado → «Reembolso de prueba rechazado»; noAplica → «Sin reembolso».
`desdeServidor(String?)`: `'aprobado'|'pendiente'|'rechazado'` → su valor; cualquier otro (incl. `'no_aplica'`,
null) → `noAplica`.

**Refund** — tabla `refunds`. `static columnas = 'id, booking_id, monto, porcentaje, estado, origen, motivo, created_at'`
(obligatorio: `select=*`/`refunds(*)` da **403** porque la columna `raw` no está concedida a `authenticated`).
Campos: id, bookingId (`booking_id`), monto (double, 0), porcentaje (int, 0), estado (EstadoReembolso),
motivo (String, `''`), createdAt. (`origen` se pide pero no se mapea.)
`etiqueta = '${estado.etiqueta} · $porcentaje % · ${formatCOP(monto)}'` → «Reembolso de prueba aprobado · 50 % · $ 150.000».

**VistaPreviaCancelacion** — respuesta de RPC `vista_previa_cancelacion`: `aplica` (bool, false),
`porcentaje` (int, 0), `monto` (double, 0), `horasAntes` (`horas_antes`, double, 0), `motivo` (String, '').

**ResultadoCancelacion** — respuesta de `reservas-cancelar`, lee el objeto `reembolso`: `aplica`, `porcentaje`,
`monto`, `estado` (vía `desdeServidor`), `motivo`.

### 1.8 Pagos (`lib/models/pago.dart`)

**CheckoutIniciado** (respuesta `pagos-iniciar`): `checkoutUrl` (`checkout_url`), `referencia`,
`amountInCents` (`amount_in_cents`, int), `expiraAt` (`expira_at` → `.toUtc()`). `monto = amountInCents / 100`.

**PagoVerificado** (respuesta `pagos-verificar`): `estado` (`estado_pago` → EstadoPago, default `error`),
`metodo` (`metodo`: null → null; desconocido → `otro`), `referencia` (String?), `bookingId`/`codigo`/`bookingEstado`
desde el objeto `booking {id, codigo, estado}` (estado default `pendientePago`).
`mensajeUsuario`:
- aprobado → «¡Pago de prueba aprobado! Tu reserva está confirmada.»
- rechazado → «Wompi rechazó el pago de prueba (fondos, datos o el resultado del banco). Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).»
- error → «Wompi no pudo procesar el pago de prueba. Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).»
- pendiente → «Tu pago de prueba sigue pendiente. Te avisaremos en Mis reservas cuando Wompi lo confirme.»

### 1.9 `Review` (`lib/models/review.dart`)

id, bookingId (`booking_id`), planId (`plan_id`), viajeroId (`viajero_id`), calificacion (int), comentario
(String?), createdAt, viajeroNombre (`profiles.nombre` embebido, String?).

### 1.10 `FiltrosCatalogo` (`lib/models/filtros_catalogo.dart`)

`texto?`, `categoria?` (ExperienceCategory), `destino?`, `precioMax?` (double), `fecha?` (DateTime, día
elegido), `agencyId?` (página de agencia), `orden` (OrdenCatalogo, default `rating`). Sin lógica.

---

## 2. Servicios (Api) y repositorios

### 2.1 `CatalogApi` (`lib/data/services/catalog_api.dart`)

Constantes de select:
- `_seleccionPlan = '*, agencies(*), plan_dates(*)'`
- `_seleccionPlanConDia = '*, agencies(*), plan_dates!inner(*)'` (inner join: con día elegido, el filtro de
  `plan_dates.fecha` descarta **planes**, y el `limit 60` se aplica sobre planes que sí tienen ese día).

`planesPublicados({required desde, required orden, busqueda?, categoria?, destino?, precioMax?, fecha?, agencyId?})`
```
from('plans').select(fecha == null ? _seleccionPlan : _seleccionPlanConDia)
  .eq('estado','publicado')
  .gte('plan_dates.fecha', desde)              // filtra fechas embebidas (sin !inner no descarta planes)
  [.ilike('busqueda', '%<busqueda>%')]         // columna generada 0011 (minúsculas, sin tildes)
  [.eq('categoria', categoria.db)]
  [.eq('destino', destino)]
  [.lte('precio_cop', precioMax)]
  [.eq('plan_dates.fecha', fecha)]             // 'YYYY-MM-DD'
  [.eq('agency_id', agencyId)]
  .order('fecha', ascending: true, referencedTable: 'plan_dates')
  .order(<rating_promedio desc | precio_cop asc | precio_cop desc | created_at desc>)
  .limit(60)
```
Query string verificado por test (`catalog_api_test.dart`): `select=*,agencies(*),plan_dates!inner(*)`,
`plan_dates.fecha=eq.2026-11-05&plan_dates.fecha=gte.2026-11-02`, `limit=60`.

`agenciasPublicas({agencyId?})` → `rpc('agencias_publicas')` o `rpc('agencias_publicas', {p_agency_id})` → lista de mapas.

`plan(planId, {desde})` → `from('plans').select(_seleccionPlan).eq('id',planId).gte('plan_dates.fecha',desde).order('fecha',asc,referencedTable:'plan_dates').single()` (lanza si no existe).

`destinosPublicados()` → `from('plans').select('destino').eq('estado','publicado').order('destino')` (con repetidos).

### 2.2 `CatalogRepository` (`lib/data/repositories/catalog_repository.dart`) — **no traduce errores** (salen crudos)

| Método | Lógica |
|---|---|
| `Future<List<Plan>> search(FiltrosCatalogo f)` | `texto = normalizarBusqueda(f.texto ?? '')`; llama `planesPublicados(desde: fechaToIso(hoyBogota()), orden: f.orden, busqueda: texto vacío→null, categoria, destino: vacío→null, precioMax, fecha: f.fecha→fechaToIso, agencyId)`; mapea `Plan.fromMap`; **si hay `f.fecha`**, filtra en cliente `p.tieneSalidaEl(f.fecha)` (descarta los que ese día ya salieron o no tienen cupo). Mantiene el orden del servidor. |
| `Future<List<AgenciaResumen>> agencias()` | `agenciasPublicas()` → `AgenciaResumen.fromMap` |
| `Future<({AgenciaResumen agencia, List<Plan> planes})?> agenciaConPlanes(agencyId)` | En **paralelo**: `agenciasPublicas(agencyId)` y `search(FiltrosCatalogo(agencyId))`; si no hay fila de agencia → `null`. |
| `Future<Plan> planDetalle(planId)` | `Plan.fromMap(await plan(planId, desde: fechaToIso(hoyBogota())))` |
| `Future<List<String>> destinos()` | distintos (`toSet`) y ordenados (`sort()` de Dart = orden por unidades de código, no locale) |

### 2.3 `BookingApi` (`lib/data/services/booking_api.dart`)

`_seleccionReserva = '*, plan_date:plan_dates(*, plan:plans(*, agency:agencies(*))), payments(*), refunds(id, booking_id, monto, porcentaje, estado, origen, motivo, created_at)'`

| Método | Consulta |
|---|---|
| `usuarioId` | `client.auth.currentUser?.id` |
| `crearReserva({planDateId, pax})` | `rpc('create_booking', {p_plan_date_id, p_pax})` → Map |
| `reservasDe(viajeroId)` | `from('bookings').select(_seleccionReserva).eq('viajero_id',id).order('created_at', desc)` |
| `resenasDe(viajeroId)` | `from('reviews').select('booking_id').eq('viajero_id',id)` |
| `reserva(bookingId)` | `from('bookings').select(_seleccionReserva).eq('id',id).maybeSingle()` |
| `resenaDe(bookingId)` | `from('reviews').select('id').eq('booking_id',id).maybeSingle()` |
| `pendientesDe({viajeroId, planDateId, creadaDespuesDe})` | `from('bookings').select().eq('viajero_id').eq('plan_date_id').eq('estado','pendiente_pago').gt('created_at', creadaDespuesDe.toIso8601String()).order('created_at',desc).limit(1)` (sin embebidos) |
| `vistaPreviaCancelacion(bookingId)` | `rpc('vista_previa_cancelacion', {p_booking_id})` → Map |

### 2.4 `BookingRepository` (`lib/data/repositories/booking_repository.dart`)

| Método | Lógica y errores |
|---|---|
| `crearReserva({planDateId, pax}) → CreatedBooking` | RPC `create_booking`; mapea `booking_id, codigo, monto_total, plan_titulo ('' si null), fecha (nullable)`. Cualquier error → `DiversoException.fromPostgrest(e)`. |
| `misReservas() → List<Booking>` | Sin sesión → `[]` sin consultar. `reservasDe(uid)`; si hay reservas, `resenasDe(uid)` y marca `conResena()` las que tienen reseña (conserva orden). Si no hay reservas, **no** pide reseñas. **No traduce errores.** |
| `reserva(bookingId) → Booking` | `reserva(id)`; null → `DiversoException('RESERVA_NO_EXISTE')` (se relanza tal cual); luego `resenaDe(id)` y marca `conResena`. Otros errores → `fromPostgrest`. |
| `reservaPendiente(planDateId) → Booking?` | Sin sesión → null. `desde = now().toUtc() - 30 min`; `pendientesDe(...)`; primera o null. Errores → `fromPostgrest`. El checkout la reutiliza para no retener cupos dos veces. |
| `vistaPreviaCancelacion(bookingId)` | RPC → `VistaPreviaCancelacion`; errores → `fromPostgrest`. |
| `cancelar(bookingId) → ResultadoCancelacion` | `llamarEdgeFunction('reservas-cancelar', {booking_id})`. Idempotente. |

### 2.5 `EdgeFunctionsApi` y `llamarEdgeFunction`

`EdgeFunctionsApi.invocar(funcion, cuerpo)`: `client.functions.invoke(funcion, body: cuerpo)` (envía el JWT
de la sesión en `Authorization`); si `res.data` es Map → lo devuelve; si no → lanza
`FunctionException(status: res.status, details: data)`. En supabase_flutter, una respuesta no‑2xx ya lanza
`FunctionException` con `details` = cuerpo JSON; un fallo de red lanza `FunctionsFetchException` (subclase,
status 0).

`llamarEdgeFunction(api, funcion, cuerpo)`: `try invocar` / `on FunctionException catch → DiversoException.fromFunction(e)`.

### 2.6 `PaymentGateway` / `WompiPaymentGateway` (`lib/data/repositories/payment_gateway.dart`)

Interfaz abstracta (para inyectar fakes):
- `iniciar({required bookingId, required redirectUrl}) → CheckoutIniciado` → `pagos-iniciar` con `{booking_id, redirect_url}`.
- `verificar({transactionId?, bookingId?}) → PagoVerificado`: exige **exactamente uno** (si no, `ArgumentError`
  síncrono antes de llamar). Cuerpo: `{'transaction_id': ?transactionId, 'booking_id': ?bookingId}` — sintaxis
  Dart 3.8 de entrada nula: **la clave se omite**, no se manda `null`.
- Resultados `rechazado`/`error`/`pendiente` son **valores**, no excepciones; los 4xx/5xx sí son excepciones.

### 2.7 `ReviewRepository` (`lib/data/repositories/review_repository.dart`)

| Método | Consulta |
|---|---|
| `porPlan(planId, {limit = 20}) → List<Review>` | `from('reviews').select('*, profiles(nombre)').eq('plan_id',id).order('created_at',desc).limit(limit)`. No traduce errores. |
| `crear({bookingId, calificacion, comentario?})` | `from('reviews').insert({booking_id, calificacion, comentario: trim(); vacío → null})`. El trigger `fill_review_from_booking` deriva `plan_id`/`viajero_id`; RLS `reviews_insert_verified` valida. Errores → `fromPostgrest`. |

### 2.8 `AuthRepository` (`lib/data/repositories/auth_repository.dart`) — **no traduce errores**

| Miembro | Implementación |
|---|---|
| `signIn({email, password})` | `auth.signInWithPassword(email, password)` |
| `signUpViajero({nombre, email, password, aceptaDocumentos})` | si `!aceptaDocumentos` → `ArgumentError('Se requiere la autorización expresa del titular.')`; `auth.signUp(email, password, data: {nombre, rol:'viajero', consentimiento_version: kVersionLegal})`. El trigger `handle_new_user` crea `profiles` y, si la versión coincide con `version_documentos_legales()`, inserta 2 `consents` (`tratamiento_datos` + `terminos_viajero`, origen `'registro'`). |
| `consentimientosPendientes() → List<String>` | `rpc('consentimientos_pendientes')`; si es lista → `toString()` de cada uno; si no → `[]`. Valores: `'tratamiento_datos'`, `'terminos_viajero'`. |
| `registrarConsentimiento(tipo)` | `rpc('registrar_consentimiento', {p_tipo: tipo, p_version: kVersionLegal, p_origen: 'app'})` (falla con `VERSION_DESACTUALIZADA` si la versión no coincide). |
| `signOut()` | `auth.signOut()` |
| `onAuthStateChanged: Stream<String?>` | `auth.onAuthStateChange.map((s) => s.session?.user.id)` — emite en **cada** evento (incl. `tokenRefreshed`). Lo usan el router (`GoRouterRefreshStream`) y `consent_view_model.dart`. |
| `currentUserId`, `currentUserEmail` | `auth.currentUser?.id / ?.email` |
| `currentProfile() → Profile` | sin sesión → `StateError('No hay sesión activa')`; `from('profiles').select().eq('id',uid).single()` |

**Lo que NO existe** (verificado con búsqueda en `apps/viajero/lib` y manifests): OAuth/social login,
recuperación de contraseña, magic link, verificación de correo (en local `enable_confirmations = false`, así
que `signUp` devuelve sesión al instante), deep links de auth, Realtime, MFA. La persistencia de sesión es la
por defecto de `supabase_flutter` (SharedPreferences, auto‑refresh). No hay `emailRedirectTo`.

---

## 3. Configuración (`lib/config/diverso_config.dart`)

| Constante | Origen | Default |
|---|---|---|
| `supabaseUrl` | `String.fromEnvironment('SUPABASE_URL')` (dart-define) | `http://127.0.0.1:54331` (puerto API de `supabase/config.toml`) |
| `supabaseKey` | `String.fromEnvironment('SUPABASE_KEY')` | **clave publicable de la instancia local** (`sb_publishable_…`) embebida como default — no se copia aquí |
| `pagoResultadoPath` | const | `/pago/resultado` |
| `pagoRetornoMovil` | const | `https://diverso.app/pago/resultado` (el WebView la intercepta; nunca se carga) |

Inyección en Flutter: `flutter run --dart-define=SUPABASE_URL=… --dart-define=SUPABASE_KEY=…`. Emulador
Android: `http://10.0.2.2:54331`. `main.dart` usa `Supabase.initialize(url, publishableKey)` y
`usePathUrlStrategy()` + `initializeDateFormatting('es')`.

Equivalente Expo propuesto: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (públicas por diseño; la
llave publicable/anon no es secreta, pero el default embebido debería ir a `.env.local`, no al código).

Variables del **backend** (solo nombres; viven en `supabase/functions/.env` / secretos del proyecto):
`WOMPI_ENV` (`sandbox`|`mock`), `WOMPI_PUBLIC_KEY` (`pub_test_…`), `WOMPI_PRIVATE_KEY` (`prv_test_…`),
`WOMPI_EVENTS_SECRET` (`test_events_…`), `WOMPI_INTEGRITY_SECRET` (`test_integrity_…`), `WOMPI_API_URL`,
`WOMPI_CHECKOUT_URL`, `PAGOS_REDIRECT_ALLOWLIST`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 4. errors, utils, legal, comparison, ui

### 4.1 `DiversoException` (`lib/errors/diverso_exception.dart`)

`DiversoException(codigo, [mensaje, detalle])`; `detalle: Map?` = cuerpo completo del error de una Edge Function.
`toString() = 'DiversoException($codigo): $mensaje'`.

`fromFunction(FunctionException e)` (orden exacto):
1. si `e.details` es Map con `error` String → `DiversoException(details.error, details.mensaje, details)`.
2. si `e.status == 0` → `SIN_CONEXION` (red caída / `FunctionsFetchException`).
3. si `e.status >= 500` → `ERROR_SERVIDOR`.
4. si no → `ERROR_FUNCION`.

`aprobadoTarde` getter: `detalle?['estado_pago'] == 'aprobado_tarde'`.

`fromPostgrest(Object error)`:
- No es `PostgrestException` → `ERROR_INESPERADO` (mensaje = `toString()`).
- `msg = error.message.trim()`. Si contiene `RESERVA_PENDIENTE_EXISTENTE` → código ese, `mensaje = msg`,
  `detalle = {'booking_id': error.details.toString()}` (null si vacío). El RPC lo lanza con
  `using detail = <uuid de la reserva existente>`.
- Si no, busca **por `contains`, en este orden**: `SIN_CUPO, PAX_INVALIDO, NO_AUTENTICADO, FECHA_NO_EXISTE,
  PLAN_NO_PUBLICADO, RESERVA_NO_EXISTE, ESTADO_INVALIDO, NO_ES_DUENO, RESERVA_INVALIDA, AGENCIA_NO_VERIFICADA,
  AGENCIA_NO_HABILITADA, FECHA_PASADA, FECHA_YA_SALIO, RESERVA_YA_SALIO, RNT_VENCIDO` → primero que aparezca.
- Si nada → `ERROR_BD` (mensaje = msg).

### 4.2 `mensajeUsuario` (`lib/errors/mensaje_usuario.dart`) — tabla 1:1

| Código | Texto |
|---|---|
| SIN_CUPO | Se acabaron los cupos para esa fecha. Prueba otra fecha u otro plan. |
| ESTADO_INVALIDO | La reserva ya no admite esta operación. |
| NO_ES_DUENO | Esta reserva no te pertenece. |
| AGENCIA_NO_VERIFICADA | La agencia debe estar verificada para publicar planes. |
| AGENCIA_NO_HABILITADA, RNT_VENCIDO | Esta agencia no está habilitada para vender en este momento (verificación o RNT pendiente). Elige otro plan. |
| FECHA_PASADA | Esa fecha ya pasó. Elige una salida próxima. |
| FECHA_YA_SALIO | Esta salida ya partió. Elige otra fecha. |
| PLAN_NO_PUBLICADO | Este plan ya no está disponible. |
| RESERVA_PENDIENTE_EXISTENTE | Ya tienes una reserva pendiente de pago para esta fecha. Complétala o cancélala para empezar de nuevo. |
| RESERVA_YA_SALIO | Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar. |
| RESERVA_NO_EXISTE | No encontramos esa reserva. |
| NO_AUTENTICADO | Tu sesión expiró. Inicia sesión de nuevo. |
| RESERVA_VENCIDA + `aprobadoTarde` | Tu pago llegó cuando la reserva ya había vencido, así que no se confirmó. Te lo devolvemos automáticamente (reembolso de prueba `<texto>`). — `<texto>` = `EstadoReembolso.desdeServidor(detalle.reembolso)`: noAplica → «en proceso»; si no, el **nombre del enum** (`aprobado`/`pendiente`/`rechazado`). |
| RESERVA_VENCIDA (sin aprobadoTarde) | Tu reserva venció (los cupos se retienen 30 minutos). Vuelve a reservar. |
| REDIRECT_NO_PERMITIDO | Esta dirección de la app no está autorizada para pagos de prueba. |
| MONTO_NO_COINCIDE | El monto de la transacción no coincide con el de tu reserva, así que no la confirmamos. Contacta a soporte con tu referencia. |
| TRANSACCION_NO_EXISTE, REFERENCIA_DESCONOCIDA | No encontramos ese pago. Si ya pagaste, toca «Ya pagué, verificar» en Mis reservas. |
| WOMPI_NO_DISPONIBLE | Wompi no está disponible en este momento. Intenta de nuevo en unos minutos. |
| WOMPI_NO_AUTORIZADO | La pasarela de prueba rechazó las credenciales configuradas. Avisa al equipo de Diverso. |
| SOLO_MODO_PRUEBA | La pasarela de prueba no está configurada. |
| SIN_CONEXION | Sin conexión con el servidor. Revisa tu internet e intenta de nuevo. |
| ERROR_SERVIDOR, ERROR_INTERNO, CONFIG_SUPABASE, SERVICIO_NO_DISPONIBLE | El servidor tuvo un problema. Intenta de nuevo en un momento. |
| ERROR_BD | Error de conexión. Revisa tu internet e intenta de nuevo. |
| *(otro)* | Algo salió mal (`<codigo>`). Intenta de nuevo. |

### 4.3 `utils/busqueda.dart` — `normalizarBusqueda(texto)`

1. `toLowerCase()`.
2. Reemplaza cada carácter de esta tabla por su base: `á à â ä ã å→a`, `é è ê ë→e`, `í ì î ï→i`,
   `ó ò ô ö õ→o`, `ú ù û ü→u`, `ñ→n`, `ç→c`, `ý ÿ→y` (equivale a `unaccent` de PG para español).
3. `[%_*\\]` → espacio (comodines de ILIKE/PostgREST no actúan).
4. `\s+` → un espacio; `trim()`. Comas y paréntesis **se conservan**.
Debe coincidir con la columna generada `plans.busqueda = lower(f_unaccent(titulo||' '||destino||' '||resumen))`.

### 4.4 `utils/formatters.dart` (dependen de `intl`, locale `es` / `es_CO`)

| Función | Salida | Implementación |
|---|---|---|
| `formatCOP(num)` | `165000 → "$ 165.000"` | `NumberFormat('#,##0','es_CO')` (0 decimales, redondea), fuerza `,`→`.`; prefijo `'$ '` (con espacio) |
| `formatFechaCorta(DateTime)` | «sáb, 3 oct» | `DateFormat('EEE, d MMM','es')` |
| `formatFechaLarga(DateTime)` | «sábado 3 de octubre de 2026» | `DateFormat("EEEE d 'de' MMMM 'de' y",'es')` |
| `formatFechaTexto(DateTime)` | «24 de octubre de 2026» | `DateFormat("d 'de' MMMM 'de' y",'es')` |
| `fechaToIso(DateTime)` | `'2026-11-02'` | año 4 dígitos, mes y día con cero a la izquierda (usa los campos locales del DateTime) |

### 4.5 `utils/hora_bogota.dart`

- `offsetBogota = 5 h` (UTC‑5 fijo, Colombia sin horario de verano).
- `hoyBogota([ahora])`: `b = (ahora ?? now).toUtc() - 5 h` → `DateTime(b.year, b.month, b.day)` (local, sin hora).
  De 19:00 a 24:00 en Bogotá la fecha UTC ya es mañana: por eso no se usa la fecha del teléfono ni la UTC.

### 4.6 `legal/documento_legal.dart`

- `kVersionLegal = 'v2-2026-10'`. Debe coincidir con: SQL `version_documentos_legales()` (última definición
  en `supabase/migrations/0005_endurecimiento_pagos.sql`), y `apps/panel_svelte/src/lib/features/legal/model/legal.ts`
  (`VERSION_LEGAL`). Si no coincide, `registrar_consentimiento` lanza `VERSION_DESACTUALIZADA` y el trigger de
  registro **no** guarda consentimientos (silenciosamente).
- Clases `SeccionLegal(titulo, parrafos)`, `DocumentoLegal(id, titulo, resumen, secciones)`; `DocumentoLegal.porId(id)`;
  `DocumentoLegal.todos = [politicaDatos, terminosViajeros, terminosAgencias]`.
- Documentos (ids → títulos): `privacidad` → «Política de tratamiento de datos personales» (7 secciones);
  `terminos-viajeros` → «Términos y condiciones para viajeros» (5 secciones); `terminos-agencias` →
  «Términos y condiciones para agencias» (6 secciones). Texto literal en el archivo; **copiarlo tal cual**
  (o mejor, generarlo desde una sola fuente: ver gotchas). El encabezado dice que es BORRADOR y que el texto se
  genera desde `apps/panel_svelte/src/lib/legal.ts` (hoy la ruta real es `src/lib/features/legal/model/legal.ts`).
- Ojo con el id: el documento de datos es `privacidad`, pero el tipo de consentimiento en BD es `tratamiento_datos`.

### 4.7 `comparison/comparison_row.dart`

`ComparisonRow(icono, titulo, valores)` (`icono` es en realidad una clave estable del atributo).
`buildComparisonRows(List<Plan> planes, {pax = 2})` → `[]` si vacío; si no, 10 filas en este orden:

| clave | título | valor por plan |
|---|---|---|
| precio | Precio final por persona | `precioCop.toStringAsFixed(0)` (número crudo, sin formato COP) |
| total | `Total para $pax persona(s)` (singular si pax==1) | `(precioCop*pax).toStringAsFixed(0)` |
| duracion | Duración | `duracionTexto` |
| destino | Destino | `destino` |
| rating | Calificación | `esNuevo ? 'Nueva' : '${ratingPromedio.toStringAsFixed(1)} ★ (${reviewsCount})'` |
| transporte / comida / hospedaje | Transporte / Comida / Hospedaje | `'✓ Incluido'` o `'—'` |
| cupos | Próximos cupos | sin `fechasDisponibles` → `'Sin fechas'`; si no `'${primera.cupoDisponible} el ${dia}/${mes}'` (sin ceros) |
| cancelacion | Cancelación | `politicaCancelacion` o `'—'` |

Ojo: `toStringAsFixed(0)` redondea «half away from zero»; `Number.prototype.toFixed` de JS tiene
diferencias de redondeo en binario — irrelevante para precios enteros, pero conviene un test.

### 4.8 `ui/`

- `DiversoLogo({color = Colors.white, size = 48})`: `Image.asset('assets/logo_diverso.png', package:'diverso_core')`
  teñida con `BlendMode.srcIn` (`tintColor` en RN), `excludeFromSemantics: true`. El asset es también la fuente
  de los íconos (`tools/iconos/generar_iconos.py`) y el panel compara byte a byte su copia
  (`apps/panel_svelte/static/logo_diverso.png`) con esta.
- `DiversoPageTransitions` (`CustomTransitionPage` de go_router):
  - `sharedAxisX`: 380 ms ida / 300 ms vuelta; entrante: fade 0→1 + slide x 8 %→0 (`easeOutCubic`, reverso
    `easeInCubic`); saliente (secondary): fade 1→0 + slide x 0→‑5 %.
  - `fadeThrough`: 320 ms; entrante: fade 0→1 y escala 0.94→1 en `Interval(0.35,1, easeOut)`; saliente: fade
    1→0 en `Interval(0,0.4, easeIn)`. Para cambios de pestaña.
  - `zoomIn`: 440 ms; escala 0.90→1 `easeOutBack`; fade 0→1 `easeOutCubic`; saliente fade `easeInCubic`.
    Para «reserva confirmada».

---

## 5. Edge Functions (contratos)

Comunes (`supabase/functions/_shared/http.ts`): solo `POST` (+`OPTIONS` 204 con CORS `*`); errores siempre
`{error: CODIGO, mensaje: <texto informativo>, ...extra}`; excepciones no controladas → `500 {error:'ERROR_INTERNO'}`.
Guardia `cargarConfig` corre primero: cualquier llave no `*_test_`/URL no sandbox → `503 SOLO_MODO_PRUEBA` (+`detalle`).
JWT: `verify_jwt = true` en todas salvo `pagos-webhook`; además `usuarioDesdeJwt` consulta `GET /auth/v1/user`
(`401 NO_AUTENTICADO`, `502 SERVICIO_NO_DISPONIBLE`). Falta de env Supabase → `500 CONFIG_SUPABASE`.
Errores SQL traducidos por `_shared/db.ts`: `RESERVA_NO_EXISTE 404`, `NO_ES_DUENO 403`, `ESTADO_INVALIDO 409`,
`RESERVA_VENCIDA 409`, `RESERVA_YA_SALIO 409`, `REEMBOLSO_NO_EXISTE 404`; cualquier otro → `500 ERROR_INTERNO`.
Body no‑objeto JSON → `400 SOLICITUD_INVALIDA`.

### 5.1 `pagos-iniciar` (`supabase/functions/pagos-iniciar/index.ts`)

- Request: `{ booking_id: uuid, redirect_url: string }`.
- Validación: uuid y string → si no `400 SOLICITUD_INVALIDA`; `redirectPermitido(redirect_url)` → si no `400 REDIRECT_NO_PERMITIDO`.
  Regla: mismo `origin` y, si la entrada termina en `/`, prefijo de ruta; si no, ruta exacta (query/fragmento
  no cuentan); URLs con usuario/clave rechazadas. Allowlist por defecto (`PAGOS_REDIRECT_ALLOWLIST` vacía):
  `http://localhost:8080/`, `http://127.0.0.1:8080/`, `http://localhost:3000/`, `http://127.0.0.1:3000/`,
  `https://diverso.app/pago/resultado`. **Solo http(s)**.
- SQL `crear_intento_pago(p_booking_id, p_viajero_id)` (versión 0013): bloquea la reserva; errores
  `RESERVA_NO_EXISTE`, `NO_ES_DUENO`, `ESTADO_INVALIDO` (≠ pendiente_pago), `RESERVA_VENCIDA` (created_at+30min ≤ now),
  `RESERVA_YA_SALIO` (salida_at ≤ now). `expira_at = least(created_at+30min, salida_at)`; referencia
  `<codigo>-<n>` (n = intentos+1); `amount_in_cents = round(monto_total*100)`; moneda `COP`.
- Response 200: `{ checkout_url, referencia, amount_in_cents: number, expira_at: ISO }`. `checkout_url` =
  `WOMPI_CHECKOUT_URL?public-key&currency&amount-in-cents&reference&signature:integrity&redirect-url&expiration-time[&customer-data:email][&customer-data:full-name]`
  (firma de integridad SHA‑256 con `WOMPI_INTEGRITY_SECRET`).
- Wompi redirige a `redirect_url?id=<transaction_id>`.

### 5.2 `pagos-verificar` (`supabase/functions/pagos-verificar/index.ts`)

- Request: **exactamente una** de `{ transaction_id: /^[A-Za-z0-9_-]{1,100}$/ }` o `{ booking_id: uuid }`.
  El servidor compara con `=== undefined`: **enviar la otra clave con `null` cuenta como presente → 400**.
- Con `transaction_id`: consulta Wompi (`404 TRANSACCION_NO_EXISTE`), busca `payment_attempts.referencia`
  (`404 REFERENCIA_DESCONOCIDA`), verifica dueño (`404 RESERVA_NO_EXISTE`/`403 NO_ES_DUENO`), aplica
  `aplicar_resultado_pago`.
- Con `booking_id` («Ya pagué, verificar»): verifica dueño; si la reserva no está confirmada revisa los 5
  intentos más recientes (por id de transacción o buscando por referencia en Wompi); un resultado definitivo
  corta; «pendiente» gana a «rechazado». Si nada → 200 con `estado_pago` `aprobado` (si hay `payments`
  aprobado/reembolsado) o `pendiente`.
- Response 200: `{ estado_pago: 'aprobado'|'rechazado'|'pendiente'|'error', metodo: string|null, referencia: string|null, booking: {id, codigo, estado} }`
  (`error` cuando Wompi devolvió `ERROR`; `rechazado` para DECLINED/VOIDED).
- 409 `MONTO_NO_COINCIDE` `{reembolso, referencia}`; 409 `RESERVA_VENCIDA` `{estado_pago:'aprobado_tarde', reembolso: 'aprobado'|'pendiente'|'rechazado', referencia}`;
  502 `WOMPI_NO_DISPONIBLE` / `WOMPI_NO_AUTORIZADO`.
- `metodo` sale de `metodo_pago_desde_wompi`: CARD→tarjeta, PSE→pse, NEQUI→nequi, DAVIPLATA→daviplata,
  BANCOLOMBIA_TRANSFER/QR/COLLECT→bancolombia, resto→otro.

### 5.3 `reservas-cancelar` (`supabase/functions/reservas-cancelar/index.ts`)

- Request `{ booking_id: uuid }`.
- SQL `cancelar_reserva(p_booking_id, p_viajero_id)` (versión 0008): `RESERVA_NO_EXISTE`, `NO_ES_DUENO`;
  si ya `cancelada` y tiene refund de cancelación → idempotente (reanuda reembolso); si ya cancelada sin refund o
  estado ≠ pendiente_pago/confirmada → `ESTADO_INVALIDO`; si `salida_at ≤ now` → `RESERVA_YA_SALIO`. Libera cupos,
  expira intentos pendientes, crea refund según `reembolso_por_politica` (ver 5.5). Si el refund queda
  `pendiente` y tiene id, la función pide el reembolso a Wompi (`procesarReembolso`; si Wompi cae, queda pendiente).
- Response 200: `{ estado: 'cancelada', reembolso: { aplica: bool, porcentaje: int, monto: number, estado: 'aprobado'|'pendiente'|'rechazado'|'no_aplica', motivo: string } }`.

### 5.4 `pagos-webhook` (NO lo llama la app)

Wompi → `transaction.updated` / `refund.updated`, autenticado por `X-Event-Checksum` (`verify_jwt = false`).
Re‑consulta la transacción a Wompi y aplica `aplicar_resultado_pago` (idempotente). Responde 200 a lo ignorado.

### 5.5 RPC SQL que llama directamente la app (con el JWT del viajero)

| RPC | Firma | Devuelve | Errores (`raise exception`) |
|---|---|---|---|
| `create_booking` | `(p_plan_date_id uuid, p_pax int)` | json `{booking_id, codigo, monto_total, plan_titulo, fecha, cupos_restantes}` | `NO_AUTENTICADO`, `PAX_INVALIDO` (1–20), `RESERVA_PENDIENTE_EXISTENTE` (detail = id), `FECHA_NO_EXISTE`, `PLAN_NO_PUBLICADO`, `AGENCIA_NO_HABILITADA`, `FECHA_PASADA` (fecha < hoy Bogotá), `FECHA_YA_SALIO` (fecha+hora_salida Bogotá ≤ now), `SIN_CUPO`. Código `'DIV-' + 8 hex mayúsculas`; `monto_total = precio_cop * pax`; decremento atómico de cupo + advisory lock por viajero/fecha. Versión vigente: `0012_reservar_antes_de_salir.sql`. |
| `vista_previa_cancelacion` | `(p_booking_id uuid)` | json `{booking_id, horas_antes, aplica, porcentaje, monto, motivo}` | `RESERVA_NO_EXISTE`, `NO_ES_DUENO`, `RESERVA_YA_SALIO` (0008) |
| `agencias_publicas` | `(p_agency_id uuid default null)` | tabla `{id, nombre, ciudad, descripcion, logo_url, planes_count, rating (null sin reseñas, ponderado por reseñas, 2 dec.), reviews_total, portada_url}` ordenada por nombre; solo agencias habilitadas con ≥1 plan publicado (0009) | — |
| `consentimientos_pendientes` | `()` | `consent_type[]` | — |
| `registrar_consentimiento` | `(p_tipo consent_type, p_version text, p_origen text default 'app')` | void | `NO_AUTENTICADO`, `VERSION_DESACTUALIZADA` |

Política de reembolso (`reembolso_por_politica`, versión 0007), usada por la vista previa y la cancelación,
con la política **congelada en la reserva** (`bookings.politica_*`, 0005):
- `horas_antes = trunc((salida_at - now) en horas, 2)` (truncado, no redondeado).
- `pendiente_pago` o sin pago aprobado → `0 %`, `aplica=false`, «Reserva sin pago confirmado: no hay nada que reembolsar».
- restante ≥ `politica_horas_gratuita` → 100 %, monto = pago.monto.
- si hay tramo parcial y restante ≥ `politica_horas_parcial` → `politica_porcentaje_parcial` %.
- si no → 0 %, sin reembolso.

### 5.6 Superficie de tablas que toca la app (vía PostgREST con JWT)

`plans` (+`agencies`, `plan_dates` embebidos), `bookings` (+`plan_dates`→`plans`→`agencies`, `payments`,
`refunds` con columnas explícitas), `reviews` (+`profiles(nombre)`), `profiles`. Escrituras directas: **solo**
`insert` en `reviews`. Todo lo demás es RPC o Edge Function.

Otras tablas/RPC del esquema que la app viajero NO usa (panel o servidor): `agency_sales` (vista),
`agency_verification_log`, `consents` (solo vía RPC/trigger), `payment_attempts` (solo service_role),
`agency_payout_accounts`, `cuentas_dispersion_resumen`, `liquidaciones`, `liquidacion_items`, RPC de dispersión
(`servicios_prestados`, `generar_liquidaciones`, `generar_anticipos`, `ejecutar_liquidacion`, …),
`quienes_van`, `resenas_recientes_agencia`, `resenas_agencia`, `agencia_habilitada` (interna), Storage
`plan-photos` / `agency-logos` (escritura del panel).

Cron (`pg_cron`, si está disponible): `expirar-reservas-pendientes` `*/5 * * * *` → `expire_stale_bookings()`
(cancela `pendiente_pago` con >30 min y libera cupos); `liquidacion-semanal` lunes 11:00 UTC;
`anticipos-por-hora`. Entre la expiración lógica (30 min) y la del cron hay hasta 5 min de margen.

---

## 6. Tests del núcleo (`packages/diverso_core/test/`)

| Archivo | Cubre |
|---|---|
| `comparison/comparacion_nueva_test.dart` (2) | `Plan.esNuevo` con promedio 0; comparador dice «Nueva» y conserva el formato `x.x ★ (n)` |
| `data/repositories/booking_repository_test.dart` (21) | `crearReserva` (mapeo, nulos, PostgREST→código, `RESERVA_PENDIENTE_EXISTENTE` con id, no‑PostgREST→`ERROR_INESPERADO`); `misReservas` (sin sesión no consulta, sin reservas no pide reseñas, marca reseñadas y respeta orden); `reserva` por id (marca reseña, `RESERVA_NO_EXISTE` no se convierte); `reservaPendiente` (ventana 30 min en UTC, primera fila); `vistaPreviaCancelacion`; `cancelar` (cuerpo, estados aprobado/pendiente/rechazado/no_aplica, `ESTADO_INVALIDO`) |
| `data/repositories/catalog_repository_test.dart` (13) | `search`: desde = hoy Bogotá, orden por defecto, texto normalizado, filtros pasan tal cual, destino vacío no filtra, fecha `YYYY-MM-DD`; filtro de fecha en cliente («bug L»: salida ya partida hoy no cuenta); `agencias`, `agenciaConPlanes` (null / ambos filtrados por id), `planDetalle` desde hoy, `destinos` únicos y ordenados |
| `data/repositories/payment_gateway_test.dart` (15) | `iniciar`: cuerpo, parseo, `RESERVA_VENCIDA`, `REDIRECT_NO_PERMITIDO`/`NO_ES_DUENO`/`ESTADO_INVALIDO`/`RESERVA_NO_EXISTE`/`NO_AUTENTICADO` con mensaje propio, `SOLO_MODO_PRUEBA`, sin red → `SIN_CONEXION`. `verificar`: cuerpo con **una sola clave**, exactamente uno (ArgumentError), rechazado/error son resultados, métodos bancolombia/otro/pse, `MONTO_NO_COINCIDE`, aprobación tardía (texto con estado del reembolso), `WOMPI_NO_DISPONIBLE/AUTORIZADO`, 500 sin filtrar detalles |
| `data/services/catalog_api_test.dart` (2) | Query string real contra un `HttpServer` local: `!inner` + doble filtro de fecha + `limit=60` con día; sin día `plan_dates(*)` opcional |
| `errors/diverso_exception_test.dart` (3) | `fromPostgrest`: `RESERVA_PENDIENTE_EXISTENTE` con id, `RESERVA_YA_SALIO`, preservación de códigos anteriores |
| `legal/legal_test.dart` (5) | `kVersionLegal == 'v2-2026-10'`; política cita la versión; ningún documento dice «simulad»; viajeros: Wompi modo de prueba sin dinero real; agencias: dispersión de prueba |
| `models/agencia_resumen_test.dart` (12) | `fromMap` (nulos, int→double), «Nueva», 1 decimal, singular de planes, `iniciales`, `ordenarAgencias` (3 criterios, tildes, no muta), labels |
| `models/booking_salida_test.dart` (21) | `esFutura`, `vigente`, `puedeResenar` con bordes ±1 min y «exactamente ahora»; fallback a fecha del plan; `fromMap` de `salida_at` con zona; `conResena` conserva `salidaAt` |
| `models/enums_bd_test.dart` (4 + generados) | Cada enum reconoce todos los valores de la BD y escribe lo que lee; desconocido → default; `PagoVerificado` con `pendiente_pago` |
| `models/reembolso_pago_test.dart` (3) | `VistaPreviaCancelacion.fromMap`; `Payment`/`Refund` con columnas explícitas; «Sin reembolso» solo si hubo pago |
| `models/salida_plan_test.dart` (16) | `fechasDisponiblesA` (±1 min, hora de Bogotá vs UTC, mañana/ayer, orden, sin cupos), `yaSalio`, `salidaDe` (22:00 Bogotá = 03:00 UTC día siguiente), `ahora` local vs UTC, 00:00 Bogotá, `tieneSalidaEl`, `hora_salida` HH:MM:SS / HH:MM / null→06:00, mensajes `FECHA_YA_SALIO`/`RESERVA_YA_SALIO` |
| `ui/diverso_logo_test.dart` (4) | Asset teñido con color/tamaño; default blanco 48; ya no usa CustomPainter; el asset existe y es 1024 px |
| `ui/logo_golden_test.dart` (2) | Goldens `goldens/logo_marca.png` y `goldens/logo_icono.png` |
| `utils/busqueda_test.dart` (5) | tildes/diéresis/eñes, ASCII intacto, espacios, comodines → espacio, comas/paréntesis se conservan |
| `utils/hora_bogota_test.dart` (5) | 21:00 Bogotá sigue siendo hoy; cambio a las 00:00 Bogotá (05:00 UTC); UTC vs local da igual; reloj real |
| `support/edge_functions_falsas.dart` | Fake de `EdgeFunctionsApi`: registra `(funcion, cuerpo)` y devuelve/lanza lo programado |

Además, el backend tiene sus propias pruebas que **no** dependen de Flutter: `supabase/tests/*.sql` (psql),
`supabase/functions/_tests/vectores_wompi.test.ts` y `_tests/test_pagos.py` (+ `mock_wompi.py`).

---

## 7. ¿Qué usa el panel de este paquete?

- `apps/panel_svelte` **no importa** `diverso_core` (es SvelteKit/TS; no hay dependencia de paquete). El único
  `pubspec.yaml` que lo declara es `apps/viajero/pubspec.yaml` (`path: ../../packages/diverso_core`).
- **Pero hay acoplamiento por archivos en los tests del panel** **[hallazgo]**:
  - `apps/panel_svelte/tests/unit/features/legal/model/legal.test.ts` lee
    `packages/diverso_core/lib/legal/documento_legal.dart` y exige que contenga
    `const String kVersionLegal = '<VERSION_LEGAL>';` y los párrafos de «5. Pagos…» (viajeros) y «3. Comisión y
    pagos» (agencias). También extrae la versión SQL de la última migración.
  - `apps/panel_svelte/tests/unit/shared/ui/Logo.test.ts` compara byte a byte `static/logo_diverso.png` con
    `packages/diverso_core/assets/logo_diverso.png`.
  - `tools/iconos/generar_iconos.py` usa el asset como fuente de íconos.
  → Si se borra o mueve `packages/diverso_core`, **se rompen los tests del panel**. Hay que redirigirlos al nuevo
  archivo TS (p. ej. `packages/core-ts/src/legal.ts`) en el mismo cambio.
- Restos del panel Flutter antiguo dentro del núcleo que la app viajero no usa: `PlanDate.toInsertMap()`,
  `ItinerarioPaso.toMap()`, `documento terminosAgencias` (se muestra si la UI lo lista vía `todos`), campos de
  `Agency` como `comisionPct`, `ownerUserId`, `numeroRnt`; mensaje `AGENCIA_NO_VERIFICADA` («…para publicar
  planes»). Se pueden portar igual por fidelidad, o podar con decisión explícita.
- Símbolos del núcleo que la app usa solo indirectamente (vía repos): `fechaToIso`, `hoyBogota`,
  `normalizarBusqueda`, `tieneSalidaEl`, `salidaDe`, `CreatedBooking`.

---

## 8. Gotchas no obvios

1. **[hallazgo — bug existente]** `BookingApi._seleccionReserva` embebe la agencia con alias
   `agency:agencies(*)`, pero `Plan.fromMap` lee `map['agencies']`. Resultado: en reservas, `booking.plan.agency`
   es **siempre null** (`tarjeta_reserva.dart:39` y `detalle_reserva.dart:44` nunca muestran el nombre de la
   agencia). En el port: leer `agency ?? agencies`, o quitar el alias. Decidir si se corrige (cambia la UI) o se
   replica.
2. **[hallazgo]** `ReviewRepository.porPlan` pide `profiles(nombre)`, pero RLS `profiles_select_own` solo deja
   ver la fila propia: para reseñas de otros, `viajeroNombre` llega **null**. La UI debe tener fallback (y el
   port no debe «arreglarlo» abriendo `profiles`; el patrón del backend para nombres ajenos es
   `nombre_corto_viajero` vía RPC security definer).
3. **`verificar` debe omitir la clave ausente**: `{'transaction_id': ?x}` en Dart no envía la clave. En TS,
   `{transaction_id: undefined}` se elimina con `JSON.stringify`, pero `null` no → el servidor responde
   `400 SOLICITUD_INVALIDA`.
4. **Errores de Edge Functions en supabase-js**: `functions.invoke` no lanza; devuelve `{data, error}`. En un
   no‑2xx, `error` es `FunctionsHttpError` y el cuerpo `{error, mensaje,…}` hay que leerlo con
   `await error.context.json()`; `FunctionsFetchError`/`FunctionsRelayError` = red → mapear a `SIN_CONEXION`
   (en Dart era `status == 0`). Replicar el orden de `fromFunction`.
5. **Errores PostgREST en supabase-js** tampoco lanzan: `{data, error}` con `error.message`/`error.details`/
   `error.code`. `RESERVA_PENDIENTE_EXISTENTE` trae el id en `details`. `.single()` sin filas da `PGRST116`
   (en `currentProfile`/`planDetalle` hoy sale como excepción cruda).
6. **Repos que no traducen errores** (hoy la UI recibe la excepción cruda): `CatalogRepository` (todo),
   `BookingRepository.misReservas`, `ReviewRepository.porPlan`, `AuthRepository` (todo: `AuthException`
   de GoTrue). Mantener el contrato o decidir unificarlo, pero saberlo.
7. **Catálogo solo para autenticados**: todas las políticas SELECT de `plans`, `plan_dates`, `agencies`,
   `reviews` son `to authenticated`, y `agencias_publicas` está revocada a `anon`. Sin sesión no hay catálogo.
8. **Filtro sobre embebidos**: `.gte('plan_dates.fecha', desde)` sin `!inner` filtra las fechas, no los
   planes (salen planes sin fechas futuras). Con día elegido se cambia a `!inner`. En supabase-js el orden
   embebido es `.order('fecha', {ascending: true, referencedTable: 'plan_dates'})`.
9. **Fechas**: `plan_dates.fecha` (`date`) se parsea como medianoche **local**; `new Date('2026-11-02')` en JS es
   medianoche **UTC** (en Bogotá cae el día anterior). Hay que parsear `YYYY-MM-DD` a mano. Toda la lógica de
   «ya salió» usa `salidaDe` = UTC(y,m,d) + hora_salida + 5 h. `hoyBogota` usa UTC‑5 fijo.
10. **`Booking.salida` fallback** es `planDate.fecha` a medianoche local (sin hora de salida); solo afecta a
    reservas sin `salida_at`, que en BD es `NOT NULL` desde 0005 (el fallback es defensivo).
11. **Intl en Hermes**: `formatCOP` y las fechas dependen de `intl` de Dart con locale `es`
    (`initializeDateFormatting('es')`). `Intl.DateTimeFormat('es')` de JS puede producir abreviaturas
    distintas (puntos, «sept», mayúsculas). Recomendado: tablas propias de días/meses y tests de paridad con
    las salidas Dart («sáb, 3 oct», «sábado 3 de octubre de 2026», «$ 165.000»).
12. **Orden de cadenas**: Dart `compareTo`/`sort()` ordena por unidades UTF‑16 (no por locale). `ordenarAgencias`
    ya normaliza tildes; `destinos()` no (p. ej. «Ánimas» quedaría al final). Usar comparación por código,
    no `localeCompare`, para paridad.
13. **Retorno de Wompi en móvil**: la app no usa deep link; un WebView interno intercepta
    `https://diverso.app/pago/resultado?id=…` (`apps/viajero/lib/ui/features/checkout/pago_wompi.dart`). En Expo:
    `react-native-webview` + `onShouldStartLoadWithRequest`. Un esquema propio (`diverso://…`) **no sirve** sin
    cambiar backend: `PAGOS_REDIRECT_ALLOWLIST` solo admite http(s).
14. **Expo web y la allowlist**: en web la app usa `<origin>/pago/resultado` (misma ventana). La allowlist por
    defecto incluye `localhost:8080` y `:3000`, **no `:8081`** (puerto por defecto de Expo web/Metro) →
    `REDIRECT_NO_PERMITIDO`. Añadir el origen a `PAGOS_REDIRECT_ALLOWLIST` o fijar el puerto.
15. **Versión legal triplicada** (`kVersionLegal`, `legal.ts` del panel, SQL). Si el texto cambia hay que subir
    las tres; si el cliente manda otra versión, el registro no guarda consentimientos **sin error**.
16. **Retención de 30 min duplicada** (cliente `Booking.retencion`, SQL `create_booking`, `crear_intento_pago`,
    `expire_stale_bookings`, textos de mensajes).
17. **`onAuthStateChanged` emite en cada evento** (incluido refresh de token) el mismo id: el router se
    refresca de más; en RN conviene `distinctUntilChanged` o filtrar por evento, pero sin perder `SIGNED_OUT`.
18. **Sesión en RN**: supabase-js necesita `storage` (AsyncStorage o SecureStore — ojo con el límite de 2 KB de
    SecureStore para el JWT), `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`, y
    `startAutoRefresh/stopAutoRefresh` según `AppState`. `supabase_flutter` lo hacía solo.
19. **URLs de Storage absolutas**: `fotos` del seed son de `picsum.photos`, pero los logos subidos por el panel
    se guardan como URL pública absoluta con el host de la API (`127.0.0.1:54331` en local) → en el emulador
    Android no cargan sin reescribir host (`10.0.2.2`).
20. **`refunds` sin `*`**: cualquier `select('*')` o `refunds(*)` sobre `refunds` responde 403 (columna `raw`
    no concedida). Usar `Refund.columnas` siempre.
21. **Pagos en sandbox**: todos los textos dicen «de prueba»; `Payment.textoReferencia` siempre añade «(prueba)».
    Un cambio a producción toca textos de modelos, mensajes y legales.
22. **Dos resultados de verificación que son excepción**: `MONTO_NO_COINCIDE` y `RESERVA_VENCIDA` con
    `estado_pago: 'aprobado_tarde'` llegan como 409 y su mensaje depende de `detalle.reembolso`.
23. **El código `DIV-XXXXXXXX`** y la referencia `DIV-XXXXXXXX-n` los genera el servidor; el cliente nunca los arma.
24. **Migraciones 0014 y 0017 no existen** (solo sus tests SQL en `supabase/tests/`): son pruebas de reglas sin
    migración nueva; no es un hueco.
