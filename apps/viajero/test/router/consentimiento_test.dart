import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/app.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';
import 'package:viajero/ui/features/legal/view_models/consent_view_model.dart';

import '../support/auth_falso.dart';

/// El consentimiento (Ley 1581) es estado de enrutamiento: con sesión y sin la autorización
/// vigente —o sin poder comprobarla— el router muestra `/consentimiento`. Sin red ni Supabase.

class _Catalogo implements CatalogRepository {
  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async => const [];

  @override
  Future<List<String>> destinos() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

const _pendientes = ['tratamiento_datos', 'terminos_viajero'];

Future<void> _abrir(WidgetTester tester, AuthFalso auth) async {
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<AuthRepository>.value(value: auth),
        ChangeNotifierProvider(create: (_) => ConsentViewModel(auth: auth)),
        Provider<CatalogRepository>.value(value: _Catalogo()),
      ],
      child: const DiversoApp(),
    ),
  );
  await tester.pumpAndSettle();
}

/// Ciclo de vida real: la app pasa a segundo plano y vuelve a primer plano.
Future<void> _irASegundoPlanoYVolver(WidgetTester tester) async {
  for (final estado in [
    AppLifecycleState.inactive,
    AppLifecycleState.hidden,
    AppLifecycleState.paused,
    AppLifecycleState.hidden,
    AppLifecycleState.inactive,
    AppLifecycleState.resumed,
  ]) {
    tester.binding.handleAppLifecycleStateChanged(estado);
  }
  await tester.pumpAndSettle();
}

final _pantallaConsentimiento = find.text('Antes de continuar');
final _barraInferior = find.byType(NavigationBar);
final _avisoSinVerificar = find.textContaining('No pudimos verificar tu autorización');

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('con el consentimiento al día se entra a la app', (tester) async {
    await _abrir(tester, AuthFalso());
    expect(_barraInferior, findsOneWidget);
    expect(_pantallaConsentimiento, findsNothing);
  });

  testWidgets('con documentos sin aceptar se pide la autorización y no se ve la app', (
    tester,
  ) async {
    await _abrir(tester, AuthFalso(consultas: [_pendientes]));
    expect(_pantallaConsentimiento, findsOneWidget);
    expect(find.text('Aceptar y continuar'), findsOneWidget);
    expect(_barraInferior, findsNothing);
  });

  testWidgets('si la consulta falla una vez, tras «Reintentar» se sigue pidiendo la autorización', (
    tester,
  ) async {
    final auth = AuthFalso(consultas: [Exception('sin red'), _pendientes]);
    await _abrir(tester, auth);

    // Con un error NO se deja pasar: pantalla de consentimiento con aviso y sin formulario.
    expect(_pantallaConsentimiento, findsOneWidget);
    expect(_avisoSinVerificar, findsOneWidget);
    expect(find.text('Aceptar y continuar'), findsNothing);
    expect(_barraInferior, findsNothing);

    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    expect(auth.consultas, 2);
    expect(_avisoSinVerificar, findsNothing);
    expect(find.text('Aceptar y continuar'), findsOneWidget);
    expect(_barraInferior, findsNothing);
  });

  testWidgets('si la consulta falla y luego el usuario está al día, «Reintentar» entra a la app', (
    tester,
  ) async {
    await _abrir(tester, AuthFalso(consultas: [Exception('sin red'), <String>[]]));
    expect(_avisoSinVerificar, findsOneWidget);

    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    expect(_pantallaConsentimiento, findsNothing);
    expect(_barraInferior, findsOneWidget);
  });

  testWidgets('si la consulta falla, al volver a primer plano se reintenta sola', (tester) async {
    final auth = AuthFalso(consultas: [Exception('sin red'), _pendientes]);
    await _abrir(tester, auth);
    expect(auth.consultas, 1);

    await _irASegundoPlanoYVolver(tester);

    expect(auth.consultas, 2);
    expect(find.text('Aceptar y continuar'), findsOneWidget);
  });

  testWidgets('al volver a primer plano con el consentimiento al día no se vuelve a consultar', (
    tester,
  ) async {
    final auth = AuthFalso();
    await _abrir(tester, auth);

    await _irASegundoPlanoYVolver(tester);

    expect(auth.consultas, 1);
    expect(_barraInferior, findsOneWidget);
  });

  testWidgets('aceptar registra los documentos pendientes y lleva a la app', (tester) async {
    final auth = AuthFalso(consultas: [_pendientes, <String>[]]);
    await _abrir(tester, auth);

    await tester.tap(find.byType(Checkbox).at(0));
    await tester.tap(find.byType(Checkbox).at(1));
    await tester.tap(find.text('Aceptar y continuar'));
    await tester.pumpAndSettle();

    expect(auth.registrados, _pendientes);
    expect(_pantallaConsentimiento, findsNothing);
    expect(_barraInferior, findsOneWidget);
  });

  testWidgets('si no se puede guardar la autorización avisa y se queda en la pantalla', (
    tester,
  ) async {
    final auth = AuthFalso(consultas: [_pendientes])..falloAlRegistrar = true;
    await _abrir(tester, auth);

    await tester.tap(find.byType(Checkbox).at(0));
    await tester.tap(find.byType(Checkbox).at(1));
    await tester.tap(find.text('Aceptar y continuar'));
    await tester.pumpAndSettle();

    expect(find.text('No pudimos guardar tu autorización. Intenta de nuevo.'), findsOneWidget);
    expect(_pantallaConsentimiento, findsOneWidget);
    expect(_barraInferior, findsNothing);
  });

  group('sesión', () {
    testWidgets('sin sesión se ve el login y no se consulta el consentimiento', (tester) async {
      final auth = AuthFalso(usuario: null);
      await _abrir(tester, auth);
      expect(find.text('Entrar'), findsWidgets);
      expect(_pantallaConsentimiento, findsNothing);
      expect(auth.consultas, 0);
    });

    testWidgets('al iniciar sesión se consulta el consentimiento de ese usuario', (tester) async {
      final auth = AuthFalso(usuario: null, consultas: [_pendientes]);
      await _abrir(tester, auth);

      auth.cambiarSesion('viajero-2');
      await tester.pumpAndSettle();

      expect(auth.consultas, 1);
      expect(_pantallaConsentimiento, findsOneWidget);
    });

    testWidgets('«Cerrar sesión» en la pantalla de consentimiento lleva al login', (tester) async {
      await _abrir(tester, AuthFalso(consultas: [_pendientes]));
      expect(_pantallaConsentimiento, findsOneWidget);

      await tester.tap(find.text('Cerrar sesión'));
      await tester.pumpAndSettle();

      expect(_pantallaConsentimiento, findsNothing);
      expect(find.text('Entrar'), findsWidgets);
    });
  });
}
