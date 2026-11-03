import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// La consulta que `CatalogApi` le manda a PostgREST, vista en un servidor local que contesta `[]`:
/// el filtro por día debe actuar sobre los planes (antes del límite de 60), no solo sobre las
/// fechas embebidas.
void main() {
  late HttpServer servidor;
  late SupabaseClient client;
  late CatalogApi api;
  final pedidos = <Uri>[];

  setUp(() async {
    pedidos.clear();
    servidor = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    unawaited(
      servidor.forEach((request) async {
        pedidos.add(request.uri);
        request.response
          ..headers.contentType = ContentType.json
          ..write(jsonEncode(<Object>[]));
        await request.response.close();
      }),
    );
    client = SupabaseClient('http://127.0.0.1:${servidor.port}', 'clave-de-prueba');
    api = CatalogApi(client: client);
  });

  tearDown(() async {
    await client.dispose();
    await servidor.close(force: true);
  });

  Future<Map<String, List<String>>> consulta({String? fecha}) async {
    await api.planesPublicados(desde: '2026-11-02', orden: OrdenCatalogo.rating, fecha: fecha);
    expect(pedidos, hasLength(1));
    return pedidos.single.queryParametersAll;
  }

  test(
    'con día elegido: unión interna con plan_dates y filtro de ese día en la consulta',
    () async {
      final q = await consulta(fecha: '2026-11-05');
      expect(q['select'], ['*,agencies(*),plan_dates!inner(*)']);
      expect(q['plan_dates.fecha'], containsAll(['eq.2026-11-05', 'gte.2026-11-02']));
      expect(q['limit'], ['60']);
    },
  );

  test('sin día elegido: la consulta de siempre, con plan_dates opcional', () async {
    final q = await consulta();
    expect(q['select'], ['*,agencies(*),plan_dates(*)']);
    expect(q['plan_dates.fecha'], ['gte.2026-11-02']);
    expect(q['limit'], ['60']);
  });
}
