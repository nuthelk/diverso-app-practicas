import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/catalog/views/catalog_view.dart';

/// Hoja de filtros del catálogo: «Aplicar filtros» aplica destino, precio y fecha juntos con UNA
/// sola consulta (antes eran tres, una por filtro). Sin red: el catálogo es un doble que cuenta.

class _Catalogo implements CatalogRepository {
  final busquedas = <FiltrosCatalogo>[];

  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async {
    busquedas.add(filtros);
    return const [];
  }

  @override
  Future<List<String>> destinos() async => const ['Guatapé', 'Jardín'];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<_Catalogo> _abrir(WidgetTester tester) async {
  tester.view.physicalSize = const Size(600, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final catalogo = _Catalogo();
  await tester.pumpWidget(
    Provider<CatalogRepository>.value(
      value: catalogo,
      child: MaterialApp(theme: AppTheme.viajeroLight(), home: const CatalogView()),
    ),
  );
  await tester.pumpAndSettle();
  return catalogo;
}

Future<void> _abrirHoja(WidgetTester tester) async {
  await tester.tap(find.byTooltip('Filtros y orden'));
  await tester.pumpAndSettle();
}

Future<void> _aplicar(WidgetTester tester) async {
  await tester.tap(find.text('Aplicar filtros'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('aplicar destino y precio hace una sola consulta con ambos filtros', (tester) async {
    final catalogo = await _abrir(tester);
    expect(catalogo.busquedas, hasLength(1));

    await _abrirHoja(tester);
    await tester.tap(find.text('Guatapé'));
    await tester.pump();
    await tester.drag(find.byType(Slider), const Offset(-120, 0));
    await tester.pump();
    await _aplicar(tester);

    expect(catalogo.busquedas, hasLength(2));
    expect(catalogo.busquedas.last.destino, 'Guatapé');
    expect(catalogo.busquedas.last.precioMax, isNotNull);
    expect(find.byType(InputChip), findsNWidgets(2));
  });

  testWidgets('aplicar sin cambios también hace una sola consulta', (tester) async {
    final catalogo = await _abrir(tester);

    await _abrirHoja(tester);
    await _aplicar(tester);

    expect(catalogo.busquedas, hasLength(2));
    expect(catalogo.busquedas.last.destino, isNull);
    expect(catalogo.busquedas.last.precioMax, isNull);
    expect(catalogo.busquedas.last.fecha, isNull);
  });

  testWidgets('Limpiar y aplicar quita los filtros con una sola consulta', (tester) async {
    final catalogo = await _abrir(tester);
    await _abrirHoja(tester);
    await tester.tap(find.text('Jardín'));
    await tester.pump();
    await _aplicar(tester);
    expect(catalogo.busquedas.last.destino, 'Jardín');
    final antes = catalogo.busquedas.length;

    await _abrirHoja(tester);
    await tester.tap(find.text('Limpiar'));
    await tester.pump();
    await _aplicar(tester);

    expect(catalogo.busquedas, hasLength(antes + 1));
    expect(catalogo.busquedas.last.destino, isNull);
    expect(find.byType(InputChip), findsNothing);
  });

  group('con un destino ya activo', () {
    Future<_Catalogo> abrirConGuatape(WidgetTester tester) async {
      final catalogo = await _abrir(tester);
      await _abrirHoja(tester);
      await tester.tap(find.widgetWithText(ListTile, 'Guatapé'));
      await tester.pump();
      await _aplicar(tester);
      expect(catalogo.busquedas.last.destino, 'Guatapé');
      return catalogo;
    }

    testWidgets('cambiar solo el precio conserva el destino y su chip', (tester) async {
      final catalogo = await abrirConGuatape(tester);
      final antes = catalogo.busquedas.length;

      await _abrirHoja(tester);
      await tester.drag(find.byType(Slider), const Offset(-120, 0));
      await tester.pump();
      await _aplicar(tester);

      expect(catalogo.busquedas, hasLength(antes + 1));
      expect(catalogo.busquedas.last.destino, 'Guatapé');
      expect(catalogo.busquedas.last.precioMax, isNotNull);
      expect(find.widgetWithText(InputChip, 'Guatapé'), findsOneWidget);
    });

    testWidgets('PRESERVE: Limpiar y aplicar quita el destino activo', (tester) async {
      final catalogo = await abrirConGuatape(tester);

      await _abrirHoja(tester);
      await tester.tap(find.text('Limpiar'));
      await tester.pump();
      await _aplicar(tester);

      expect(catalogo.busquedas.last.destino, isNull);
      expect(find.byType(InputChip), findsNothing);
    });

    testWidgets('PRESERVE: elegir otro destino lo reemplaza', (tester) async {
      final catalogo = await abrirConGuatape(tester);

      await _abrirHoja(tester);
      await tester.tap(find.widgetWithText(ListTile, 'Jardín'));
      await tester.pump();
      await _aplicar(tester);

      expect(catalogo.busquedas.last.destino, 'Jardín');
    });
  });
}
