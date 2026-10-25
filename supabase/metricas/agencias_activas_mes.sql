-- =====================================================================
-- Agencias activas en el mes
--
-- Qué mide: cuántas agencias vendieron al menos una reserva pagada
-- (confirmada o completada) en el mes, frente al total de agencias
-- vinculadas (verificadas). El mes es el de la venta, no el de la salida.
--   agencias_activas    = agencias con ≥ 1 reserva pagada creada en el mes,
--   agencias_vinculadas = agencias hoy en estado «verificado»,
--   pct_activas         = agencias_activas / agencias_vinculadas.
-- Limitación: el esquema no guarda el historial de vinculación, así que el
-- denominador es el de hoy para todos los meses.
--
-- Fuente: Anexo 8, tabla 18, fila R11 (Oferta · Agencias activas en el
-- mes): meta ≥ 70 %, línea base 3 de 3; y tabla 21, fila «Agencias
-- activas». Los meses se cortan en hora de Bogotá (tabla 19).
--
-- Uso (solo lectura, base local):
--   (echo 'begin read only;'; cat supabase/metricas/agencias_activas_mes.sql; echo 'rollback;') \
--     | docker exec -i supabase_db_diverso-app psql -U postgres
-- =====================================================================

with vinculadas as (
  select count(*) as n
    from public.agencies
   where estado_verificacion = 'verificado'
),
activas as (
  select date_trunc('month', b.created_at at time zone 'America/Bogota') as mes,
         count(distinct p.agency_id)                                      as n
    from public.bookings b
    join public.plan_dates pd on pd.id = b.plan_date_id
    join public.plans p       on p.id  = pd.plan_id
   where b.estado in ('confirmada', 'completada')
   group by 1
)
select to_char(a.mes, 'YYYY-MM')                          as mes,
       a.n                                                as agencias_activas,
       v.n                                                as agencias_vinculadas,
       round(100.0 * a.n / nullif(v.n, 0), 1)             as pct_activas,
       round(100.0 * a.n / nullif(v.n, 0), 1) >= 70       as cumple_meta
  from activas a
 cross join vinculadas v
 order by a.mes;
