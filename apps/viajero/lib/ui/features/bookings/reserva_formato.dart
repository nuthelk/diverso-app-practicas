import 'package:diverso_core/diverso_core.dart';
import 'package:intl/intl.dart';

/// «lun 27 oct · 06:00». Sin la hora si la reserva no tiene `salidaAt` (solo se conoce el día de
/// la fecha del plan); null si no hay ninguna salida conocida.
String? textoSalida(Booking b) {
  final salida = b.salida?.toLocal();
  if (salida == null) return null;
  final dia = DateFormat('EEE d MMM', 'es').format(salida);
  return b.salidaAt == null ? dia : '$dia · ${DateFormat('HH:mm').format(salida)}';
}

/// Tiempo que falta para salir: «Hoy», «Mañana» o «en N días» (por día de calendario, no por
/// bloques de 24 h). Null si el viaje ya salió, no tiene salida o la reserva está cancelada.
String? cuentaRegresiva(Booking b, [DateTime? ahora]) {
  final ahoraLocal = ahora ?? DateTime.now();
  if (b.estado == BookingStatus.cancelada || !b.esFutura(ahoraLocal)) return null;
  final salida = b.salida!.toLocal();
  final dias = DateTime.utc(
    salida.year,
    salida.month,
    salida.day,
  ).difference(DateTime.utc(ahoraLocal.year, ahoraLocal.month, ahoraLocal.day)).inDays;
  return switch (dias) {
    0 => 'Hoy',
    1 => 'Mañana',
    _ => 'en $dias días',
  };
}

String textoPersonas(int pax) => pax == 1 ? '1 persona' : '$pax personas';
