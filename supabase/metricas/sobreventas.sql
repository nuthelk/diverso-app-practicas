-- =====================================================================
-- Sobreventas: fechas con más viajeros reservados que cupos
--
-- Qué mide: por cada fecha de plan, suma los viajeros de las reservas que
-- ocupan cupo (pendiente_pago, confirmada o completada) y la compara con
-- cupo_total. Una sobreventa es una fecha con más viajeros que cupos.
--   fechas_con_reservas  = fechas que tienen al menos un viajero,
--   fechas_sobrevendidas = fechas con viajeros > cupo_total (meta: 0),
--   cupos_en_exceso      = suma de lo que excede, en viajeros.
-- Si la columna fechas_sobrevendidas no es 0, hay que revisar de inmediato
-- el procedimiento de reserva (RPC create_booking).
--
-- Fuente: Anexo 8, tabla 18, fila R16 (Control · Sobreventas): meta 0,
-- línea base 0 en 11 reservas; y tabla 21, fila «Sobreventas = 0».
--
-- Uso (solo lectura, base local):
--   (echo 'begin read only;'; cat supabase/metricas/sobreventas.sql; echo 'rollback;') \
--     | docker exec -i supabase_db_diverso-app psql -U postgres
-- =====================================================================

with ocupacion as (
  select pd.id,
         pd.cupo_total,
         coalesce(sum(b.pax) filter (where b.estado in ('pendiente_pago', 'confirmada', 'completada')), 0) as pax_ocupados
    from public.plan_dates pd
    left join public.bookings b on b.plan_date_id = pd.id
   group by pd.id, pd.cupo_total
)
select count(*) filter (where pax_ocupados > 0)                              as fechas_con_reservas,
       count(*) filter (where pax_ocupados > cupo_total)                     as fechas_sobrevendidas,
       coalesce(sum(pax_ocupados - cupo_total) filter (where pax_ocupados > cupo_total), 0) as cupos_en_exceso
  from ocupacion;
