# Consultas de métricas

Consultas SQL versionadas junto al código, como declara el Anexo 8 (tabla 19,
criterio «Fiabilidad»). Cada archivo es una sola sentencia `select` de solo
lectura, con un encabezado que explica qué mide y de qué fila del Anexo 8
sale. Los meses se cortan en hora de Bogotá, salvo la métrica Norte, que
agrupa por la fecha del plan (`date`).

| Archivo | Métrica | Anexo 8 |
| --- | --- | --- |
| `metrica_norte.sql` | Viajes realizados por mes, viajeros, GMV y comisión | §5.3 (consulta tal cual) · tabla 21, fila «Métrica Norte» |
| `reservas_pagadas_a_tiempo.sql` | Reservas pagadas en menos de 30 minutos | tabla 18, R6 (meta ≥ 85 %) |
| `sobreventas.sql` | Fechas con más viajeros que cupos | tabla 18, R16 (meta 0) |
| `agencias_activas_mes.sql` | Agencias que vendieron en el mes / vinculadas | tabla 18, R11 (meta ≥ 70 %) |
| `contribucion_por_compra.sql` | (Comisión − costo de pasarela) por compra pagada | tabla 18, R10 (meta ≥ 16.200 pesos) |
| `gmv_mensual.sql` | GMV de las reservas pagadas por mes de venta | tabla 18, R9 (meta ≥ 37,8 millones) |
| `primera_reserva_30_dias.sql` | Registrados que reservan en sus primeros 30 días | tabla 18, R5 (meta ≥ 25 %) |

Las demás métricas de la tabla 18 todavía no se pueden calcular con el
esquema actual (origen del registro, código de referido, NPS, costos de
adquisición) o dependen de datos externos (pauta, entrevistas).

## Cómo ejecutarlas (solo lectura, base local)

```bash
(echo 'begin read only;'; cat supabase/metricas/metrica_norte.sql; echo 'rollback;') \
  | docker exec -i supabase_db_diverso-app psql -U postgres
```

La transacción `read only` hace que el motor rechace cualquier escritura, y
el `rollback` final la cierra sin dejar rastro.
