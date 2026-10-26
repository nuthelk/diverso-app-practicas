import 'models/plan.dart';

/// Fila del comparador de planes (Anexo 6, idea 7): enfrenta planes con
/// "precio final todo incluido" para decidir sin sorpresas.
class ComparisonRow {
  ComparisonRow(this.icono, this.titulo, this.valores);

  /// Identificador estable del atributo (para tests y claves de tabla).
  final String icono; // etiqueta corta del atributo
  final String titulo;
  final List<String> valores;
}

/// Construye las filas comparables de 2-3 planes: precio final, duración,
/// rating, transporte/comida/hospedaje, próximos cupos y política. El total
/// se calcula para [pax] viajeros (2 por defecto).
List<ComparisonRow> buildComparisonRows(List<Plan> planes, {int pax = 2}) {
  if (planes.isEmpty) return const [];

  return [
    ComparisonRow(
      'precio',
      'Precio final por persona',
      planes.map((p) => p.precioCop.toStringAsFixed(0)).toList(),
    ),
    ComparisonRow(
      'total',
      'Total para $pax ${pax == 1 ? 'persona' : 'personas'}',
      planes.map((p) => (p.precioCop * pax).toStringAsFixed(0)).toList(),
    ),
    ComparisonRow(
      'duracion',
      'Duración',
      planes.map((p) => p.duracionTexto).toList(),
    ),
    ComparisonRow(
      'destino',
      'Destino',
      planes.map((p) => p.destino).toList(),
    ),
    ComparisonRow(
      'rating',
      'Calificación',
      planes
          .map((p) => p.esNuevo ? 'Nueva' : '${p.ratingPromedio.toStringAsFixed(1)} ★ (${p.reviewsCount})')
          .toList(),
    ),
    ComparisonRow(
      'transporte',
      'Transporte',
      planes.map((p) => p.incluyeTransporte ? '✓ Incluido' : '—').toList(),
    ),
    ComparisonRow(
      'comida',
      'Comida',
      planes.map((p) => p.incluyeComida ? '✓ Incluido' : '—').toList(),
    ),
    ComparisonRow(
      'hospedaje',
      'Hospedaje',
      planes.map((p) => p.incluyeHospedaje ? '✓ Incluido' : '—').toList(),
    ),
    ComparisonRow(
      'cupos',
      'Próximos cupos',
      planes
          .map((p) => p.fechasDisponibles.isEmpty
              ? 'Sin fechas'
              : '${p.fechasDisponibles.first.cupoDisponible} el '
                  '${p.fechasDisponibles.first.fecha.day}/${p.fechasDisponibles.first.fecha.month}')
          .toList(),
    ),
    ComparisonRow(
      'cancelacion',
      'Cancelación',
      planes.map((p) => p.politicaCancelacion.isEmpty ? '—' : p.politicaCancelacion).toList(),
    ),
  ];
}
