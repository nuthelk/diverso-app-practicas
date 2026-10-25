-- =====================================================================
-- Primera reserva en 30 días, por mes de registro
--
-- Qué mide: de los viajeros registrados en el mes, cuántos hicieron al
-- menos una reserva (de cualquier estado) dentro de los 30 días siguientes
-- a su registro. Solo cuenta perfiles con rol «viajero», y solo es
-- concluyente para los registros con 30 días o más de antigüedad.
--   registrados = viajeros registrados en el mes,
--   con_reserva_30d = los que reservaron dentro de la ventana,
--   pct_activados = con_reserva_30d / registrados.
--
-- Fuente: Anexo 8, tabla 18, fila R5 (Activación · Primera reserva en 30
-- días): meta ≥ 25 %, línea base 7 de 8 en el piloto (muestra invitada).
-- Los meses se cortan en hora de Bogotá.
--
-- Uso (solo lectura, base local):
--   (echo 'begin read only;'; cat supabase/metricas/primera_reserva_30_dias.sql; echo 'rollback;') \
--     | docker exec -i supabase_db_diverso-app psql -U postgres
-- =====================================================================

select to_char(date_trunc('month', pf.created_at at time zone 'America/Bogota'), 'YYYY-MM') as mes_registro,
       count(*)                                                                               as registrados,
       count(*) filter (where exists (
             select 1
               from public.bookings b
              where b.viajero_id = pf.id
                and b.created_at >= pf.created_at
                and b.created_at <  pf.created_at + interval '30 days'
       ))                                                                                     as con_reserva_30d,
       round(100.0 * count(*) filter (where exists (
             select 1
               from public.bookings b
              where b.viajero_id = pf.id
                and b.created_at >= pf.created_at
                and b.created_at <  pf.created_at + interval '30 days'
       )) / count(*), 1)                                                                      as pct_activados
  from public.profiles pf
 where pf.rol = 'viajero'
 group by 1
 order by 1;
