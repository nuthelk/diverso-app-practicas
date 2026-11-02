import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/app.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';
import 'package:viajero/ui/features/legal/view_models/consent_view_model.dart';

import 'support/auth_falso.dart';

class _Catalogo implements CatalogRepository {
  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async => const [];

  @override
  Future<List<String>> destinos() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('cambiar el tema no recrea el router ni reinicia la navegación', (tester) async {
    tester.view.physicalSize = const Size(900, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    final auth = AuthFalso();
    final tema = ThemeModeViewModel();
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: tema),
          Provider<AuthRepository>.value(value: auth),
          ChangeNotifierProvider(create: (_) => ConsentViewModel(auth: auth)),
          Provider<CatalogRepository>.value(value: _Catalogo()),
        ],
        child: const DiversoApp(),
      ),
    );
    await tester.pumpAndSettle();

    GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/legal/privacidad');
    await tester.pumpAndSettle();
    expect(find.text('Documentos legales'), findsOneWidget);

    tema.setMode(ThemeMode.dark);
    await tester.pumpAndSettle();

    expect(find.text('Documentos legales'), findsOneWidget);
    expect(Theme.of(tester.element(find.text('Documentos legales'))).brightness, Brightness.dark);
  });
}
