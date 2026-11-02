import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/catalog/views/comparator_view.dart';

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

  test('el total usa 2 personas por defecto y la etiqueta lo dice', () {
    final rows = buildComparisonRows([plan(id: '1', precio: 100000)]);
    final total = rows.firstWhere((r) => r.icono == 'total');
    expect(total.titulo, 'Total para 2 personas');
    expect(total.valores, ['200000']);
  });

  test('el total se recalcula según el número de viajeros', () {
    final planes = [plan(id: '1', precio: 165000), plan(id: '2', precio: 449000)];
    final tres = buildComparisonRows(planes, pax: 3).firstWhere((r) => r.icono == 'total');
    expect(tres.titulo, 'Total para 3 personas');
    expect(tres.valores, ['495000', '1347000']);

    // El precio por persona y el resto de filas no cambian con pax.
    final base = buildComparisonRows(planes);
    final conPax = buildComparisonRows(planes, pax: 7);
    expect(conPax.length, base.length);
    for (var i = 0; i < base.length; i++) {
      if (base[i].icono == 'total') continue;
      expect(conPax[i].titulo, base[i].titulo);
      expect(conPax[i].valores, base[i].valores);
    }
  });

  test('con un solo viajero la etiqueta va en singular', () {
    final uno = buildComparisonRows([
      plan(id: '1', precio: 165000),
    ], pax: 1).firstWhere((r) => r.icono == 'total');
    expect(uno.titulo, 'Total para 1 persona');
    expect(uno.valores, ['165000']);
  });

  test('comparador sin planes devuelve lista vacía', () {
    expect(buildComparisonRows(const []), isEmpty);
  });

  test('fechasDisponibles filtra pasadas y sin cupo', () {
    final hoy = DateTime.now();
    final p = plan(
      id: 'x',
      fechas: [
        PlanDate(
          id: 'a',
          planId: 'x',
          fecha: hoy.subtract(const Duration(days: 2)),
          cupoTotal: 10,
          cupoDisponible: 5,
        ),
        PlanDate(
          id: 'b',
          planId: 'x',
          fecha: hoy.add(const Duration(days: 3)),
          cupoTotal: 10,
          cupoDisponible: 0,
        ),
        PlanDate(
          id: 'c',
          planId: 'x',
          fecha: hoy.add(const Duration(days: 5)),
          cupoTotal: 10,
          cupoDisponible: 7,
        ),
      ],
    );
    expect(p.fechasDisponibles.map((d) => d.id), ['c']);
  });

  testWidgets('el comparador recalcula el total con el control de viajeros', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ComparatorView(
          planes: [
            plan(id: '1', precio: 100000),
            plan(id: '2', precio: 200000),
          ],
        ),
      ),
    );

    expect(find.text('¿Cuántos viajan?'), findsOneWidget);
    expect(find.text('Total para 2 personas'), findsOneWidget);

    await tester.tap(find.byTooltip('Más viajeros'));
    await tester.pump();
    expect(find.text('Total para 3 personas'), findsOneWidget);

    await tester.tap(find.byTooltip('Menos viajeros'));
    await tester.pump();
    await tester.tap(find.byTooltip('Menos viajeros'));
    await tester.pump();
    expect(find.text('Total para 1 persona'), findsOneWidget);

    // En 1 el botón "−" queda deshabilitado: no baja de 1.
    await tester.tap(find.byTooltip('Menos viajeros'));
    await tester.pump();
    expect(find.text('Total para 1 persona'), findsOneWidget);
  });
}
