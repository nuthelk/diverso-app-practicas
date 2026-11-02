import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/router/app_router.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';
import 'package:viajero/ui/features/legal/view_models/consent_view_model.dart';

/// La guardia del consentimiento (Ley 1581) con la respuesta del servidor controlada a mano:
/// mientras se verifica, con error o con documentos pendientes no se abre ninguna pantalla
/// protegida ni se cargan sus datos; el destino original se conserva en `?desde=`. Sin red.

/// Cada consulta de consentimiento queda en [respuestas] hasta que el test la responde.
class _Auth implements AuthRepository {
  _Auth(this._usuario);

  String? _usuario;
  final respuestas = <Completer<List<String>>>[];
  final _cambios = StreamController<String?>.broadcast();

  void cambiarSesion(String? usuario) {
    _usuario = usuario;
    _cambios.add(usuario);
  }

  @override
  String? get currentUserId => _usuario;

  @override
  String? get currentUserEmail => 'viajero@demo.com';

  @override
  Stream<String?> get onAuthStateChanged => _cambios.stream;

  @override
  Future<Profile> currentProfile() async =>
      Profile(id: 'viajero-1', rol: UserRole.viajero, nombre: 'Santiago');

  @override
  Future<List<String>> consentimientosPendientes() {
    final c = Completer<List<String>>();
    respuestas.add(c);
    return c.future;
  }

  @override
  Future<void> registrarConsentimiento(String tipo) async {}

  @override
  Future<void> signOut() async => cambiarSesion(null);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Plan _plan(String id) => Plan(
  id: id,
  agencyId: 'ag-1',
  titulo: 'Plan $id',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: 150000,
  estado: PlanStatus.publicado,
  dates: const [],
);

class _Catalogo implements CatalogRepository {
  final consultas = <String>[];

  @override
  Future<Plan> planDetalle(String planId) async {
    consultas.add(planId);
    if (planId == 'nope') throw DiversoException('PLAN_NO_EXISTE');
    return _plan(planId);
  }

  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async => const [];

  @override
  Future<List<String>> destinos() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Reservas implements BookingRepository {
  final consultas = <String>[];

  @override
  Future<Booking> reserva(String bookingId) async {
    consultas.add(bookingId);
    // RLS oculta las reservas de otros viajeros: el servidor responde «no existe».
    throw DiversoException('RESERVA_NO_EXISTE');
  }

  @override
  Future<List<Booking>> misReservas() async {
    consultas.add('misReservas');
    return const [];
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewRepository {
  @override
  Future<List<Review>> porPlan(String planId, {int limit = 20}) async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Pasarela implements PaymentGateway {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

late GoRouter _router;

Future<void> _abrir(
  WidgetTester tester,
  _Auth auth,
  String url, {
  _Catalogo? catalogo,
  _Reservas? reservas,
}) async {
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final consentimiento = ConsentViewModel(auth: auth);
  addTearDown(consentimiento.dispose);
  _router = buildViajeroRouter(auth: auth, consentimiento: consentimiento, initialLocation: url);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<AuthRepository>.value(value: auth),
        ChangeNotifierProvider.value(value: consentimiento),
        Provider<CatalogRepository>.value(value: catalogo ?? _Catalogo()),
        Provider<BookingRepository>.value(value: reservas ?? _Reservas()),
        Provider<ReviewRepository>.value(value: _Resenas()),
        Provider<PaymentGateway>.value(value: _Pasarela()),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: _router),
    ),
  );
  // Sin pumpAndSettle: mientras se verifica hay un indicador de progreso que nunca se detiene.
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

String get _ruta => _router.routerDelegate.currentConfiguration.last.matchedLocation;

/// La URL completa (con query) que ve la barra del navegador.
String get _url => _router.routerDelegate.currentConfiguration.uri.toString();

final _pantallaConsentimiento = find.text('Antes de continuar');
const _pendientes = ['tratamiento_datos', 'terminos_viajero'];

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('mientras se verifica el consentimiento', () {
    testWidgets('V1: un enlace a una pantalla protegida no la abre ni carga sus datos', (
      tester,
    ) async {
      final auth = _Auth('viajero-1');
      final reservas = _Reservas();
      await _abrir(tester, auth, '/reservas/b-1', reservas: reservas);

      expect(_ruta, '/consentimiento');
      expect(_url, '/consentimiento?desde=%2Freservas%2Fb-1');
      expect(reservas.consultas, isEmpty);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Cierra la consulta pendiente (si no, su límite de tiempo sigue corriendo al terminar).
      auth.respuestas.single.complete(const []);
      await tester.pumpAndSettle();
    });

    testWidgets('V1: aceptado, el enlace original se conserva', (tester) async {
      final auth = _Auth('viajero-1');
      final reservas = _Reservas();
      await _abrir(tester, auth, '/reservas/b-1', reservas: reservas);

      auth.respuestas.single.complete(const []);
      await tester.pumpAndSettle();

      expect(_ruta, '/reservas/b-1');
      expect(reservas.consultas, ['b-1']);
    });

    testWidgets('V1: pendiente, tras aceptar se llega al enlace original', (tester) async {
      final auth = _Auth('viajero-1');
      await _abrir(tester, auth, '/perfil');

      auth.respuestas[0].complete(_pendientes);
      await tester.pumpAndSettle();
      expect(_pantallaConsentimiento, findsOneWidget);
      expect(_url, '/consentimiento?desde=%2Fperfil');

      await tester.tap(find.byType(Checkbox).at(0));
      await tester.tap(find.byType(Checkbox).at(1));
      await tester.tap(find.text('Aceptar y continuar'));
      await tester.pump();
      auth.respuestas[1].complete(const []);
      await tester.pumpAndSettle();

      expect(_ruta, '/perfil');
      expect(find.text('Santiago'), findsOneWidget);
    });

    testWidgets('si la consulta no responde nunca, a los 15 s hay «Reintentar»', (tester) async {
      final auth = _Auth('viajero-1');
      await _abrir(tester, auth, '/plan/p1');
      expect(_ruta, '/consentimiento');
      expect(find.text('Reintentar'), findsNothing);

      await tester.pump(ConsentViewModel.tiempoLimite);
      await tester.pump();

      expect(_ruta, '/consentimiento');
      expect(find.text('Reintentar'), findsOneWidget);
    });
  });

  group('cambio de usuario', () {
    testWidgets('U1: A aceptó y entra B sin cerrar sesión: se vuelve a comprobar', (tester) async {
      final auth = _Auth('A');
      await _abrir(tester, auth, '/');
      auth.respuestas[0].complete(const []);
      await tester.pumpAndSettle();
      expect(find.byType(NavigationBar), findsOneWidget);

      auth.cambiarSesion('B');
      await tester.pump();
      expect(auth.respuestas.length, 2);
      auth.respuestas[1].complete(_pendientes);
      await tester.pumpAndSettle();

      expect(_ruta, '/consentimiento');
    });

    testWidgets('U2: la respuesta «aceptado» tardía de A no cuenta para B', (tester) async {
      final auth = _Auth('A');
      await _abrir(tester, auth, '/');
      auth.cambiarSesion(null);
      await tester.pump();
      auth.cambiarSesion('B');
      await tester.pump();

      auth.respuestas[0].complete(const []); // A, tarde
      await tester.pump();
      auth.respuestas[1].complete(_pendientes); // B
      await tester.pumpAndSettle();

      expect(_ruta, '/consentimiento');
      expect(_pantallaConsentimiento, findsOneWidget);
    });
  });

  group('con error o pendiente nada protegido se abre', () {
    for (final url in [
      '/',
      '/agencias',
      '/reservas',
      '/perfil',
      '/agencia/a1',
      '/plan/p1',
      '/checkout/p1/f1',
      '/pago/resultado?id=t1',
      '/reserva/b1',
      '/reservas/b1',
      '/resena/b1',
      '/resena',
      '/comparar?ids=p1,p2',
      '/checkout',
      '/exito',
      '/login',
      '/esta/no/existe',
      '/consentimiento?x=1',
      '/legal/privacidad',
      '/legal/no-existe',
    ]) {
      for (final conError in [true, false]) {
        testWidgets('${conError ? 'error' : 'pendiente'}: $url', (tester) async {
          final auth = _Auth('viajero-1');
          await _abrir(tester, auth, url);
          final consulta = auth.respuestas.single;
          conError ? consulta.completeError(Exception('sin red')) : consulta.complete(_pendientes);
          await tester.pumpAndSettle();

          expect(_ruta, url.startsWith('/legal/') ? url : '/consentimiento');
        });
      }
    }

    testWidgets('G3: pendiente, ni go ni push llegan a una pantalla protegida', (tester) async {
      final auth = _Auth('viajero-1');
      await _abrir(tester, auth, '/consentimiento');
      auth.respuestas.single.complete(_pendientes);
      await tester.pumpAndSettle();

      _router.go('/reservas/b1');
      await tester.pumpAndSettle();
      expect(_ruta, '/consentimiento');

      unawaited(_router.push('/plan/p1'));
      await tester.pumpAndSettle();
      expect(_ruta, '/consentimiento');
    });
  });

  group('rutas con ids (bug J) con el consentimiento al día', () {
    for (final url in ['/comparar', '/comparar?ids=', '/comparar?ids=,,,']) {
      testWidgets('J1: $url no consulta nada y avisa que no hay qué comparar', (tester) async {
        final auth = _Auth('viajero-1');
        final catalogo = _Catalogo();
        await _abrir(tester, auth, url, catalogo: catalogo);
        auth.respuestas.single.complete(const []);
        await tester.pumpAndSettle();

        expect(catalogo.consultas, isEmpty);
        expect(find.text('Nada para comparar'), findsOneWidget);
      });
    }

    testWidgets('J1: /comparar?ids=nope,p1 con un plan inexistente muestra el error', (
      tester,
    ) async {
      final auth = _Auth('viajero-1');
      await _abrir(tester, auth, '/comparar?ids=nope,p1');
      auth.respuestas.single.complete(const []);
      await tester.pumpAndSettle();

      expect(find.text('No pudimos cargar la comparación'), findsOneWidget);
    });

    testWidgets('J2: /resena/<reserva de otro viajero> no muestra el formulario', (tester) async {
      final auth = _Auth('viajero-1');
      await _abrir(tester, auth, '/resena/03341be8-fa33-4958-8b64-a0893b3197e4');
      auth.respuestas.single.complete(const []);
      await tester.pumpAndSettle();

      expect(find.text('No pudimos cargar la reserva'), findsOneWidget);
      expect(find.text('Publicar reseña'), findsNothing);
    });
  });
}
