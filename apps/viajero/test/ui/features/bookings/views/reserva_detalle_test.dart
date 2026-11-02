import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';

import '../../../../support/router_de_prueba.dart';

/// Tarjeta de «Mis reservas» tocable + pantalla «Detalle de la reserva» (`/reservas/:bookingId`).
/// Se prueba con el router real para fijar también el registro de la ruta. Sin red ni Supabase.

DateTime _enDias(int dias, {int hora = 6}) {
  final hoy = DateTime.now();
  return DateTime(hoy.year, hoy.month, hoy.day + dias, hora);
}

Plan _plan({
  String titulo = 'Street food tour',
  String puntoEncuentro = 'Estación San Javier',
  String agencia = 'EcoAndes Viajes',
}) => Plan(
  id: 'plan-1',
  agencyId: 'ag',
  titulo: titulo,
  destino: 'Medellín',
  categoria: ExperienceCategory.gastronomia,
  precioCop: 95000,
  estado: PlanStatus.publicado,
  puntoEncuentro: puntoEncuentro,
  politicaCancelacion: 'Reembolso total hasta 48 horas antes.',
  itinerario: [
    ItinerarioPaso(hora: '06:00', actividad: 'Salida desde el metro'),
    ItinerarioPaso(hora: '09:30', actividad: 'Desayuno típico'),
  ],
  agency: Agency(
    id: 'ag',
    nombre: agencia,
    numeroRnt: '12345',
    matriculaCamaraComercio: '999',
    estadoVerificacion: VerificationStatus.verificado,
  ),
);

Booking _reserva({
  String id = 'res-1',
  String codigo = 'DIV-CC70944A',
  int pax = 2,
  DateTime? salida,
  BookingStatus estado = BookingStatus.confirmada,
  Plan? plan,
  bool conPago = true,
}) => Booking(
  id: id,
  codigo: codigo,
  planDateId: 'pd',
  viajeroId: 'v',
  pax: pax,
  montoTotal: 190000,
  estado: estado,
  createdAt: DateTime.now().subtract(const Duration(days: 2)),
  salidaAt: salida ?? _enDias(3),
  plan: plan ?? _plan(),
  payments: conPago
      ? [
          Payment(
            id: 'p',
            bookingId: id,
            metodo: PaymentMethodOption.tarjeta,
            estado: PaymentStatus.aprobado,
            monto: 190000,
            referencia: 'DIV-REF-1',
            provider: 'wompi',
            simulated: false,
          ),
        ]
      : const [],
);

class _Reservas implements BookingRepository {
  _Reservas(this.lista);

  final List<Booking> lista;
  final consultas = <String>[];

  @override
  Future<List<Booking>> misReservas() async => lista;

  @override
  Future<Booking> reserva(String bookingId) async {
    consultas.add(bookingId);
    return lista.firstWhere(
      (b) => b.id == bookingId,
      orElse: () => throw DiversoException('RESERVA_NO_EXISTE'),
    );
  }

  @override
  Future<VistaPreviaCancelacion> vistaPreviaCancelacion(String bookingId) async =>
      VistaPreviaCancelacion(
        aplica: true,
        porcentaje: 100,
        monto: 190000,
        horasAntes: 72,
        motivo: '',
      );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Catalogo implements CatalogRepository {
  @override
  Future<Plan> planDetalle(String planId) async => throw DiversoException('PLAN_NO_PUBLICADO');

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Pasarela implements PaymentGateway {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<GoRouter> _abrir(
  WidgetTester tester,
  String url,
  _Reservas reservas, {
  Size tamano = const Size(800, 1600),
}) async {
  tester.view.physicalSize = tamano;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = routerDePrueba(url);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<BookingRepository>.value(value: reservas),
        Provider<CatalogRepository>.value(value: _Catalogo()),
        Provider<ReviewRepository>.value(value: _Resenas()),
        Provider<PaymentGateway>.value(value: _Pasarela()),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

// Ruta visible, incluida la que entró con push (que no actualiza routeInformationProvider).
String _ruta(GoRouter r) => r.routerDelegate.currentConfiguration.last.matchedLocation;

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('tarjeta de «Mis reservas»', () {
    testWidgets('tocarla abre el detalle con código, punto de encuentro, itinerario y «Ver plan»', (
      tester,
    ) async {
      final router = await _abrir(tester, '/reservas', _Reservas([_reserva()]));

      await tester.tap(find.text('Street food tour'));
      await tester.pumpAndSettle();

      expect(_ruta(router), '/reservas/res-1');
      expect(find.text('DIV-CC70944A'), findsOneWidget);
      expect(find.text('Estación San Javier'), findsOneWidget);
      expect(find.text('Salida desde el metro'), findsOneWidget);
      expect(find.text('Ver plan'), findsOneWidget);
    });

    testWidgets('«Cancelar» de la tarjeta no navega: abre su propio diálogo', (tester) async {
      final router = await _abrir(tester, '/reservas', _Reservas([_reserva()]));

      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();

      expect(_ruta(router), '/reservas');
      expect(find.text('¿Cancelar reserva?'), findsOneWidget);
    });

    testWidgets('la tarjeta se anuncia como botón con la reserva', (tester) async {
      final semantica = tester.ensureSemantics();
      await _abrir(tester, '/reservas', _Reservas([_reserva()]));

      expect(
        find.bySemanticsLabel(RegExp('Ver detalle de la reserva DIV-CC70944A')),
        findsOneWidget,
      );
      semantica.dispose();
    });

    testWidgets(
      'jerarquía: código en la cabecera, hora, punto de encuentro, personas y precio; sin referencia de pago',
      (tester) async {
        await _abrir(tester, '/reservas', _Reservas([_reserva(salida: _enDias(3, hora: 6))]));

        expect(find.text('DIV-CC70944A'), findsOneWidget);
        expect(find.textContaining('06:00'), findsOneWidget);
        expect(find.text('Estación San Javier'), findsOneWidget);
        expect(find.text('2 personas'), findsOneWidget);
        expect(find.text('\$ 190.000'), findsOneWidget);
        // La línea suelta «código · pax · precio» y la referencia del pago ya no están en la tarjeta.
        expect(find.textContaining('pax'), findsNothing);
        expect(find.textContaining('ref.'), findsNothing);
      },
    );

    testWidgets('una sola persona va en singular', (tester) async {
      await _abrir(tester, '/reservas', _Reservas([_reserva(pax: 1)]));
      expect(find.text('1 persona'), findsOneWidget);
    });

    testWidgets('cuenta regresiva: «en 3 días», «Mañana» y «Hoy»', (tester) async {
      await _abrir(tester, '/reservas', _Reservas([_reserva(salida: _enDias(3))]));
      expect(find.textContaining('en 3 días'), findsOneWidget);

      await _abrir(tester, '/reservas', _Reservas([_reserva(salida: _enDias(1))]));
      expect(find.textContaining('Mañana'), findsOneWidget);

      await _abrir(
        tester,
        '/reservas',
        _Reservas([_reserva(salida: DateTime.now().add(const Duration(minutes: 5)))]),
      );
      expect(find.textContaining('Hoy'), findsOneWidget);
    });

    testWidgets('el historial no muestra cuenta regresiva ni «Cancelar»', (tester) async {
      await _abrir(tester, '/reservas', _Reservas([_reserva(salida: _enDias(-5))]));
      await tester.tap(find.text('Historial (1)'));
      await tester.pumpAndSettle();

      expect(find.textContaining('en 5 días'), findsNothing);
      expect(find.textContaining('Hoy'), findsNothing);
      expect(find.text('Cancelar'), findsNothing);
    });

    testWidgets('a 320 px y con letra grande no se desborda (títulos, agencia y lugar largos)', (
      tester,
    ) async {
      tester.platformDispatcher.textScaleFactorTestValue = 1.6;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final largo = _plan(
        titulo:
            'Recorrido gastronómico por las plazas de mercado más tradicionales del Valle de Aburrá',
        puntoEncuentro: 'Estación San Javier, salida norte, junto a la tienda de la esquina',
        agencia: 'Agencia de viajes con un nombre larguísimo S.A.S.',
      );
      await _abrir(
        tester,
        '/reservas',
        _Reservas([
          _reserva(id: 'a', plan: largo),
          _reserva(
            id: 'b',
            codigo: 'DIV-PEND',
            plan: largo,
            estado: BookingStatus.pendientePago,
            conPago: false,
          ),
        ]),
        tamano: const Size(320, 900),
      );

      expect(tester.takeException(), isNull);
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('detalle de la reserva', () {
    testWidgets(
      'muestra estado, fecha y hora, lugar, personas y total, pago, agencia, itinerario y política',
      (tester) async {
        await _abrir(tester, '/reservas/res-1', _Reservas([_reserva(salida: _enDias(3, hora: 6))]));

        expect(find.text('Street food tour'), findsWidgets);
        expect(find.text('Confirmada'), findsOneWidget);
        expect(find.text('DIV-CC70944A'), findsOneWidget);
        expect(find.textContaining('· 06:00'), findsOneWidget);
        expect(find.text('Estación San Javier'), findsOneWidget);
        expect(find.textContaining('2 personas'), findsOneWidget);
        expect(find.textContaining('\$ 190.000'), findsOneWidget);
        expect(find.text('Pagado con Tarjeta · ref. DIV-REF-1 (prueba)'), findsOneWidget);
        expect(find.text('EcoAndes Viajes'), findsOneWidget);
        expect(find.text('Desayuno típico'), findsOneWidget);
        expect(find.text('Reembolso total hasta 48 horas antes.'), findsOneWidget);
        expect(find.text('Ver plan'), findsOneWidget);
        expect(find.text('Cancelar'), findsOneWidget);
      },
    );

    testWidgets('carga en frío por id (sin extra) con BookingRepository.reserva', (tester) async {
      final reservas = _Reservas([_reserva()]);
      await _abrir(tester, '/reservas/res-1', reservas);

      expect(reservas.consultas, ['res-1']);
      expect(find.text('DIV-CC70944A'), findsOneWidget);
      expect(find.text('Estación San Javier'), findsOneWidget);
    });

    testWidgets('con la reserva en extra no vuelve a pedirla', (tester) async {
      final reservas = _Reservas([_reserva()]);
      await _abrir(tester, '/reservas', reservas);
      await tester.tap(find.text('Street food tour'));
      await tester.pumpAndSettle();

      expect(reservas.consultas, isEmpty);
      expect(find.text('Ver plan'), findsOneWidget);
    });

    testWidgets('una reserva inexistente muestra el error con «Reintentar»', (tester) async {
      await _abrir(tester, '/reservas/nope', _Reservas([_reserva()]));

      expect(find.text('No pudimos cargar la reserva'), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);
      expect(find.text('Ver plan'), findsNothing);
    });

    testWidgets('«Ver plan» abre el plan', (tester) async {
      final router = await _abrir(tester, '/reservas/res-1', _Reservas([_reserva()]));

      await tester.ensureVisible(find.text('Ver plan'));
      await tester.tap(find.text('Ver plan'));
      await tester.pumpAndSettle();

      expect(_ruta(router), '/plan/plan-1');
    });

    testWidgets('«Cancelar» abre la confirmación con la política', (tester) async {
      final router = await _abrir(tester, '/reservas/res-1', _Reservas([_reserva()]));

      await tester.ensureVisible(find.text('Cancelar'));
      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();

      expect(find.text('¿Cancelar reserva?'), findsOneWidget);
      expect(_ruta(router), '/reservas/res-1');
    });

    testWidgets('una reserva que ya salió no se puede cancelar; sí reseñar', (tester) async {
      await _abrir(tester, '/reservas/res-1', _Reservas([_reserva(salida: _enDias(-5))]));

      expect(find.text('Realizada'), findsOneWidget);
      expect(find.text('Cancelar'), findsNothing);
      expect(find.text('Reseñar'), findsOneWidget);
    });

    testWidgets('pendiente de pago ofrece completar el pago y verificar', (tester) async {
      await _abrir(
        tester,
        '/reservas/res-1',
        _Reservas([_reserva(estado: BookingStatus.pendientePago, conPago: false)]),
      );

      expect(find.text('Pendiente'), findsOneWidget);
      expect(find.text('Completar pago'), findsOneWidget);
      expect(find.text('Ya pagué, verificar'), findsOneWidget);
    });

    testWidgets('a 320 px y con letra grande no se desborda', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 1.6;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await _abrir(
        tester,
        '/reservas/res-1',
        _Reservas([
          _reserva(
            plan: _plan(
              titulo:
                  'Recorrido gastronómico por las plazas de mercado más tradicionales del Valle de Aburrá',
              puntoEncuentro: 'Estación San Javier, salida norte, junto a la tienda de la esquina',
              agencia: 'Agencia de viajes con un nombre larguísimo S.A.S.',
            ),
          ),
        ]),
        tamano: const Size(320, 900),
      );

      expect(tester.takeException(), isNull);
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -2000));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
