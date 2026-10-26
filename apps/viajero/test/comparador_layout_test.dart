import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/core/app_theme.dart';
import 'package:viajero/ui/features/catalog/comparator_view.dart';

/// En celulares angostos la tabla del comparador no aplasta las columnas: cada plan conserva un
/// ancho legible, la tabla se desliza de lado y el precio nunca se parte en dos líneas.

Plan _plan(String id, double precio) => Plan(
      id: id,
      agencyId: 'ag',
      titulo: 'Plan $id con un nombre bastante largo',
      destino: 'Santa Fe de Antioquia',
      categoria: ExperienceCategory.cultura,
      precioCop: precio,
      estado: PlanStatus.publicado,
    );

Future<void> _abrir(WidgetTester tester, {required double ancho}) async {
  tester.view.physicalSize = Size(ancho, 1600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(
    theme: AppTheme.viajeroLight(),
    home: ComparatorView(planes: [
      _plan('1', 189000),
      _plan('2', 178000),
      _plan('3', 179000),
    ]),
  ));
  await tester.pumpAndSettle();
}

Finder get _tablaHorizontal => find.byWidgetPredicate(
    (w) => w is SingleChildScrollView && w.scrollDirection == Axis.horizontal);

void main() {
  testWidgets('320 px y 3 planes: precio en una sola línea, columnas legibles y tabla deslizable',
      (tester) async {
    await _abrir(tester, ancho: 320);

    expect(tester.takeException(), isNull);
    expect(_tablaHorizontal, findsOneWidget);

    // El precio no se parte: la altura del texto es la de una sola línea.
    final precio = find.text(r'$ 178.000').first;
    final estilo = tester.widget<Text>(precio).style!;
    expect(tester.getSize(precio).height, lessThan(estilo.fontSize! * 2));

    // Cada columna de plan conserva un ancho legible.
    final columna = tester.getSize(find.text('Plan 1 con un nombre bastante largo'));
    expect(columna.width, greaterThanOrEqualTo(110));
  });

  testWidgets('pantalla ancha: las columnas se reparten el ancho, sin quedar angostas', (tester) async {
    await _abrir(tester, ancho: 900);

    final columna = tester.getSize(find.text('Plan 1 con un nombre bastante largo'));
    expect(columna.width, greaterThan(200));
  });

  testWidgets('el más barato se marca en su columna y cada plan tiene su botón «Ver plan»', (tester) async {
    await _abrir(tester, ancho: 900);

    expect(find.text('Mejor precio'), findsOneWidget);
    final sello = tester.getCenter(find.text('Mejor precio'));
    final titulo2 = tester.getRect(find.text('Plan 2 con un nombre bastante largo'));
    expect(sello.dx, inInclusiveRange(titulo2.left, titulo2.right));
    expect(find.widgetWithText(FilledButton, 'Ver plan'), findsNWidgets(3));
  });
}
