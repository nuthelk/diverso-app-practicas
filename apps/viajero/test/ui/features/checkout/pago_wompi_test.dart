import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/checkout/pago_wompi.dart';

void main() {
  group('redirección de retorno de Wompi (WebView en Android/iOS)', () {
    test('reconoce https://diverso.app/pago/resultado y lee el id de la transacción', () {
      const url = 'https://diverso.app/pago/resultado?id=12345-1700000000-98765';
      expect(esRedireccionDePago(url), isTrue);
      expect(idDeRedireccion(url), '12345-1700000000-98765');
    });

    test('sin id → es redirección pero no hay transacción', () {
      expect(esRedireccionDePago('https://diverso.app/pago/resultado'), isTrue);
      expect(idDeRedireccion('https://diverso.app/pago/resultado'), isNull);
    });

    test('otras URLs (Wompi, bancos, otro dominio parecido) no se interceptan', () {
      for (final url in [
        'https://checkout.wompi.co/p/?public-key=pub_test_x',
        'https://diverso.app/otra/ruta?id=1',
        'https://diverso.app.evil.example/pago/resultado?id=1',
        'https://evil.example/?next=https://diverso.app/pago/resultado',
      ]) {
        expect(esRedireccionDePago(url), isFalse, reason: url);
      }
    });

    test('la URL de retorno que se pide a pagos-iniciar en móvil es la interceptada', () {
      expect(DiversoConfig.pagoRetornoMovil, 'https://diverso.app/pago/resultado');
      expect(
        urlRetornoPago(),
        DiversoConfig.pagoRetornoMovil,
        reason: 'en pruebas (no web) se usa la de móvil',
      );
    });
  });
}
