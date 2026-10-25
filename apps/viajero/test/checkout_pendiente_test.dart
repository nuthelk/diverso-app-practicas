import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/router.dart';
import 'package:viajero/theme_mode_controller.dart';
import 'package:viajero/ui/core/app_theme.dart';
import 'package:viajero/ui/features/checkout/checkout_controller.dart';
import 'package:viajero/ui/features/checkout/reserva_pendiente_aviso.dart';

/// Reserva pendiente de pago ya existente: el checkout no debe crear otra (retendría cupos
/// dos veces durante 30 min), sino ofrecer completarla o cancelarla. Sin red ni Supabase.

final _fecha = PlanDate(
  id: 'fecha-1',
  planId: 'plan-1',
  fecha: DateTime.now().add(const Duration(days: 20)),
  cupoTotal: 10,
  cupoDisponible: 8,
);

Plan _plan() => Plan(
      id: 'plan-1',
      agencyId: 'ag-1',
      titulo: 'Guatapé en un día',
      destino: 'Guatapé',
      categoria: ExperienceCategory.aventura,
      precioCop: 150000,
      estado: PlanStatus.publicado,
      dates: [_fecha],
    );

Booking _pendiente({int pax = 2, Duration hace = const Duration(minutes: 5)}) => Booking(
      id: 'pend-1',
      codigo: 'DIV-PEND01',
      planDateId: 'fecha-1',
      viajeroId: 'v-1',
      pax: pax,
      montoTotal: 150000.0 * pax,
      estado: BookingStatus.pendientePago,
      createdAt: DateTime.now().subtract(hace),
    );

class _Reservas implements BookingService {
  _Reservas({this.pendiente});

  Booking? pendiente;
  bool fallaLaBusqueda = false;
  DiversoException? fallaCancelar;
  final creadas = <String>[];
  final canceladas = <String>[];
  int busquedas = 0;

  @override
  Future<Booking?> reservaPendiente(String planDateId) async {
    busquedas++;
    if (fallaLaBusqueda) throw DiversoException('ERROR_BD');
    return pendiente;
  }

  @override
  Future<CreatedBooking> crearReserva({required String planDateId, required int pax}) async {
    creadas.add('$planDateId:$pax');
    return CreatedBooking(bookingId: 'nueva-${creadas.length}', codigo: 'DIV-NEW', montoTotal: 1, planTitulo: '');
  }

  @override
  Future<ResultadoCancelacion> cancelar(String bookingId) async {
    if (fallaCancelar != null) throw fallaCancelar!;
    canceladas.add(bookingId);
    if (pendiente?.id == bookingId) pendiente = null;
    return ResultadoCancelacion(
      aplica: false,
      porcentaje: 0,
      monto: 0,
      estado: EstadoReembolso.noAplica,
      motivo: 'Reserva sin pago confirmado',
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Catalogo implements CatalogService {
  @override
  Future<Plan> planDetalle(String planId) async => _plan();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// `iniciar` falla a propósito: así «Completar pago» no abre el WebView (no existe en pruebas)
/// pero queda registrado a qué reserva se le pidió el checkout.
class _Pasarela implements PaymentGateway {
  final iniciadas = <String>[];

  @override
  Future<CheckoutIniciado> iniciar({required String bookingId, required String redirectUrl}) async {
    iniciadas.add(bookingId);
    throw DiversoException('RESERVA_VENCIDA');
  }

  @override
  Future<PagoVerificado> verificar({String? transactionId, String? bookingId}) => throw UnimplementedError();
}

String _hora(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('CheckoutController', () {
    late _Reservas reservas;
    late CheckoutController c;
    final abiertos = <String>[];
    Future<bool> Function(String) abrir(bool terminado) => (id) async {
          abiertos.add(id);
          return terminado;
        };

    setUp(() {
      reservas = _Reservas(pendiente: _pendiente());
      c = CheckoutController(reservas: reservas);
      abiertos.clear();
    });
    tearDown(() => c.dispose());

    test('al abrir busca la reserva pendiente de esa fecha y la expone', () async {
      await c.cargarPendiente(_fecha);
      expect(c.pendiente?.id, 'pend-1');
      expect(reservas.creadas, isEmpty);
    });

    test('sin reserva pendiente no hay aviso', () async {
      reservas.pendiente = null;
      await c.cargarPendiente(_fecha);
      expect(c.pendiente, isNull);
    });

    test('si la búsqueda falla, el checkout sigue usable (la guarda real está en pagar)', () async {
      reservas.fallaLaBusqueda = true;
      await c.cargarPendiente(_fecha);
      expect(c.pendiente, isNull);
      expect(c.error, isNull);
    });

    test('pagar con una pendiente existente NO crea otra reserva ni abre el pago', () async {
      await c.pagar(_fecha, abrir(true));
      expect(reservas.creadas, isEmpty);
      expect(abiertos, isEmpty);
      expect(c.pendiente?.id, 'pend-1', reason: 'se muestra el aviso aunque la carga inicial no haya terminado');
      expect(c.procesando, isFalse);
    });

    test('pagar dos veces reutiliza la misma reserva (solo se crea una)', () async {
      reservas.pendiente = null;
      await c.pagar(_fecha, abrir(false));
      await c.pagar(_fecha, abrir(false));
      expect(reservas.creadas, ['fecha-1:1']);
      expect(abiertos, ['nueva-1', 'nueva-1']);
    });

    test('un segundo pagar mientras el primero sigue en curso se ignora', () async {
      reservas.pendiente = null;
      final primero = c.pagar(_fecha, abrir(true));
      await c.pagar(_fecha, abrir(true));
      await primero;
      expect(reservas.creadas, hasLength(1));
      expect(abiertos, hasLength(1));
    });

    test('completarPendiente reutiliza esa reserva: mismo id y personas, sin crear otra', () async {
      await c.cargarPendiente(_fecha);
      await c.completarPendiente(abrir(true));
      expect(abiertos, ['pend-1']);
      expect(reservas.creadas, isEmpty);
      expect(c.pendiente, isNull);
      expect(c.bookingId, 'pend-1');
      expect(c.pax, 2);
      c.setPax(5);
      expect(c.pax, 2, reason: 'con la reserva ya creada no se cambian las personas');
    });

    test('completarPendiente: si el pago se cierra sin terminar, avisa y se puede reintentar', () async {
      await c.cargarPendiente(_fecha);
      await c.completarPendiente(abrir(false));
      expect(c.error, contains('Cerraste el pago'));
      await c.pagar(_fecha, abrir(false));
      expect(abiertos, ['pend-1', 'pend-1']);
      expect(reservas.creadas, isEmpty);
    });

    test('cancelarPendiente cancela por reservas-cancelar y deja seguir como una compra nueva', () async {
      await c.cargarPendiente(_fecha);
      await c.cancelarPendiente();
      expect(reservas.canceladas, ['pend-1']);
      expect(c.pendiente, isNull);
      expect(c.error, isNull);

      c.setPax(3);
      await c.pagar(_fecha, abrir(true));
      expect(reservas.creadas, ['fecha-1:3']);
      expect(abiertos, ['nueva-1']);
    });

    test('cancelarPendiente que falla deja el mensaje y mantiene el aviso', () async {
      reservas.fallaCancelar = DiversoException('ESTADO_INVALIDO');
      await c.cargarPendiente(_fecha);
      await c.cancelarPendiente();
      expect(c.error, 'La reserva ya no admite esta operación.');
      expect(c.pendiente?.id, 'pend-1');
      expect(c.procesando, isFalse);
    });
  });

  group('aviso de reserva pendiente', () {
    test('la retención dura 30 minutos desde la creación', () {
      final b = _pendiente(hace: const Duration(minutes: 5));
      expect(b.venceAt, b.createdAt.add(const Duration(minutes: 30)));
    });

    test('texto: personas, total y hora de vencimiento', () {
      final b = _pendiente(pax: 2);
      expect(
        textoReservaPendiente(b),
        'Ya tienes una reserva pendiente de pago para esta fecha (2 personas, \$ 300.000). '
        'Vence a las ${_hora(b.venceAt.toLocal())}.',
      );
      expect(textoReservaPendiente(_pendiente(pax: 1)), contains('(1 persona, \$ 150.000)'));
    });
  });

  group('pantalla /checkout/:planId/:fechaId', () {
    Future<void> abrirCheckout(WidgetTester tester, _Reservas reservas, _Pasarela pasarela) async {
      tester.view.physicalSize = const Size(900, 2600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);
      final router = buildViajeroRouter(haySesion: () => true, initialLocation: '/checkout/plan-1/fecha-1');
      await tester.pumpWidget(MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ThemeModeController()),
          Provider<CatalogService>.value(value: _Catalogo()),
          Provider<BookingService>.value(value: reservas),
          Provider<PaymentGateway>.value(value: pasarela),
        ],
        child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
      ));
      await tester.pumpAndSettle();
    }

    // El botón inferior es el único FilledButton que contiene el candado.
    FilledButton botonPagar(WidgetTester tester) => tester.widget<FilledButton>(find.ancestor(
          of: find.byIcon(Icons.lock_rounded),
          matching: find.byWidgetPredicate((w) => w is FilledButton),
        ));

    testWidgets('con una pendiente muestra el aviso, las dos acciones y bloquea «Pagar»', (tester) async {
      final reservas = _Reservas(pendiente: _pendiente());
      await abrirCheckout(tester, reservas, _Pasarela());

      expect(find.textContaining('Ya tienes una reserva pendiente de pago para esta fecha (2 personas, \$ 300.000)'),
          findsOneWidget);
      expect(find.textContaining('Vence a las ${_hora(_pendiente().venceAt.toLocal())}.'), findsOneWidget);
      expect(find.text('Completar pago'), findsOneWidget);
      expect(find.text('Cancelar y empezar de nuevo'), findsOneWidget);
      expect(botonPagar(tester).onPressed, isNull);
      expect(reservas.creadas, isEmpty);
    });

    testWidgets('«Completar pago» pide el checkout de ESA reserva, sin crear otra', (tester) async {
      final reservas = _Reservas(pendiente: _pendiente());
      final pasarela = _Pasarela();
      await abrirCheckout(tester, reservas, pasarela);

      await tester.tap(find.text('Completar pago'));
      await tester.pumpAndSettle();

      expect(pasarela.iniciadas, ['pend-1']);
      expect(reservas.creadas, isEmpty);
      expect(find.textContaining('venció'), findsOneWidget, reason: 'el error de pagos-iniciar se muestra');
    });

    testWidgets('«Cancelar y empezar de nuevo» cancela, quita el aviso y habilita «Pagar»', (tester) async {
      final reservas = _Reservas(pendiente: _pendiente());
      await abrirCheckout(tester, reservas, _Pasarela());

      await tester.tap(find.text('Cancelar y empezar de nuevo'));
      await tester.pumpAndSettle();

      expect(reservas.canceladas, ['pend-1']);
      expect(find.textContaining('Ya tienes una reserva pendiente'), findsNothing);
      expect(botonPagar(tester).onPressed, isNotNull);
    });

    testWidgets('sin reserva pendiente no hay aviso y «Pagar» está habilitado', (tester) async {
      await abrirCheckout(tester, _Reservas(), _Pasarela());
      expect(find.textContaining('Ya tienes una reserva pendiente'), findsNothing);
      expect(botonPagar(tester).onPressed, isNotNull);
    });
  });
}
