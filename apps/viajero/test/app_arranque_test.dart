import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:viajero/composition_root.dart';
import 'package:viajero/ui/features/agencies/views/agencias_view.dart';
import 'package:viajero/ui/features/auth/views/login_view.dart';
import 'package:viajero/ui/features/bookings/views/bookings_view.dart';
import 'package:viajero/ui/features/catalog/views/catalog_view.dart';
import 'package:viajero/ui/features/profile/views/profile_view.dart';

import 'support/auth_falso.dart';
import 'support/catalogo_falso.dart';
import 'support/pasarela_falsa.dart';
import 'support/reservas_falsas.dart';

/// Arranque de la app tal como lo cablea `main()`: el mismo `buildViajeroApp` (providers + router +
/// `DiversoApp`) con repositorios falsos en lugar de Supabase. Atrapa lo que las pruebas de cada
/// pantalla no ven: un `context.read<X>()` cuyo `X` nadie provee en la raíz de composición.

/// El catálogo falso no sabe listar agencias (la pestaña «Agencias» las pide al abrirse).
class _CatalogoConAgencias extends CatalogoFalso {
  @override
  Future<List<AgenciaResumen>> agencias() async => const [];
}

Future<void> _arrancar(WidgetTester tester, AuthFalso auth) async {
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    buildViajeroApp(
      auth: auth,
      reservas: ReservasFalsas(),
      catalogo: _CatalogoConAgencias(),
      resenas: ResenasFalsas(),
      pasarela: PasarelaFalsa(),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _irAPestana(WidgetTester tester, String etiqueta) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(etiqueta)));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('sin sesión arranca en /login', (tester) async {
    await _arrancar(tester, AuthFalso(usuario: null));

    expect(find.byType(LoginView), findsOneWidget);
    expect(find.byType(CatalogView), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('con sesión y consentimiento aceptado arranca en el catálogo', (tester) async {
    await _arrancar(tester, AuthFalso());

    expect(find.byType(CatalogView), findsOneWidget);
    expect(find.byType(LoginView), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cada pestaña se construye sin ProviderNotFoundException', (tester) async {
    await _arrancar(tester, AuthFalso());

    final pestanas = <String, Type>{
      'Agencias': AgenciasView,
      'Reservas': BookingsView,
      'Perfil': ProfileView,
      'Explorar': CatalogView,
    };
    for (final MapEntry(key: etiqueta, value: vista) in pestanas.entries) {
      await _irAPestana(tester, etiqueta);
      expect(find.byType(vista), findsOneWidget, reason: 'pestaña $etiqueta');
      expect(tester.takeException(), isNull, reason: 'pestaña $etiqueta');
    }
  });
}
