import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/checkout/pago_abierto.dart';
import 'package:viajero/ui/features/checkout/pago_wompi.dart';

/// Bug F: en web el pago se abre navegando la MISMA ventana a Wompi, así que no hay un resultado
/// que esperar; el Future antes no terminaba nunca y «Procesando…» se quedaba para siempre.
/// Ahora el resultado es explícito: [PagoAbierto.redirigido]. Sin navegador ni WebView.

void main() {
  group('abrirEnLaMismaVentana (web)', () {
    const url = 'https://checkout.wompi.co/p/?public-key=pub_test_x&reference=DIV-1';

    test('lanza Wompi y TERMINA con redirigido, sin quedarse esperando', () async {
      final lanzadas = <Uri>[];
      final resultado = await abrirEnLaMismaVentana(
        url,
        lanzar: (uri) async {
          lanzadas.add(uri);
          return true;
        },
      ).timeout(const Duration(seconds: 1));

      expect(resultado, PagoAbierto.redirigido);
      expect(lanzadas, [Uri.parse(url)]);
    });

    test('si el navegador no abre Wompi: ERROR_NAVEGADOR, no un pago a medias', () async {
      await expectLater(
        abrirEnLaMismaVentana(url, lanzar: (_) async => false),
        throwsA(
          isA<DiversoException>()
              .having((e) => e.codigo, 'codigo', 'ERROR_NAVEGADOR')
              .having((e) => e.mensajeUsuario, 'mensaje', isNotEmpty),
        ),
      );
    });
  });

  test('el resultado distingue pago terminado, cerrado y redirigido', () {
    expect(PagoAbierto.values, [
      PagoAbierto.completado,
      PagoAbierto.cerrado,
      PagoAbierto.redirigido,
    ]);
  });
}
