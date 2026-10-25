-- =====================================================================
-- GMV mensual, por mes de la venta
--
-- Qué mide: el valor bruto de las reservas pagadas (confirmada o
-- completada) vendidas en el mes, sin importar cuándo es la salida. Se
-- diferencia de la métrica Norte, que agrupa por el mes del viaje y solo
-- cuenta fechas ya ocurridas.
--   reservas = reservas pagadas, viajeros = sum(pax),
--   gmv = sum(monto_total).
--
-- Fuente: Anexo 8, tabla 18, fila R9 (Ingresos · GMV mensual): meta
-- ≥ 37,8 millones al mes con 10 a 15 agencias, línea base 1,37 millones en
-- 10 días con 3 agencias. Los meses se cortan en hora de Bogotá.
--
-- Uso (solo lectura, base local):
--   (echo 'begin read only;'; cat supabase/metricas/gmv_mensual.sql; echo 'rollback;') \
--     | docker exec -i supabase_db_diverso-app psql -U postgres
-- =====================================================================

select to_char(date_trunc('month', b.created_at at time zone 'America/Bogota'), 'YYYY-MM') as mes,
       count(*)                                                                             as reservas,
       sum(b.pax)                                                                           as viajeros,
       sum(b.monto_total)                                                                   as gmv,
       sum(b.monto_total) >= 37800000                                                       as cumple_meta
  from public.bookings b
 where b.estado in ('confirmada', 'completada')
 group by 1
 order by 1;
