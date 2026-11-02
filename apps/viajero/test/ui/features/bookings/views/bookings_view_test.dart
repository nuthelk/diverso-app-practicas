import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/bookings/views/bookings_view.dart';

/// «Mis reservas» con salidas reales (relativas a hoy): «Cancelar» solo antes de salir, «Reseñar»
/// solo después, los viajes que ya salieron viven en «Historial» y la lista nunca pasa por
/// encima del título ni de las pestañas. Sin red ni Supabase.

Booking _reserva(
  String codigo,
  Duration salida, {
  BookingStatus estado = BookingStatus.confirmada,
  Plan? plan,
}) => Booking(
  id: codigo,
  codigo: codigo,
  planDateId: 'pd',
  viajeroId: 'v',
  pax: 2,
  montoTotal: 190000,
  estado: estado,
  createdAt: DateTime.now().subtract(const Duration(days: 40)),
  salidaAt: DateTime.now().add(salida),
  plan: plan,
);

Plan _plan({List<String> fotos = const [], bool conAgencia = true}) => Plan(
  id: 'plan-1',
  agencyId: 'ag',
  titulo: 'Comuna 13 y memoria',
  destino: 'Medellín',
  categoria: ExperienceCategory.cultura,
  precioCop: 95000,
  estado: PlanStatus.publicado,
  fotos: fotos,
  agency: conAgencia
      ? Agency(
          id: 'ag',
          nombre: 'EcoAndes Viajes',
          numeroRnt: '12345',
          matriculaCamaraComercio: '999',
          estadoVerificacion: VerificationStatus.verificado,
        )
      : null,
);

class _Reservas implements BookingRepository {
  _Reservas(this.lista);

  final List<Booking> lista;

  @override
  Future<List<Booking>> misReservas() async => lista;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Pasarela implements PaymentGateway {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _abrir(WidgetTester tester, List<Booking> reservas) async {
  tester.view.physicalSize = const Size(800, 1400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<BookingRepository>.value(value: _Reservas(reservas)),
        Provider<PaymentGateway>.value(value: _Pasarela()),
      ],
      child: MaterialApp(theme: AppTheme.viajeroLight(), home: const BookingsView()),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('una confirmada que ya salió está en «Historial», sin «Cancelar» y con «Reseñar»', (
    tester,
  ) async {
    await _abrir(tester, [
      _reserva('PASADA', const Duration(days: -5)),
      _reserva('FUTURA', const Duration(days: 5)),
    ]);

    expect(find.text('Próximas (1)'), findsOneWidget);
    expect(find.text('Historial (1)'), findsOneWidget);

    // Próximas: solo la futura, con «Cancelar» y sin «Reseñar».
    expect(find.textContaining('FUTURA'), findsOneWidget);
    expect(find.textContaining('PASADA'), findsNothing);
    expect(find.text('Cancelar'), findsOneWidget);
    expect(find.text('Reseñar'), findsNothing);

    await tester.tap(find.text('Historial (1)'));
    await tester.pumpAndSettle();

    expect(find.textContaining('PASADA'), findsOneWidget);
    expect(find.textContaining('FUTURA'), findsNothing);
    expect(find.text('Cancelar'), findsNothing);
    expect(find.text('Reseñar'), findsOneWidget);
  });

  testWidgets('el viaje de mañana no se puede reseñar todavía', (tester) async {
    await _abrir(tester, [_reserva('MANANA', const Duration(days: 1))]);

    expect(find.text('Reseñar'), findsNothing);
    expect(find.text('Cancelar'), findsOneWidget);
  });

  testWidgets('la lista queda debajo del título y las pestañas aunque se desplace', (tester) async {
    await _abrir(tester, [for (var i = 0; i < 9; i++) _reserva('FUT$i', Duration(days: 3 + i))]);

    final pestanas = tester.getRect(find.byType(TabBar));
    expect(
      tester.getTopLeft(find.textContaining('FUT0')).dy,
      greaterThanOrEqualTo(pestanas.bottom),
    );

    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();

    // El área visible de la lista nunca sube por encima de las pestañas.
    expect(tester.getTopLeft(find.byType(ListView)).dy, greaterThanOrEqualTo(pestanas.bottom));
    expect(find.text('Mis reservas'), findsOneWidget);
    expect(tester.getRect(find.text('Mis reservas')).bottom, lessThanOrEqualTo(pestanas.top));
  });

  group('tarjeta con la foto del plan', () {
    final encabezado = find.byKey(const ValueKey('encabezado-reserva'));

    testWidgets('con foto: imagen de cabecera con la fecha y el estado encima, título y agencia', (
      tester,
    ) async {
      await _abrir(tester, [
        _reserva(
          'FUT',
          const Duration(days: 5),
          plan: _plan(fotos: const ['https://fotos.test/a.jpg', 'https://fotos.test/b.jpg']),
        ),
      ]);

      expect(find.byKey(const ValueKey('foto-reserva')), findsOneWidget);
      expect(find.byKey(const ValueKey('sin-foto-reserva')), findsNothing);
      expect(find.text('Comuna 13 y memoria'), findsOneWidget);
      expect(find.text('EcoAndes Viajes'), findsOneWidget);
      // Antes: una línea suelta «FUT · 2 pax · \$ 190.000». Ahora el código es una etiqueta y
      // personas y total son un pie propio.
      expect(find.text('FUT'), findsOneWidget);
      expect(find.text('2 personas'), findsOneWidget);
      expect(find.text('\$ 190.000'), findsOneWidget);

      // La insignia de fecha y la píldora de estado van DENTRO de la cabecera (sobre la foto).
      final cab = tester.getRect(encabezado);
      for (final f in [find.byKey(const ValueKey('insignia-fecha')), find.text('Confirmada')]) {
        final r = tester.getRect(f);
        expect(r.top, greaterThanOrEqualTo(cab.top));
        expect(r.bottom, lessThanOrEqualTo(cab.bottom));
        expect(r.left, greaterThanOrEqualTo(cab.left));
        expect(r.right, lessThanOrEqualTo(cab.right));
      }
      // El título queda debajo de la foto.
      expect(
        tester.getTopLeft(find.text('Comuna 13 y memoria')).dy,
        greaterThanOrEqualTo(cab.bottom),
      );
    });

    testWidgets('sin foto: respaldo en su lugar, sin pedir imagen, con fecha, estado y acciones', (
      tester,
    ) async {
      await _abrir(tester, [
        _reserva('FUT', const Duration(days: 5), plan: _plan(conAgencia: false)),
      ]);

      expect(find.byKey(const ValueKey('foto-reserva')), findsNothing);
      expect(find.byKey(const ValueKey('sin-foto-reserva')), findsOneWidget);
      expect(find.byType(Image), findsNothing);
      expect(find.byKey(const ValueKey('insignia-fecha')), findsOneWidget);
      expect(find.text('Confirmada'), findsOneWidget);
      expect(find.text('Comuna 13 y memoria'), findsOneWidget);
      expect(find.text('EcoAndes Viajes'), findsNothing); // sin agencia no hay línea de agencia
      expect(find.text('Cancelar'), findsOneWidget);
    });

    testWidgets('reserva sin plan cargado: título de respaldo y respaldo de foto', (tester) async {
      await _abrir(tester, [_reserva('FUT', const Duration(days: 5))]);

      expect(find.text('Plan'), findsOneWidget);
      expect(find.byKey(const ValueKey('sin-foto-reserva')), findsOneWidget);
    });

    testWidgets('el historial se ve más apagado que las próximas', (tester) async {
      await _abrir(tester, [
        _reserva(
          'PASADA',
          const Duration(days: -5),
          plan: _plan(fotos: const ['https://fotos.test/a.jpg']),
        ),
        _reserva(
          'FUTURA',
          const Duration(days: 5),
          plan: _plan(fotos: const ['https://fotos.test/a.jpg']),
        ),
      ]);
      final proxima = tester.widget<Text>(find.text('Comuna 13 y memoria'));
      await tester.tap(find.text('Historial (1)'));
      await tester.pumpAndSettle();
      final pasada = tester.widget<Text>(find.text('Comuna 13 y memoria'));
      expect(pasada.style!.color!.a, lessThan(proxima.style!.color?.a ?? 1));
    });
  });

  group('etiqueta de estado', () {
    testWidgets('confirmada que ya salió dice «Realizada»; la próxima sigue «Confirmada»', (
      tester,
    ) async {
      await _abrir(tester, [
        _reserva('PASADA', const Duration(days: -5)),
        _reserva('FUTURA', const Duration(days: 5)),
      ]);

      expect(find.text('Confirmada'), findsOneWidget);
      expect(find.text('Realizada'), findsNothing);

      await tester.tap(find.text('Historial (1)'));
      await tester.pumpAndSettle();

      expect(find.text('Realizada'), findsOneWidget);
      expect(find.text('Confirmada'), findsNothing);
      // Solo cambia la etiqueta: las reglas de T9 siguen igual.
      expect(find.text('Reseñar'), findsOneWidget);
      expect(find.text('Cancelar'), findsNothing);
    });

    testWidgets('PRESERVE: «Cancelada», «Pendiente» y «Completada» no cambian aunque ya salieron', (
      tester,
    ) async {
      await _abrir(tester, [
        _reserva('CAN', const Duration(days: -5), estado: BookingStatus.cancelada),
        _reserva('PEN', const Duration(days: -4), estado: BookingStatus.pendientePago),
        _reserva('COM', const Duration(days: -3), estado: BookingStatus.completada),
      ]);
      await tester.tap(find.text('Historial (3)'));
      await tester.pumpAndSettle();

      expect(find.text('Cancelada'), findsOneWidget);
      expect(find.text('Pendiente'), findsOneWidget);
      expect(find.text('Completada'), findsOneWidget);
      expect(find.text('Realizada'), findsNothing);
    });

    testWidgets('PRESERVE: «Pendiente» de un viaje próximo sigue igual', (tester) async {
      await _abrir(tester, [
        _reserva('PEN', const Duration(days: 4), estado: BookingStatus.pendientePago),
      ]);
      expect(find.text('Pendiente'), findsOneWidget);
    });
  });

  testWidgets('PRESERVE: sin reservas muestra el estado vacío', (tester) async {
    await _abrir(tester, const []);

    expect(find.text('Aún no tienes reservas'), findsOneWidget);
  });
}
