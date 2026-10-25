-- =====================================================================
-- Reservas pagadas a tiempo, por mes de la reserva
--
-- Qué mide: de todas las reservas creadas en el mes, cuántas tienen un pago
-- aprobado dentro de los 30 minutos siguientes a su creación (la ventana
-- del cupo retenido que libera expire_stale_bookings). Un pago que luego se
-- reembolsó cuenta como pagado a tiempo: el viajero sí pagó dentro de la
-- ventana. Las reservas que vencieron o se cancelaron sin pago cuentan en
-- el denominador.
--   reservas = todas las reservas del mes,
--   pagadas_a_tiempo = con pago aprobado/reembolsado a ≤ 30 min,
--   pct_a_tiempo = pagadas_a_tiempo / reservas.
--
-- Fuente: Anexo 8, tabla 18, fila R6 (Activación · Reservas pagadas a
-- tiempo): meta ≥ 85 %, línea base 10 de 11 (91 %); y tabla 21, fila
-- «Reservas pagadas a tiempo». Los meses se cortan en hora de Bogotá
-- (misma zona horaria para todas las métricas, tabla 19).
--
-- Uso (solo lectura, base local):
--   (echo 'begin read only;'; cat supabase/metricas/reservas_pagadas_a_tiempo.sql; echo 'rollback;') \
--     | docker exec -i supabase_db_diverso-app psql -U postgres
-- =====================================================================

select to_char(date_trunc('month', b.created_at at time zone 'America/Bogota'), 'YYYY-MM') as mes,
       count(*)                                                                             as reservas,
       count(*) filter (where pago.pagado_at <= b.created_at + interval '30 minutes')       as pagadas_a_tiempo,
       round(100.0 * count(*) filter (where pago.pagado_at <= b.created_at + interval '30 minutes')
             / count(*), 1)                                                                 as pct_a_tiempo,
       round(100.0 * count(*) filter (where pago.pagado_at <= b.created_at + interval '30 minutes')
             / count(*), 1) >= 85                                                           as cumple_meta
  from public.bookings b
  left join lateral (
        select min(p.created_at) as pagado_at
          from public.payments p
         where p.booking_id = b.id
           and p.estado in ('aprobado', 'reembolsado')
       ) pago on true
 group by 1
 order by 1;
