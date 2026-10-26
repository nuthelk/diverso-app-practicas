# Rediseño del panel de agencias (apps/panel_svelte)

Rediseño pantalla por pantalla del panel web Svelte de agencias, empezando por el Resumen.
Rama `feat/rediseno-panel-agencias` (sale de `feat/rediseno-viajero`). Un commit por pantalla.

## Specs

- S1 Alcance: «rediseñar toda la app de agencias» = el panel web Svelte (`apps/panel_svelte`), no el Flutter legado.
- S2 Problema a resolver: «el resumen esta super mal, dificil de entender para la agencia».
- S3 Resumen: «Lo urgente arriba, la plata abajo». Boceto aprobado:
  ```
  Hola, EcoAndes
  ⚠ 1 aviso: RNT vence en 20 días

  PRÓXIMAS SALIDAS
  Mañana · Guatapé — 12 personas · 4 cupos libres
  Sáb 1 nov · Río Claro — 6 personas · 10 libres

  ESTE MES (octubre)
  Vendiste        $ 4.200.000
  Comisión 12%   − $ 504.000
  Te corresponde  $ 3.696.000
  Próximo pago: lun 3 nov · $ 820.000
  ```
  Las próximas salidas van en orden de fecha. «Este mes» se calcula por fecha del viaje y se rotula así (ver L3). «Próximo pago» sale de las liquidaciones pendientes; si no hay, lo dice en lenguaje simple. El logo sale del Resumen.
- S4 Avance: «Pantalla por pantalla»: «Empiezo por el Resumen, lo ves en el navegador y sigo con Planes, Ventas, Liquidaciones, Cuenta y Admin. Un commit por pantalla.»
- S5 Estilo: «Misma identidad, más orden»: «Mantiene el azul Diverso y el modo oscuro. Mejora la jerarquía, los textos en lenguaje simple y la consistencia entre pantallas.»

## Tasks

- T1 [ ] Resumen (`Dashboard.svelte`) — S2, S3, S5 — worker — commit: pendiente
- T2 [ ] Revisión del Resumen por el usuario en el navegador — S4 — usuario — commit: —
- T3 [ ] Planes (lista y formulario) — S5 — por definir — commit: pendiente
- T4 [ ] Ventas — S5 — por definir — commit: pendiente
- T5 [ ] Liquidaciones y su detalle — S5 — por definir — commit: pendiente
- T6 [ ] Cuenta para dispersiones (y dónde vive el logo) — S5 — por definir — commit: pendiente
- T7 [ ] Admin y Admin dispersiones — S5 — por definir — commit: pendiente

## Log

- L1 (usuario): «haz commit, ahora puedes rediseñar toda la app de agencias? el resumen esta super mal, dificil de entender para la agencia»
- L2 (usuario, cuestionario): Panel → «Panel web Svelte (Recomendado)»; Resumen → «Lo urgente arriba, la plata abajo (Recomendado)»; Alcance → «Pantalla por pantalla (Recomendado)»; Estilo → «Misma identidad, más orden (Recomendado)».
- L3 (decisión): `VentaRow` (vista `agency_sales`) trae la fecha del viaje, no la de compra; «Este mes» = viajes del mes, rotulado explícitamente. Usar fecha de compra exigiría cambiar la vista (contrato), fuera de alcance salvo que el usuario lo pida.
- L4 (evidencia): problemas del Resumen actual: métricas sin período («Ventas pagadas», «Tu saldo a recibir» suman todo y no es lo pendiente de cobro), salidas ordenadas por ocupación y no por fecha, cargador de logo en medio, jerga («saldo», «pax», código antes del plan).
- L5 (worker T1): lógica pura en `src/lib/resumen.ts` + componente `AvatarAgencia`; el Resumen carga además `misLiquidaciones` y `cuentasResumen` (ya existen); «Últimas reservas» se reemplaza por un enlace a Ventas. No hay ruta ni canal de soporte para renovar el RNT: ese aviso queda sin botón de acción.
