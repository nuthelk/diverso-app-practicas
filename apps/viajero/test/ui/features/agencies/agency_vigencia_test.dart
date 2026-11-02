import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// El sello "Verificada RNT" solo se muestra si la agencia está verificada
/// y su RNT sigue vigente (misma regla que agencia_habilitada() en SQL).
void main() {
  Map<String, dynamic> base({String estado = 'verificado', String? vigencia}) => {
    'id': 'a1',
    'nombre': 'Agencia de prueba',
    'numero_rnt': '12345',
    'matricula_camara_comercio': '0123456-7',
    'estado_verificacion': estado,
    'rnt_vigente_hasta': vigencia,
  };

  String iso(DateTime d) => fechaToIso(d);
  final hoy = DateTime.now();

  test('verificada y vigente', () {
    final a = Agency.fromMap(base(vigencia: iso(hoy.add(const Duration(days: 30)))));
    expect(a.verificada, isTrue);
    expect(a.rntVigenteHasta, isNotNull);
  });

  test('vence hoy todavía cuenta como vigente', () {
    expect(Agency.fromMap(base(vigencia: iso(hoy))).verificada, isTrue);
  });

  test('RNT vencido no muestra el sello', () {
    final a = Agency.fromMap(base(vigencia: iso(hoy.subtract(const Duration(days: 1)))));
    expect(a.verificada, isFalse);
  });

  test('sin vigencia registrada no muestra el sello', () {
    expect(Agency.fromMap(base()).verificada, isFalse);
  });

  test('pendiente no muestra el sello aunque tenga vigencia', () {
    final a = Agency.fromMap(
      base(estado: 'pendiente', vigencia: iso(hoy.add(const Duration(days: 90)))),
    );
    expect(a.verificada, isFalse);
  });

  test('los documentos legales tienen versión y contenido', () {
    expect(kVersionLegal, isNotEmpty);
    expect(DocumentoLegal.porId('privacidad'), isNotNull);
    expect(DocumentoLegal.porId('terminos-viajeros'), isNotNull);
    expect(DocumentoLegal.porId('no-existe'), isNull);
  });
}
