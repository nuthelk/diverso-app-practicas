# Panel de agencias profesional (apps/panel_svelte)

Pulido visual y de experiencia de todo el panel, menú de cuenta único con tema Sistema/Claro/Oscuro y filtro por fecha en el Resumen.
Rama `refactor/arquitectura-panel-svelte` (worktree `.worktrees/panel-svelte`); los artboards viven en `apps/panel_svelte/design/` de la carpeta principal porque el canvas lee esa carpeta.

## Specs

- S1 Pedido: «bueno con el nuevo diseño que tenemos quiero que sea un poco mas profesional y que tenga muy buena experiencia de usuario ademas hay opciones como el cambio de modo claro a oscuro que se repite dos veces innecesariamente»
- S2 Dirección: «Direcciones en el canvas primero (Recomendado)» — «Diseño 3 versiones del Shell + Resumen como artboards que ves en el navegador, todas con el azul Diverso. Elegís una y la aplico a todo el panel. Evita rehacer trabajo si no te convence.»
- S3 Tema: «Sistema / Claro / Oscuro en el menú de cuenta (Recomendado)» — «Un solo lugar, igual que la app del viajero; arranca siguiendo el tema del sistema operativo.»
- S4 Login demo: «Solo en desarrollo (Recomendado)» — «Se muestran con npm run dev y no en el build publicado.»
- S5 Alcance: «si todo por etapas» sobre «Todo el panel por etapas (Recomendado)» — «Primero la base (componentes y Shell), después las pantallas por grupos, un commit por etapa. Incluye admin, login y legales.»
- S6 Filtro por fecha: «una cosa mas necesito que en el resumen se vea un icono de fecha para filtrar por fecha y que en la seleccion de fechas se vea que dias o semanas hay actividad»

## Tasks

- T1 [ ] Sync del sistema de diseño y 3 direcciones de Shell + Resumen (con el filtro de fecha) en el canvas — S1, S2, S3, S6 — worker + parent — commit: —
- T2 [ ] El usuario elige dirección en el canvas — S2 — usuario — commit: —
- T3 [ ] Base: tokens y escala tipográfica de la dirección elegida, componentes compartidos (botón, tarjeta, encabezado de página, métrica, tabla, chips) — S1, S5 — por definir — commit: pendiente
- T4 [ ] Shell: un solo menú de cuenta, tema Sistema/Claro/Oscuro que sigue al sistema, sin secciones repetidas en móvil — S1, S3 — por definir — commit: pendiente
- T5 [ ] Resumen con filtro por fecha y calendario que marca días y semanas con actividad — S6 — por definir — commit: pendiente
- T6 [ ] Planes y formulario del plan — S1, S5 — por definir — commit: pendiente
- T7 [ ] Ventas, Liquidaciones, detalle y Cuenta para dispersiones — S1, S5 — por definir — commit: pendiente
- T8 [ ] Admin: agencias y dispersiones — S1, S5 — por definir — commit: pendiente
- T9 [ ] Login (credenciales solo en desarrollo), Starter, Onboarding, Legal, consentimiento y error — S1, S4, S5 — por definir — commit: pendiente
- T10 [ ] Guía y README al día — S5 — por definir — commit: pendiente
- T11 [ ] Verificación final: tests, build, check y revisión en el navegador — S1–S6 — parent — commit: —

## Log

- L1 (usuario): «bueno con el nuevo diseño que tenemos quiero que sea un poco mas profesional y que tenga muy buena experiencia de usuario ademas hay opciones como el cambio de modo claro a oscuro que se repite dos veces innecesariamente»
- L2 (usuario, cuestionario): Dirección → «Direcciones en el canvas primero (Recomendado)»; Tema → «Sistema / Claro / Oscuro en el menú de cuenta (Recomendado)»; Login demo → «Solo en desarrollo (Recomendado)»; Alcance → «si todo por etapas, una cosa mas necesito que en el resumen se vea un icono de fecha para filtrar por fecha y que en la seleccion de fechas se vea que dias o semanas hay actividad».
- L3 (evidencia, explorador): el tema se cambia en un solo lugar del código (`Shell.svelte:48`), pero el snippet `pieMenu` (Términos, Modo oscuro, Cerrar sesión) se dibuja en la barra lateral y en el menú móvil; en móvil con el menú abierto las 5 secciones salen en el menú y en la barra inferior; en el Resumen el nombre y el estado de la agencia aparecen 2–3 veces. Sistema visual sin componentes compartidos: ~19 tamaños de letra a mano, 6 radios, `.tarjeta`/`.btn`/`.campo` copiados con variantes, emojis en botones y vacíos, `text-slate-400` con contraste bajo. UX: Publicar sin confirmación, «Volver» de Legal con `history.back()` en pestaña nueva, Select de Cuenta sin etiqueta asociada, `alertdialog` sin manejo de foco, credenciales demo en el login, `+error` con mensaje crudo y enlace a `#/dashboard` sin sesión.
- L4 (contexto): `odd/tasks/rediseno-panel-agencias.md` (carpeta principal, rama de viajero) tiene T3–T7 pendientes del rediseño pantalla por pantalla; esta feature las cubre sobre la estructura nueva. No se toca ese archivo desde aquí.
- L5 (datos): `VentaRow.fecha` es la fecha del viaje (ver rediseño L3) y `plan_dates.fecha` la de cada salida: «actividad» de un día = salidas con reservas o ventas de viajes ese día.
