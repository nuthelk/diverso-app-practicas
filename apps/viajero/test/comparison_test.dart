import 'package:flutter_test/flutter_test.dart';
import 'package:diverso_core/diverso_core.dart';

void main() {
  Plan plan({
    required String id,
    double precio = 150000,
    String duracion = '1 día',
    bool hospedaje = false,
    double rating = 4.5,
    int reviews = 10,
    List<PlanDate> fechas = const [],
  }) {
    return Plan(
      id: id,
      agencyId: 'a1',
      titulo: 'Plan $id',
      destino: 'Guatapé',
      categoria: ExperienceCategory.aventura,
      precioCop: precio,
      duracionTexto: duracion,
      duracionHoras: 12,
      incluyeHospedaje: hospedaje,
      estado: PlanStatus.publicado,
      ratingPromedio: rating,
      reviewsCount: reviews,
      dates: fechas,
    );
  }

  test('buildComparisonRows alinea valores por columna', () {
    final rows = buildComparisonRows([
      plan(id: '1', precio: 165000, duracion: '1 día'),
      plan(id: '2', precio: 449000, duracion: '2 días / 1 noche', hospedaje: true),
    ]);

    final precios = rows.firstWhere((r) => r.icono == 'precio');
    expect(precios.valores, ['165000', '449000']);

    final total = rows.firstWhere((r) => r.icono == 'total');
    expect(total.valores, ['330000', '898000']);

    final hospedaje = rows.firstWhere((r) => r.icono == 'hospedaje');
    expect(hospedaje.valores, ['—', '✓ Incluido']);

    // Cada fila tiene un valor por plan
    for (final row in rows) {
      expect(row.valores.length, 2);
    }
  });

  test('comparador sin planes devuelve lista vacía', () {
    expect(buildComparisonRows(const []), isEmpty);
  });

  test('fechasDisponibles filtra pasadas y sin cupo', () {
    final hoy = DateTime.now();
    final p = plan(
      id: 'x',
      fechas: [
        PlanDate(id: 'a', planId: 'x', fecha: hoy.subtract(const Duration(days: 2)), cupoTotal: 10, cupoDisponible: 5),
        PlanDate(id: 'b', planId: 'x', fecha: hoy.add(const Duration(days: 3)), cupoTotal: 10, cupoDisponible: 0),
        PlanDate(id: 'c', planId: 'x', fecha: hoy.add(const Duration(days: 5)), cupoTotal: 10, cupoDisponible: 7),
      ],
    );
    expect(p.fechasDisponibles.map((d) => d.id), ['c']);
  });
}
