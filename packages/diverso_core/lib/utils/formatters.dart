import 'package:intl/intl.dart';

/// Formatea un monto en pesos colombianos: 165000 -> "$ 165.000".
String formatCOP(num monto) {
  final f = NumberFormat('#,##0', 'es_CO');
  // es_CO usa punto como separador de miles; si el locale no carga, forzamos.
  var s = f.format(monto);
  if (s.contains(',')) s = s.replaceAll(',', '.');
  return '\$ $s';
}

/// Formatea una fecha de plan (sin hora): "sáb, 3 oct".
String formatFechaCorta(DateTime fecha) {
  final f = DateFormat('EEE, d MMM', 'es');
  return f.format(fecha);
}

/// Formatea una fecha de plan larga: "sábado 3 de octubre de 2026".
String formatFechaLarga(DateTime fecha) {
  final f = DateFormat('EEEE d \'de\' MMMM \'de\' y', 'es');
  return f.format(fecha);
}

/// Convierte [fecha] a la cadena YYYY-MM-DD que espera PostgreSQL.
String fechaToIso(DateTime fecha) =>
    '${fecha.year.toString().padLeft(4, '0')}-${fecha.month.toString().padLeft(2, '0')}-${fecha.day.toString().padLeft(2, '0')}';
