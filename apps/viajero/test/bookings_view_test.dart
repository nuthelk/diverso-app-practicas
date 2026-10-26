import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/app_theme.dart';
import 'package:viajero/ui/features/bookings/bookings_view.dart';

/// «Mis reservas» con salidas reales (relativas a hoy): «Cancelar» solo antes de salir, «Reseñar»
/// solo después, los viajes que ya salieron viven en «Historial» y la lista nunca pasa por
/// encima del título ni de las pestañas. Sin red ni Supabase.

Booking _reserva(
  String codigo,
  Duration salida, {
  BookingStatus estado = BookingStatus.confirmada,
}) =>
    Booking(
      id: codigo,
      codigo: codigo,
      planDateId: 'pd',
      viajeroId: 'v',
      pax: 2,
      montoTotal: 190000,
      estado: estado,
      createdAt: DateTime.now().subtract(const Duration(days: 40)),
      salidaAt: DateTime.now().add(salida),
    );

class _Reservas implements BookingService {
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
  await tester.pumpWidget(MultiProvider(
    providers: [
      Provider<BookingService>.value(value: _Reservas(reservas)),
      Provider<PaymentGateway>.value(value: _Pasarela()),
    ],
    child: MaterialApp(theme: AppTheme.viajeroLight(), home: const BookingsView()),
  ));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('una confirmada que ya salió está en «Historial», sin «Cancelar» y con «Reseñar»', (tester) async {
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
    await _abrir(tester, [
      for (var i = 0; i < 9; i++) _reserva('FUT$i', Duration(days: 3 + i)),
    ]);

    final pestanas = tester.getRect(find.byType(TabBar));
    expect(tester.getTopLeft(find.textContaining('FUT0')).dy, greaterThanOrEqualTo(pestanas.bottom));

    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();

    // El área visible de la lista nunca sube por encima de las pestañas.
    expect(tester.getTopLeft(find.byType(ListView)).dy, greaterThanOrEqualTo(pestanas.bottom));
    expect(find.text('Mis reservas'), findsOneWidget);
    expect(tester.getRect(find.text('Mis reservas')).bottom, lessThanOrEqualTo(pestanas.top));
  });

  testWidgets('PRESERVE: sin reservas muestra el estado vacío', (tester) async {
    await _abrir(tester, const []);

    expect(find.text('Aún no tienes reservas'), findsOneWidget);
  });
}
