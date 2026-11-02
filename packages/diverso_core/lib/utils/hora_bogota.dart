/// Bogotá es UTC-5 todo el año (Colombia no tiene horario de verano). El servidor interpreta
/// `plan_dates.fecha` + `plans.hora_salida` en esta zona (`at time zone 'America/Bogota'`).
const offsetBogota = Duration(hours: 5);

/// La fecha de hoy en Bogotá (sin hora), con [ahora] como reloj (por defecto, el real). De 19:00 a 24:00
/// en Bogotá el reloj UTC ya marca el día siguiente: por eso no se usa la fecha del teléfono ni la UTC.
DateTime hoyBogota([DateTime? ahora]) {
  final bogota = (ahora ?? DateTime.now()).toUtc().subtract(offsetBogota);
  return DateTime(bogota.year, bogota.month, bogota.day);
}
