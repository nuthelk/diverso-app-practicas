-- =====================================================================
-- Métrica Norte: viajes realizados por mes (más viajeros, GMV y comisión)
--
-- Qué mide: las reservas pagadas (confirmada o completada) cuyo plan ya
-- ocurrió, agrupadas por el mes de la salida. Es la métrica Norte de
-- Diverso App (Croll y Yoskovitz, 2013): captura a la vez el valor para el
-- viajero, para la agencia y para Diverso, que solo cobra su comisión
-- cuando el servicio se presta.
--   viajes_realizados = reservas (count), viajeros = sum(pax),
--   gmv = sum(monto_total), comision = monto_total x comision_pct de cada
--   agencia (refleja la condición de las agencias fundadoras).
--
-- Fuente: Anexo 8, sección 5.3 (Consistencia y relevancia de las métricas),
-- consulta de la métrica Norte; se usa en la tabla 21, fila «Métrica Norte».
-- La consulta es la del Anexo, sin cambios.
--
-- Uso (solo lectura, base local):
--   (echo 'begin read only;'; cat supabase/metricas/metrica_norte.sql; echo 'rollback;') \
--     | docker exec -i supabase_db_diverso-app psql -U postgres
-- =====================================================================

-- Métrica Norte: viajes realizados por mes, viajeros, GMV y comisión
select to_char(date_trunc('month', pd.fecha), 'YYYY-MM') as mes,
       count(*)                                          as viajes_realizados,
       sum(b.pax)                                        as viajeros,
       sum(b.monto_total)                                as gmv,
       round(sum(b.monto_total * a.comision_pct / 100))  as comision
  from public.bookings b
  join public.plan_dates pd on pd.id = b.plan_date_id
  join public.plans p       on p.id  = pd.plan_id
  join public.agencies a    on a.id  = p.agency_id
 where b.estado in ('confirmada', 'completada')
   and pd.fecha < current_date
 group by 1
 order by 1;
