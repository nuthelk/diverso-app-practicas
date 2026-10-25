-- =====================================================================
-- Contribución por compra, por mes de la venta
--
-- Qué mide: lo que le queda a Diverso por cada compra pagada después de
-- descontar el costo de la pasarela: (comisión − costo de pasarela) /
-- compras. Una compra es una reserva pagada (confirmada o completada),
-- sea de 1 o de varios viajeros.
--   comision = monto_total x comision_pct de la agencia / 100,
--   costo_pasarela = monto_total x costo_pasarela_pct / 100.
-- El costo real de la pasarela todavía no se guarda en payments, así que se
-- usa el 3 % supuesto del Informe final; se cambia en el CTE «parametros».
-- (Con el piloto: (164.520 − 41.130) / 5 compras = 24.678 pesos.)
--
-- Fuente: Anexo 8, tabla 18, fila R10 (Ingresos · Contribución por
-- compra): meta ≥ 16.200 pesos, línea base 24.678 (piloto); y tabla 21,
-- fila «Contribución por plan». Los meses se cortan en hora de Bogotá.
--
-- Uso (solo lectura, base local):
--   (echo 'begin read only;'; cat supabase/metricas/contribucion_por_compra.sql; echo 'rollback;') \
--     | docker exec -i supabase_db_diverso-app psql -U postgres
-- =====================================================================

with parametros as (
  select 3.0::numeric as costo_pasarela_pct,   -- supuesto del Informe final
         16200::numeric as meta_cop            -- meta de la tabla 18
),
compras as (
  select date_trunc('month', b.created_at at time zone 'America/Bogota') as mes,
         b.monto_total,
         b.monto_total * a.comision_pct / 100                             as comision
    from public.bookings b
    join public.plan_dates pd on pd.id = b.plan_date_id
    join public.plans p       on p.id  = pd.plan_id
    join public.agencies a    on a.id  = p.agency_id
   where b.estado in ('confirmada', 'completada')
)
select to_char(c.mes, 'YYYY-MM')                                           as mes,
       count(*)                                                            as compras,
       sum(c.monto_total)                                                  as gmv,
       round(sum(c.comision))                                              as comision,
       round(sum(c.monto_total * pr.costo_pasarela_pct / 100))             as costo_pasarela,
       round((sum(c.comision) - sum(c.monto_total * pr.costo_pasarela_pct / 100)) / count(*)) as contribucion_por_compra,
       round((sum(c.comision) - sum(c.monto_total * pr.costo_pasarela_pct / 100)) / count(*)) >= pr.meta_cop as cumple_meta
  from compras c
 cross join parametros pr
 group by c.mes, pr.meta_cop
 order by c.mes;
