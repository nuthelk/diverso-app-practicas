import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// Api falsa del catálogo: devuelve las filas indicadas y guarda con qué filtros se le pidió.
class _CatalogApiFalsa implements CatalogApi {
  List<Map<String, dynamic>> planes = [];
  List<Map<String, dynamic>> agencias = [];
  Map<String, dynamic> filaPlan = {};
  List<Map<String, dynamic>> destinos = [];

  Map<String, Object?>? ultimaBusqueda;
  final agenciasPedidas = <String?>[];
  ({String planId, String desde})? ultimoDetalle;

  @override
  Future<List<Map<String, dynamic>>> planesPublicados({
    required String desde,
    required OrdenCatalogo orden,
    String? busqueda,
    ExperienceCategory? categoria,
    String? destino,
    double? precioMax,
    String? fecha,
    String? agencyId,
  }) async {
    ultimaBusqueda = {
      'desde': desde,
      'orden': orden,
      'busqueda': busqueda,
      'categoria': categoria,
      'destino': destino,
      'precioMax': precioMax,
      'fecha': fecha,
      'agencyId': agencyId,
    };
    return planes;
  }

  @override
  Future<List<Map<String, dynamic>>> agenciasPublicas({String? agencyId}) async {
    agenciasPedidas.add(agencyId);
    return agencias;
  }

  @override
  Future<Map<String, dynamic>> plan(String planId, {required String desde}) async {
    ultimoDetalle = (planId: planId, desde: desde);
    return filaPlan;
  }

  @override
  Future<List<Map<String, dynamic>>> destinosPublicados() async => destinos;
}

/// Plan con una sola fecha. `hora` es la `hora_salida` (hora de Bogotá) de todas sus fechas.
Map<String, dynamic> _plan(
  String id, {
  required DateTime fecha,
  int cupos = 5,
  String hora = '06:00:00',
}) => {
  'id': id,
  'agency_id': 'a-1',
  'titulo': 'Plan $id',
  'destino': 'Jericó',
  'precio_cop': 100000,
  'hora_salida': hora,
  'plan_dates': [
    {
      'id': 'pd-$id',
      'plan_id': id,
      'fecha': fechaToIso(fecha),
      'cupo_total': 10,
      'cupo_disponible': cupos,
    },
  ],
};

Map<String, dynamic> _agencia(String id) => {'id': id, 'nombre': 'Agencia $id'};

void main() {
  final hoy = hoyBogota();
  final enTresDias = DateTime(hoy.year, hoy.month, hoy.day + 3);
  final enCuatroDias = DateTime(hoy.year, hoy.month, hoy.day + 4);

  group('search: lo que se le pide a la Api', () {
    test('sin filtros: desde hoy (Bogotá), orden por puntaje y nada más', () async {
      final api = _CatalogApiFalsa();
      await CatalogRepository(api: api).search(FiltrosCatalogo());
      expect(api.ultimaBusqueda, {
        'desde': fechaToIso(hoy),
        'orden': OrdenCatalogo.rating,
        'busqueda': null,
        'categoria': null,
        'destino': null,
        'precioMax': null,
        'fecha': null,
        'agencyId': null,
      });
    });

    test('búsqueda de texto: minúsculas, sin tildes ni comodines', () async {
      final api = _CatalogApiFalsa();
      final repo = CatalogRepository(api: api);
      await repo.search(FiltrosCatalogo(texto: '  Guatapé  % PiedraL '));
      expect(api.ultimaBusqueda!['busqueda'], 'guatape piedral');
      await repo.search(FiltrosCatalogo(texto: '   '));
      expect(api.ultimaBusqueda!['busqueda'], isNull);
    });

    test('categoría, destino, precio máximo, agencia y orden pasan tal cual', () async {
      final api = _CatalogApiFalsa();
      await CatalogRepository(api: api).search(
        FiltrosCatalogo(
          categoria: ExperienceCategory.gastronomia,
          destino: 'Jericó',
          precioMax: 250000,
          agencyId: 'a-7',
          orden: OrdenCatalogo.precioDesc,
        ),
      );
      expect(api.ultimaBusqueda, containsPair('categoria', ExperienceCategory.gastronomia));
      expect(api.ultimaBusqueda, containsPair('destino', 'Jericó'));
      expect(api.ultimaBusqueda, containsPair('precioMax', 250000.0));
      expect(api.ultimaBusqueda, containsPair('agencyId', 'a-7'));
      expect(api.ultimaBusqueda, containsPair('orden', OrdenCatalogo.precioDesc));
    });

    test('un destino vacío no filtra', () async {
      final api = _CatalogApiFalsa();
      await CatalogRepository(api: api).search(FiltrosCatalogo(destino: ''));
      expect(api.ultimaBusqueda!['destino'], isNull);
    });

    test('la fecha elegida viaja como YYYY-MM-DD', () async {
      final api = _CatalogApiFalsa();
      await CatalogRepository(api: api).search(FiltrosCatalogo(fecha: enTresDias));
      expect(api.ultimaBusqueda!['fecha'], fechaToIso(enTresDias));
    });
  });

  group('search: filtro de fecha (bug L)', () {
    test('sin fecha elegida devuelve todos los planes, en el orden que dio la Api', () async {
      final api = _CatalogApiFalsa()
        ..planes = [_plan('p1', fecha: enCuatroDias), _plan('p2', fecha: enTresDias, cupos: 0)];
      final r = await CatalogRepository(api: api).search(FiltrosCatalogo());
      expect(r.map((p) => p.id), ['p1', 'p2']);
    });

    test('con fecha: solo planes con una salida por partir ese día, y con cupos', () async {
      final api = _CatalogApiFalsa()
        ..planes = [
          _plan('sale', fecha: enTresDias),
          _plan('otro-dia', fecha: enCuatroDias),
          _plan('agotado', fecha: enTresDias, cupos: 0),
        ];
      final r = await CatalogRepository(api: api).search(FiltrosCatalogo(fecha: enTresDias));
      expect(r.map((p) => p.id), ['sale']);
    });

    test('hoy, una salida que ya partió no cuenta (aunque tenga cupos)', () async {
      final api = _CatalogApiFalsa()..planes = [_plan('ya-salio', fecha: hoy, hora: '00:00:00')];
      final r = await CatalogRepository(api: api).search(FiltrosCatalogo(fecha: hoy));
      expect(r, isEmpty);
    });
  });

  group('agencias, detalle y destinos', () {
    test('agencias: una AgenciaResumen por fila', () async {
      final api = _CatalogApiFalsa()..agencias = [_agencia('a1'), _agencia('a2')];
      final r = await CatalogRepository(api: api).agencias();
      expect(r.map((a) => a.nombre), ['Agencia a1', 'Agencia a2']);
      expect(api.agenciasPedidas, [null]);
    });

    test('agenciaConPlanes: null si la agencia no existe o no está habilitada', () async {
      final api = _CatalogApiFalsa();
      expect(await CatalogRepository(api: api).agenciaConPlanes('a-1'), isNull);
    });

    test('agenciaConPlanes: la agencia y sus planes, ambos filtrados por su id', () async {
      final api = _CatalogApiFalsa()
        ..agencias = [_agencia('a-1')]
        ..planes = [_plan('p1', fecha: enTresDias)];
      final r = await CatalogRepository(api: api).agenciaConPlanes('a-1');
      expect(r!.agencia.id, 'a-1');
      expect(r.planes.map((p) => p.id), ['p1']);
      expect(api.agenciasPedidas, ['a-1']);
      expect(api.ultimaBusqueda, containsPair('agencyId', 'a-1'));
    });

    test('planDetalle: pide el plan con las fechas desde hoy (Bogotá)', () async {
      final api = _CatalogApiFalsa()..filaPlan = _plan('p9', fecha: enTresDias);
      final plan = await CatalogRepository(api: api).planDetalle('p9');
      expect(plan.id, 'p9');
      expect(api.ultimoDetalle, (planId: 'p9', desde: fechaToIso(hoy)));
    });

    test('destinos: sin repetidos y ordenados', () async {
      final api = _CatalogApiFalsa()
        ..destinos = [
          {'destino': 'Jericó'},
          {'destino': 'Guatapé'},
          {'destino': 'Jericó'},
        ];
      expect(await CatalogRepository(api: api).destinos(), ['Guatapé', 'Jericó']);
    });
  });
}
