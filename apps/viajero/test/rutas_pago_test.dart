import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/router.dart';
import 'package:viajero/theme_mode_controller.dart';
import 'package:viajero/ui/core/app_theme.dart';

/// Pruebas de rutas: lo que sobrevive a una recarga en web es que la URL sola
/// (con ids) reconstruya la pantalla cargando todo del backend. Sin red ni Supabase.

Plan _plan() => Plan(
  id: 'plan-1',
  agencyId: 'ag-1',
  titulo: 'Guatapé en un día',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: 150000,
  estado: PlanStatus.publicado,
  puntoEncuentro: 'Parque Berrío',
  itinerario: [ItinerarioPaso(hora: '06:00', actividad: 'Salida desde Medellín')],
  dates: [
    PlanDate(
      id: 'fecha-1',
      planId: 'plan-1',
      fecha: DateTime.now().add(const Duration(days: 20)),
      cupoTotal: 10,
      cupoDisponible: 8,
    ),
  ],
);

Booking _reserva(BookingStatus estado) => Booking(
  id: 'res-1',
  codigo: 'DIV-ABC123',
  planDateId: 'fecha-1',
  viajeroId: 'v-1',
  pax: 2,
  montoTotal: 300000,
  estado: estado,
  createdAt: DateTime.now(),
  plan: _plan(),
  planDate: _plan().dates.first,
  payments: [
    Payment(
      id: 'p-1',
      bookingId: 'res-1',
      metodo: PaymentMethodOption.tarjeta,
      estado: PaymentStatus.aprobado,
      monto: 300000,
      referencia: 'DIV-ABC123-1',
      provider: 'wompi',
      simulated: false,
    ),
  ],
);

class _Catalogo implements CatalogService {
  final consultas = <String>[];

  @override
  Future<Plan> planDetalle(String planId) async {
    consultas.add(planId);
    if (planId != 'plan-1') throw DiversoException('PLAN_NO_PUBLICADO');
    return _plan();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Reservas implements BookingService {
  _Reservas(this.estado);

  final BookingStatus estado;
  final consultas = <String>[];

  @override
  Future<Booking> reserva(String bookingId) async {
    consultas.add(bookingId);
    if (bookingId != 'res-1') throw DiversoException('RESERVA_NO_EXISTE');
    return _reserva(estado);
  }

  @override
  Future<List<Booking>> misReservas() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Pasarela implements PaymentGateway {
  _Pasarela(this.respuesta);

  final PagoVerificado Function() respuesta;
  final verificaciones = <({String? tx, String? reserva})>[];

  @override
  Future<PagoVerificado> verificar({String? transactionId, String? bookingId}) async {
    verificaciones.add((tx: transactionId, reserva: bookingId));
    return respuesta();
  }

  @override
  Future<CheckoutIniciado> iniciar({required String bookingId, required String redirectUrl}) =>
      throw UnimplementedError();
}

PagoVerificado _pago(EstadoPago estado, [BookingStatus reserva = BookingStatus.confirmada]) =>
    PagoVerificado(
      estado: estado,
      metodo: PaymentMethodOption.tarjeta,
      referencia: 'DIV-ABC123-1',
      bookingId: 'res-1',
      codigo: 'DIV-ABC123',
      bookingEstado: reserva,
    );

Future<GoRouter> _abrir(
  WidgetTester tester,
  String url, {
  required _Catalogo catalogo,
  required _Reservas reservas,
  required _Pasarela pasarela,
}) async {
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = buildViajeroRouter(haySesion: () => true, initialLocation: url);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeController()),
        Provider<CatalogService>.value(value: catalogo),
        Provider<BookingService>.value(value: reservas),
        Provider<PaymentGateway>.value(value: pasarela),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

String _ruta(GoRouter r) => r.routeInformationProvider.value.uri.toString();

void main() {
  late _Catalogo catalogo;
  late _Reservas reservas;

  setUpAll(() => initializeDateFormatting('es'));

  setUp(() {
    catalogo = _Catalogo();
    reservas = _Reservas(BookingStatus.confirmada);
  });

  testWidgets('/checkout/:planId/:fechaId carga plan y fecha por id (sin extra)', (tester) async {
    await _abrir(
      tester,
      '/checkout/plan-1/fecha-1',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.aprobado)),
    );
    expect(catalogo.consultas, ['plan-1']);
    expect(find.text('Guatapé en un día'), findsOneWidget);
    expect(find.text('¿Cuántos viajan?'), findsOneWidget);
    expect(find.text('Total a pagar'), findsOneWidget);
    expect(find.text('Pagar con Wompi'), findsWidgets);
    expect(find.text('Modo de prueba — no se cobra dinero real'), findsOneWidget);
  });

  testWidgets('/checkout con una fecha que no existe en el plan avisa en vez de romperse', (
    tester,
  ) async {
    await _abrir(
      tester,
      '/checkout/plan-1/otra-fecha',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.aprobado)),
    );
    expect(find.textContaining('ya no está disponible'), findsOneWidget);
    expect(find.text('Pagar con Wompi'), findsNothing);
  });

  testWidgets('/reserva/:bookingId muestra la confirmación cargada del backend', (tester) async {
    await _abrir(
      tester,
      '/reserva/res-1',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.aprobado)),
    );
    expect(reservas.consultas, ['res-1']);
    expect(find.text('DIV-ABC123'), findsOneWidget);
    expect(find.text('Guatapé en un día'), findsOneWidget);
    expect(find.textContaining('Pagado con Tarjeta · ref. DIV-ABC123-1 (prueba)'), findsOneWidget);
    expect(find.text('Ver mis reservas'), findsOneWidget);
  });

  testWidgets('/reserva/:bookingId inexistente muestra el error, no una pantalla vacía', (
    tester,
  ) async {
    await _abrir(
      tester,
      '/reserva/nope',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.aprobado)),
    );
    expect(find.textContaining('No encontramos esa reserva'), findsOneWidget);
  });

  testWidgets(
    '/pago/resultado?id=… verifica en el servidor y, si fue aprobado, abre /reserva/:id',
    (tester) async {
      final pasarela = _Pasarela(() => _pago(EstadoPago.aprobado));
      final router = await _abrir(
        tester,
        '/pago/resultado?id=tx-77',
        catalogo: catalogo,
        reservas: reservas,
        pasarela: pasarela,
      );
      expect(pasarela.verificaciones, [(tx: 'tx-77', reserva: null)]);
      expect(_ruta(router), '/reserva/res-1');
      expect(find.text('DIV-ABC123'), findsOneWidget);
    },
  );

  testWidgets('/pago/resultado?reserva=… («Ya pagué, verificar») verifica por reserva', (
    tester,
  ) async {
    final pasarela = _Pasarela(() => _pago(EstadoPago.aprobado));
    await _abrir(
      tester,
      '/pago/resultado?reserva=res-1',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: pasarela,
    );
    expect(pasarela.verificaciones, [(tx: null, reserva: 'res-1')]);
  });

  testWidgets('/pago/resultado rechazado: mensaje y «Intentar de nuevo»', (tester) async {
    await _abrir(
      tester,
      '/pago/resultado?id=tx-1',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.rechazado, BookingStatus.pendientePago)),
    );
    expect(find.textContaining('Wompi rechazó el pago de prueba'), findsOneWidget);
    expect(find.text('Intentar de nuevo'), findsOneWidget);
    expect(find.text('Ver mis reservas'), findsOneWidget);
  });

  testWidgets('/pago/resultado pendiente: reintenta unas veces y luego remite a Mis reservas', (
    tester,
  ) async {
    final pasarela = _Pasarela(() => _pago(EstadoPago.pendiente, BookingStatus.pendientePago));
    await _abrir(
      tester,
      '/pago/resultado?id=tx-1',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: pasarela,
    );
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(seconds: 4));
    }
    expect(pasarela.verificaciones.length, greaterThan(1));
    expect(find.textContaining('Te avisaremos en Mis reservas'), findsOneWidget);
  });

  testWidgets('/pago/resultado sin id ni reserva vuelve a Mis reservas', (tester) async {
    final router = await _abrir(
      tester,
      '/pago/resultado',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.aprobado)),
    );
    expect(_ruta(router), '/reservas');
  });

  testWidgets('las rutas viejas /exito y /checkout (con extra) redirigen sin romper nada', (
    tester,
  ) async {
    final r1 = await _abrir(
      tester,
      '/exito',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.aprobado)),
    );
    expect(_ruta(r1), '/reservas');
    final r2 = await _abrir(
      tester,
      '/checkout',
      catalogo: catalogo,
      reservas: reservas,
      pasarela: _Pasarela(() => _pago(EstadoPago.aprobado)),
    );
    expect(_ruta(r2), '/');
  });
}
