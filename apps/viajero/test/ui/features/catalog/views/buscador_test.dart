import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/catalog/views/catalog_view.dart';

/// Buscador del catálogo: lo que el viajero escribe llega a `CatalogService.search` en
/// `FiltrosCatalogo.texto`. Sin red ni Supabase: el catálogo es un doble que registra los filtros.

class _Catalogo implements CatalogService {
  final busquedas = <FiltrosCatalogo>[];

  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async {
    busquedas.add(filtros);
    return const [];
  }

  @override
  Future<List<String>> destinos() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<_Catalogo> _abrir(WidgetTester tester) async {
  tester.view.physicalSize = const Size(600, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final catalogo = _Catalogo();
  await tester.pumpWidget(
    Provider<CatalogService>.value(
      value: catalogo,
      child: MaterialApp(theme: AppTheme.viajeroLight(), home: const CatalogView()),
    ),
  );
  await tester.pumpAndSettle();
  return catalogo;
}

Future<void> _escribirYBuscar(WidgetTester tester, String texto) async {
  await tester.enterText(find.byType(TextField), texto);
  await tester.testTextInput.receiveAction(TextInputAction.search);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('al abrir se carga el catálogo sin texto', (tester) async {
    final catalogo = await _abrir(tester);

    expect(catalogo.busquedas, hasLength(1));
    expect(catalogo.busquedas.single.texto, '');
  });

  testWidgets('escribir y enviar busca con el texto escrito', (tester) async {
    final catalogo = await _abrir(tester);

    await _escribirYBuscar(tester, 'guatape');

    expect(catalogo.busquedas, hasLength(2));
    expect(catalogo.busquedas.last.texto, 'guatape');
  });

  testWidgets('el texto se envía tal cual, con tildes y comas', (tester) async {
    final catalogo = await _abrir(tester);

    await _escribirYBuscar(tester, 'Café, (Jardín)');

    expect(catalogo.busquedas.last.texto, 'Café, (Jardín)');
  });

  testWidgets('escribir sin enviar no dispara otra búsqueda', (tester) async {
    final catalogo = await _abrir(tester);

    await tester.enterText(find.byType(TextField), 'guatape');
    await tester.pumpAndSettle();

    expect(catalogo.busquedas, hasLength(1));
  });

  testWidgets('el botón de borrar aparece al escribir y busca sin texto', (tester) async {
    final catalogo = await _abrir(tester);
    expect(find.byTooltip('Borrar búsqueda'), findsNothing);

    await _escribirYBuscar(tester, 'guatape');
    expect(find.byTooltip('Borrar búsqueda'), findsOneWidget);

    await tester.tap(find.byTooltip('Borrar búsqueda'));
    await tester.pumpAndSettle();

    expect(catalogo.busquedas.last.texto, '');
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, '');
    expect(find.byTooltip('Borrar búsqueda'), findsNothing);
  });

  testWidgets('otro filtro conserva el texto buscado', (tester) async {
    final catalogo = await _abrir(tester);
    await _escribirYBuscar(tester, 'guatape');

    await tester.tap(find.text(ExperienceCategory.aventura.label));
    await tester.pumpAndSettle();

    expect(catalogo.busquedas.last.texto, 'guatape');
    expect(catalogo.busquedas.last.categoria, ExperienceCategory.aventura);
  });
}
