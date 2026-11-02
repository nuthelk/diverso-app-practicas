import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show FunctionException, PostgrestException;

import '../../support/edge_functions_falsas.dart';

/// Api falsa: devuelve las filas que se le indiquen y registra qué se le pidió. No sabe nada de
/// Supabase; así se prueban las reglas del repositorio sin red.
class _BookingApiFalsa implements BookingApi {
  @override
  String? usuarioId = 'viajero-1';

  /// Lo que lanza cualquier consulta (null = responde normal).
  Object? falla;

  Map<String, dynamic> filaCrear = {};
  List<Map<String, dynamic>> reservas = [];
  List<Map<String, dynamic>> resenas = [];
  Map<String, dynamic>? filaReserva;
  Map<String, dynamic>? filaResena;
  List<Map<String, dynamic>> pendientes = [];
  Map<String, dynamic> filaVistaPrevia = {};

  final consultas = <String>[];
  DateTime? creadaDespuesDe;

  T _consulta<T>(String nombre, T respuesta) {
    consultas.add(nombre);
    final f = falla;
    if (f != null) throw f;
    return respuesta;
  }

  @override
  Future<Map<String, dynamic>> crearReserva({required String planDateId, required int pax}) async =>
      _consulta('crearReserva', filaCrear);

  @override
  Future<List<Map<String, dynamic>>> reservasDe(String viajeroId) async =>
      _consulta('reservasDe', reservas);

  @override
  Future<List<Map<String, dynamic>>> resenasDe(String viajeroId) async =>
      _consulta('resenasDe', resenas);

  @override
  Future<Map<String, dynamic>?> reserva(String bookingId) async =>
      _consulta('reserva', filaReserva);

  @override
  Future<Map<String, dynamic>?> resenaDe(String bookingId) async =>
      _consulta('resenaDe', filaResena);

  @override
  Future<List<Map<String, dynamic>>> pendientesDe({
    required String viajeroId,
    required String planDateId,
    required DateTime creadaDespuesDe,
  }) async {
    this.creadaDespuesDe = creadaDespuesDe;
    return _consulta('pendientesDe', pendientes);
  }

  @override
  Future<Map<String, dynamic>> vistaPreviaCancelacion(String bookingId) async =>
      _consulta('vistaPreviaCancelacion', filaVistaPrevia);
}

Map<String, dynamic> _fila(String id, {String estado = 'confirmada'}) => {
  'id': id,
  'codigo': 'DIV-$id',
  'plan_date_id': 'pd-1',
  'viajero_id': 'viajero-1',
  'pax': 2,
  'monto_total': 200000,
  'estado': estado,
  'created_at': '2026-10-25T10:00:00+00:00',
};

FunctionException _http(int status, Map<String, dynamic> cuerpo) =>
    FunctionException(status: status, details: cuerpo);

Future<DiversoException> _error(Future<Object?> Function() accion) async {
  try {
    await accion();
  } on DiversoException catch (e) {
    return e;
  }
  throw TestFailure('debía lanzar DiversoException');
}

BookingRepository _repo(_BookingApiFalsa api, [EdgeFunctionsFalsas? edge]) => BookingRepository(
  api: api,
  edgeFunctions: edge ?? EdgeFunctionsFalsas((_, _) => throw StateError('sin Edge Functions')),
);

void main() {
  group('crearReserva', () {
    test('convierte la fila de create_booking en CreatedBooking', () async {
      final api = _BookingApiFalsa()
        ..filaCrear = {
          'booking_id': 'b-1',
          'codigo': 'DIV-AB12',
          'monto_total': 300000,
          'plan_titulo': 'Guatapé',
          'fecha': '2026-11-20',
        };
      final r = await _repo(api).crearReserva(planDateId: 'pd-1', pax: 2);
      expect(r.bookingId, 'b-1');
      expect(r.codigo, 'DIV-AB12');
      expect(r.montoTotal, 300000);
      expect(r.planTitulo, 'Guatapé');
      expect(r.fecha, DateTime(2026, 11, 20));
    });

    test('sin plan_titulo ni fecha: título vacío y fecha nula', () async {
      final api = _BookingApiFalsa()
        ..filaCrear = {'booking_id': 'b', 'codigo': 'C', 'monto_total': 1};
      final r = await _repo(api).crearReserva(planDateId: 'pd-1', pax: 1);
      expect(r.planTitulo, '');
      expect(r.fecha, isNull);
    });

    test('un error de PostgREST sale como DiversoException con su código', () async {
      final api = _BookingApiFalsa()
        ..falla = const PostgrestException(message: 'SIN_CUPO', code: 'P0001');
      final e = await _error(() => _repo(api).crearReserva(planDateId: 'pd-1', pax: 2));
      expect(e.codigo, 'SIN_CUPO');
      expect(e.mensajeUsuario, contains('cupos'));
    });

    test('RESERVA_PENDIENTE_EXISTENTE conserva el id de la reserva existente', () async {
      final api = _BookingApiFalsa()
        ..falla = const PostgrestException(
          message: 'RESERVA_PENDIENTE_EXISTENTE',
          code: 'P0001',
          details: 'b-9',
        );
      final e = await _error(() => _repo(api).crearReserva(planDateId: 'pd-1', pax: 2));
      expect(e.codigo, 'RESERVA_PENDIENTE_EXISTENTE');
      expect(e.detalle?['booking_id'], 'b-9');
    });

    test('un fallo que no es de PostgREST sale como ERROR_INESPERADO', () async {
      final api = _BookingApiFalsa()..falla = StateError('se cayó');
      final e = await _error(() => _repo(api).crearReserva(planDateId: 'pd-1', pax: 2));
      expect(e.codigo, 'ERROR_INESPERADO');
    });
  });

  group('misReservas', () {
    test('sin sesión: lista vacía y no consulta nada', () async {
      final api = _BookingApiFalsa()..usuarioId = null;
      expect(await _repo(api).misReservas(), isEmpty);
      expect(api.consultas, isEmpty);
    });

    test('sin reservas: no pide las reseñas', () async {
      final api = _BookingApiFalsa();
      expect(await _repo(api).misReservas(), isEmpty);
      expect(api.consultas, ['reservasDe']);
    });

    test('marca con reseña solo las reservas reseñadas y respeta el orden', () async {
      final api = _BookingApiFalsa()
        ..reservas = [_fila('b1'), _fila('b2'), _fila('b3')]
        ..resenas = [
          {'booking_id': 'b2'},
        ];
      final r = await _repo(api).misReservas();
      expect(r.map((b) => b.id), ['b1', 'b2', 'b3']);
      expect(r.map((b) => b.tieneResena), [false, true, false]);
      expect(api.consultas, ['reservasDe', 'resenasDe']);
    });
  });

  group('reserva (por id)', () {
    test('sin reseña: la devuelve tal cual', () async {
      final api = _BookingApiFalsa()..filaReserva = _fila('b1');
      final b = await _repo(api).reserva('b1');
      expect(b.id, 'b1');
      expect(b.tieneResena, isFalse);
    });

    test('con reseña: la marca para no ofrecer «Reseñar» otra vez', () async {
      final api = _BookingApiFalsa()
        ..filaReserva = _fila('b1')
        ..filaResena = {'id': 'r1'};
      expect((await _repo(api).reserva('b1')).tieneResena, isTrue);
    });

    test('no existe: RESERVA_NO_EXISTE (no se convierte en ERROR_INESPERADO)', () async {
      final api = _BookingApiFalsa();
      final e = await _error(() => _repo(api).reserva('nada'));
      expect(e.codigo, 'RESERVA_NO_EXISTE');
      expect(api.consultas, ['reserva']);
    });

    test('un error de PostgREST sale como DiversoException', () async {
      final api = _BookingApiFalsa()
        ..falla = const PostgrestException(message: 'NO_AUTENTICADO', code: 'P0001');
      final e = await _error(() => _repo(api).reserva('b1'));
      expect(e.codigo, 'NO_AUTENTICADO');
    });
  });

  group('reservaPendiente (ventana de 30 minutos)', () {
    test('sin sesión: null y no consulta', () async {
      final api = _BookingApiFalsa()..usuarioId = null;
      expect(await _repo(api).reservaPendiente('pd-1'), isNull);
      expect(api.consultas, isEmpty);
    });

    test('pide solo las creadas en los últimos 30 minutos (Booking.retencion, en UTC)', () async {
      final api = _BookingApiFalsa();
      final antes = DateTime.now().toUtc();
      await _repo(api).reservaPendiente('pd-1');
      final despues = DateTime.now().toUtc();
      final desde = api.creadaDespuesDe!;
      expect(desde.isUtc, isTrue);
      expect(Booking.retencion, const Duration(minutes: 30));
      expect(desde.isBefore(antes.subtract(Booking.retencion)), isFalse);
      expect(desde.isAfter(despues.subtract(Booking.retencion)), isFalse);
    });

    test('sin filas: null; con filas: la primera', () async {
      final api = _BookingApiFalsa();
      expect(await _repo(api).reservaPendiente('pd-1'), isNull);
      api.pendientes = [_fila('b1', estado: 'pendiente_pago'), _fila('b0')];
      final b = await _repo(api).reservaPendiente('pd-1');
      expect(b!.id, 'b1');
      expect(b.estado, BookingStatus.pendientePago);
    });

    test('un error de PostgREST sale como DiversoException', () async {
      final api = _BookingApiFalsa()..falla = const PostgrestException(message: 'algo raro');
      final e = await _error(() => _repo(api).reservaPendiente('pd-1'));
      expect(e.codigo, 'ERROR_BD');
    });
  });

  group('vistaPreviaCancelacion', () {
    test('lee la fila del RPC', () async {
      final api = _BookingApiFalsa()
        ..filaVistaPrevia = {
          'booking_id': 'b',
          'horas_antes': 30.5,
          'aplica': true,
          'porcentaje': 50,
          'monto': 150000.0,
          'motivo': 'x',
        };
      final v = await _repo(api).vistaPreviaCancelacion('b');
      expect(v.porcentaje, 50);
      expect(v.monto, 150000);
    });

    test('un error de PostgREST sale como DiversoException', () async {
      final api = _BookingApiFalsa()
        ..falla = const PostgrestException(message: 'NO_ES_DUENO', code: 'P0001');
      final e = await _error(() => _repo(api).vistaPreviaCancelacion('b'));
      expect(e.codigo, 'NO_ES_DUENO');
    });
  });

  group('cancelar (reservas-cancelar)', () {
    Map<String, dynamic> cancelada(Map<String, dynamic> r) => {
      'estado': 'cancelada',
      'reembolso': r,
    };

    test('llama a reservas-cancelar y lee el reembolso aprobado', () async {
      final edge = EdgeFunctionsFalsas(
        (_, _) => cancelada({
          'aplica': true,
          'porcentaje': 50,
          'monto': 150000,
          'estado': 'aprobado',
          'motivo':
              'Cancelación con menos de 48 h y al menos 24 h de anticipación: reembolso del 50 %',
        }),
      );
      final r = await _repo(_BookingApiFalsa(), edge).cancelar('b-1');
      expect(edge.llamadas.single.$1, 'reservas-cancelar');
      expect(edge.llamadas.single.$2, {'booking_id': 'b-1'});
      expect(r.aplica, isTrue);
      expect(r.porcentaje, 50);
      expect(r.monto, 150000);
      expect(r.estado, EstadoReembolso.aprobado);
      expect(r.estado.etiqueta, 'Reembolso de prueba aprobado');
    });

    test('estados pendiente, rechazado y no_aplica', () async {
      for (final (raw, esperado, etiqueta) in [
        ('pendiente', EstadoReembolso.pendiente, 'Reembolso de prueba pendiente'),
        ('rechazado', EstadoReembolso.rechazado, 'Reembolso de prueba rechazado'),
        ('no_aplica', EstadoReembolso.noAplica, 'Sin reembolso'),
      ]) {
        final edge = EdgeFunctionsFalsas(
          (_, _) => cancelada({
            'aplica': raw != 'no_aplica',
            'porcentaje': raw == 'no_aplica' ? 0 : 100,
            'monto': raw == 'no_aplica' ? 0 : 300000,
            'estado': raw,
            'motivo': 'm',
          }),
        );
        final r = await _repo(_BookingApiFalsa(), edge).cancelar('b-1');
        expect(r.estado, esperado);
        expect(r.estado.etiqueta, etiqueta);
      }
    });

    test('errores de la función: ESTADO_INVALIDO', () async {
      final edge = EdgeFunctionsFalsas((_, _) => _http(409, {'error': 'ESTADO_INVALIDO'}));
      final e = await _error(() => _repo(_BookingApiFalsa(), edge).cancelar('b-1'));
      expect(e.codigo, 'ESTADO_INVALIDO');
    });
  });
}
