import 'dart:async';

import 'package:diverso_core/diverso_core.dart';

/// [BookingRepository] sin Supabase para pruebas de los view models y las vistas de reservas.
class ReservasFalsas implements BookingRepository {
  ReservasFalsas([List<Booking> lista = const []]) : lista = [...lista];

  List<Booking> lista;

  /// Si no es null, `misReservas` y `reserva` lo lanzan.
  Object? fallo;

  /// Si no es null, `vistaPreviaCancelacion` y `cancelar` lo lanzan.
  Object? falloAlCancelar;

  /// Si no es null, `misReservas` y `reserva` esperan a que se complete (respuestas tardías).
  Completer<void>? compuerta;

  VistaPreviaCancelacion vista = VistaPreviaCancelacion(
    aplica: true,
    porcentaje: 100,
    monto: 190000,
    horasAntes: 72,
    motivo: '',
  );

  ResultadoCancelacion resultado = ResultadoCancelacion(
    aplica: true,
    porcentaje: 100,
    monto: 190000,
    estado: EstadoReembolso.aprobado,
    motivo: '',
  );

  int consultasLista = 0;
  final consultas = <String>[];
  final canceladas = <String>[];

  @override
  Future<List<Booking>> misReservas() async {
    consultasLista++;
    await compuerta?.future;
    if (fallo != null) throw fallo!;
    return lista;
  }

  @override
  Future<Booking> reserva(String bookingId) async {
    consultas.add(bookingId);
    await compuerta?.future;
    if (fallo != null) throw fallo!;
    return lista.firstWhere(
      (b) => b.id == bookingId,
      orElse: () => throw DiversoException('RESERVA_NO_EXISTE'),
    );
  }

  @override
  Future<VistaPreviaCancelacion> vistaPreviaCancelacion(String bookingId) async {
    if (falloAlCancelar != null) throw falloAlCancelar!;
    return vista;
  }

  @override
  Future<ResultadoCancelacion> cancelar(String bookingId) async {
    if (falloAlCancelar != null) throw falloAlCancelar!;
    canceladas.add(bookingId);
    return resultado;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// [ReviewRepository] sin Supabase para el envío de reseñas.
class PublicadorDeResenasFalso implements ReviewRepository {
  /// Si no es null, `crear` lo lanza.
  Object? fallo;

  /// Si no es null, `crear` espera a que se complete.
  Completer<void>? compuerta;

  final creadas = <({String bookingId, int calificacion, String? comentario})>[];

  @override
  Future<void> crear({
    required String bookingId,
    required int calificacion,
    String? comentario,
  }) async {
    await compuerta?.future;
    if (fallo != null) throw fallo!;
    creadas.add((bookingId: bookingId, calificacion: calificacion, comentario: comentario));
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Reserva de prueba confirmada con salida en [salida] (por defecto, 3 días adelante).
Booking reservaDePrueba({
  String id = 'res-1',
  String codigo = 'DIV-AAAA0001',
  DateTime? salida,
  BookingStatus estado = BookingStatus.confirmada,
  bool tieneResena = false,
  Plan? plan,
}) => Booking(
  id: id,
  codigo: codigo,
  planDateId: 'pd',
  viajeroId: 'v',
  pax: 2,
  montoTotal: 190000,
  estado: estado,
  createdAt: DateTime(2026, 10, 1),
  salidaAt: salida ?? DateTime.now().add(const Duration(days: 3)),
  tieneResena: tieneResena,
  plan: plan,
);
