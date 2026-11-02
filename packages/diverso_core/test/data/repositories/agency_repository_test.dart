import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;

/// Api falsa del panel de agencias: guarda lo que se le escribe y devuelve las filas indicadas.
class _AgencyApiFalsa implements AgencyApi {
  @override
  String? usuarioId = 'dueno-1';

  Object? falla;
  Map<String, dynamic>? filaAgencia;
  List<Map<String, dynamic>> planes = [];
  List<Map<String, dynamic>> ventas = [];

  final escrituras = <(String, Object?)>[];
  String? ownerConsultado;

  void _escribe(String nombre, [Object? dato]) {
    escrituras.add((nombre, dato));
    final f = falla;
    if (f != null) throw f;
  }

  @override
  Future<Map<String, dynamic>?> agenciaDe(String ownerUserId) async {
    ownerConsultado = ownerUserId;
    return filaAgencia;
  }

  @override
  Future<void> insertarAgencia(Map<String, dynamic> fila) async => _escribe('agencia', fila);

  @override
  Future<List<Map<String, dynamic>>> planesDe(String agencyId) async => planes;

  @override
  Future<Map<String, dynamic>> insertarPlan(Map<String, dynamic> fila) async {
    _escribe('plan', fila);
    return {'id': 'plan-nuevo'};
  }

  @override
  Future<void> actualizarPlan(String planId, Map<String, dynamic> cambios) async =>
      _escribe('actualizar:$planId', cambios);

  @override
  Future<void> insertarFecha(Map<String, dynamic> fila) async => _escribe('fecha', fila);

  @override
  Future<void> eliminarFecha(String planDateId) async => _escribe('eliminar:$planDateId');

  @override
  Future<List<Map<String, dynamic>>> ventasDe(String agencyId, {required int limit}) async {
    escrituras.add(('ventas:$agencyId', limit));
    return ventas;
  }
}

Map<String, dynamic> _filaAgencia() => {
  'id': 'ag-1',
  'owner_user_id': 'dueno-1',
  'nombre': 'Aventuras SAS',
  'numero_rnt': '12345',
  'estado_verificacion': 'verificado',
};

PlanDraft _borrador({String? id, String duracion = '1 día'}) => PlanDraft(
  id: id,
  titulo: 'Cañón',
  destino: 'Jericó',
  categoria: ExperienceCategory.gastronomia,
  precioCop: 90000,
  resumen: 'r',
  descripcion: 'd',
  duracionTexto: duracion,
  puntoEncuentro: 'Parque',
  incluye: const ['Almuerzo'],
  incluyeTransporte: true,
  incluyeComida: true,
  incluyeHospedaje: false,
  itinerario: [ItinerarioPaso(hora: '08:00', actividad: 'Salida')],
  politicaCancelacion: 'p',
  fotos: const [],
);

Future<DiversoException> _error(Future<Object?> Function() accion) async {
  try {
    await accion();
  } on DiversoException catch (e) {
    return e;
  }
  throw TestFailure('debía lanzar DiversoException');
}

void main() {
  group('miAgencia', () {
    test('sin sesión: null y no consulta', () async {
      final api = _AgencyApiFalsa()..usuarioId = null;
      expect(await AgencyRepository(api: api).miAgencia(), isNull);
      expect(api.ownerConsultado, isNull);
    });

    test('sin agencia registrada: null', () async {
      expect(await AgencyRepository(api: _AgencyApiFalsa()).miAgencia(), isNull);
    });

    test('con agencia: la lee de la fila del dueño', () async {
      final api = _AgencyApiFalsa()..filaAgencia = _filaAgencia();
      final a = await AgencyRepository(api: api).miAgencia();
      expect(api.ownerConsultado, 'dueno-1');
      expect(a!.nombre, 'Aventuras SAS');
      expect(a.estadoVerificacion, VerificationStatus.verificado);
    });
  });

  group('registrarAgencia', () {
    Future<void> registrar(AgencyRepository repo) => repo.registrarAgencia(
      nombre: 'Aventuras SAS',
      numeroRnt: '12345',
      matriculaCamaraComercio: 'M-1',
      ciudad: 'Medellín',
      telefono: '300',
      email: 'a@a.co',
      whatsapp: '300',
      descripcion: 'd',
    );

    test('inserta la fila con el dueño y sin estado de verificación (lo fuerza la RLS)', () async {
      final api = _AgencyApiFalsa();
      await registrar(AgencyRepository(api: api));
      final (nombre, fila) = api.escrituras.single;
      expect(nombre, 'agencia');
      expect(fila, {
        'owner_user_id': 'dueno-1',
        'nombre': 'Aventuras SAS',
        'numero_rnt': '12345',
        'matricula_camara_comercio': 'M-1',
        'ciudad': 'Medellín',
        'telefono': '300',
        'email': 'a@a.co',
        'whatsapp': '300',
        'descripcion': 'd',
      });
    });

    test('un error de la BD sale como DiversoException', () async {
      final api = _AgencyApiFalsa()..falla = const PostgrestException(message: 'RNT_VENCIDO');
      final e = await _error(() => registrar(AgencyRepository(api: api)));
      expect(e.codigo, 'RNT_VENCIDO');
    });
  });

  group('planes', () {
    test('misPlanes: un Plan por fila', () async {
      final api = _AgencyApiFalsa()
        ..planes = [
          {
            'id': 'p1',
            'agency_id': 'ag-1',
            'titulo': 'Cañón',
            'destino': 'Jericó',
            'precio_cop': 90000,
            'estado': 'borrador',
          },
        ];
      final r = await AgencyRepository(api: api).misPlanes('ag-1');
      expect(r.single.titulo, 'Cañón');
      expect(r.single.estado, PlanStatus.borrador);
    });

    test('crearPlan: inserta el borrador con su agencia y devuelve el id nuevo', () async {
      final api = _AgencyApiFalsa();
      final id = await AgencyRepository(api: api).crearPlan('ag-1', _borrador());
      expect(id, 'plan-nuevo');
      final (nombre, fila) = api.escrituras.single;
      expect(nombre, 'plan');
      final mapa = fila! as Map<String, dynamic>;
      expect(mapa['agency_id'], 'ag-1');
      expect(mapa['categoria'], 'gastronomia');
      expect(mapa['duracion_horas'], 12);
      expect(mapa['itinerario'], [
        {'hora': '08:00', 'actividad': 'Salida'},
      ]);
    });

    test('actualizarPlan: actualiza por id con el mapa del borrador', () async {
      final api = _AgencyApiFalsa();
      await AgencyRepository(api: api).actualizarPlan(_borrador(id: 'p1', duracion: '2 días'));
      final (nombre, cambios) = api.escrituras.single;
      expect(nombre, 'actualizar:p1');
      expect((cambios! as Map<String, dynamic>)['duracion_horas'], 40);
    });

    test('publicarPlan: publicado ↔ borrador, con el valor de la BD', () async {
      final api = _AgencyApiFalsa();
      final repo = AgencyRepository(api: api);
      await repo.publicarPlan('p1', publicado: true);
      await repo.publicarPlan('p1', publicado: false);
      expect(api.escrituras.map((e) => e.$1), ['actualizar:p1', 'actualizar:p1']);
      expect(api.escrituras.map((e) => e.$2), [
        {'estado': 'publicado'},
        {'estado': 'borrador'},
      ]);
    });

    test('un error de la BD sale como DiversoException en crear, actualizar y publicar', () async {
      final api = _AgencyApiFalsa()
        ..falla = const PostgrestException(message: 'AGENCIA_NO_VERIFICADA');
      final repo = AgencyRepository(api: api);
      for (final accion in <Future<Object?> Function()>[
        () => repo.crearPlan('ag-1', _borrador()),
        () => repo.actualizarPlan(_borrador(id: 'p1')),
        () => repo.publicarPlan('p1', publicado: true),
      ]) {
        expect((await _error(accion)).codigo, 'AGENCIA_NO_VERIFICADA');
      }
    });
  });

  group('fechas y ventas', () {
    test('agregarFecha: el cupo disponible empieza igual al total', () async {
      final api = _AgencyApiFalsa();
      await AgencyRepository(
        api: api,
      ).agregarFecha(planId: 'p1', fecha: DateTime(2026, 12, 5), cupoTotal: 12);
      final (nombre, fila) = api.escrituras.single;
      expect(nombre, 'fecha');
      expect(fila, {
        'plan_id': 'p1',
        'fecha': '2026-12-05',
        'cupo_total': 12,
        'cupo_disponible': 12,
      });
    });

    test('agregarFecha: un error de la BD sale como DiversoException', () async {
      final api = _AgencyApiFalsa()..falla = const PostgrestException(message: 'FECHA_PASADA');
      final e = await _error(
        () => AgencyRepository(
          api: api,
        ).agregarFecha(planId: 'p1', fecha: DateTime(2020), cupoTotal: 1),
      );
      expect(e.codigo, 'FECHA_PASADA');
    });

    test('eliminarFecha: borra por id', () async {
      final api = _AgencyApiFalsa();
      await AgencyRepository(api: api).eliminarFecha('pd-1');
      expect(api.escrituras.single.$1, 'eliminar:pd-1');
    });

    test('ventas: un VentaRow por fila, con límite 200 por defecto', () async {
      final api = _AgencyApiFalsa()
        ..ventas = [
          {
            'codigo': 'DIV-1',
            'plan_titulo': 'Cañón',
            'destino': 'Jericó',
            'fecha': '2026-11-20',
            'pax': 2,
            'monto_total': 200000,
            'comision': 24000,
            'saldo_agencia': 176000,
            'booking_estado': 'confirmada',
          },
        ];
      final r = await AgencyRepository(api: api).ventas('ag-1');
      expect(api.escrituras.single, ('ventas:ag-1', 200));
      expect(r.single.codigo, 'DIV-1');
      expect(r.single.saldoAgencia, 176000);
      await AgencyRepository(api: api).ventas('ag-1', limit: 5);
      expect(api.escrituras.last, ('ventas:ag-1', 5));
    });
  });
}
