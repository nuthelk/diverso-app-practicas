import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/router/sesion_redirect.dart';
import 'package:viajero/ui/features/legal/view_models/consent_view_model.dart';

/// La decisión del redirect es una función pura: sesión + consentimiento + ubicación.

String? _redirect(
  String ubicacion, {
  bool sesion = true,
  EstadoConsentimiento consentimiento = EstadoConsentimiento.aceptado,
}) => sesionRedirect(haySesion: sesion, consentimiento: consentimiento, ubicacion: ubicacion);

void main() {
  group('sin sesión', () {
    test('cualquier pantalla privada va a /login', () {
      for (final ubicacion in ['/', '/reservas', '/plan/p1', '/comparar', '/consentimiento']) {
        expect(_redirect(ubicacion, sesion: false), '/login', reason: ubicacion);
      }
    });

    test('/login y los documentos legales se pueden ver', () {
      expect(_redirect('/login', sesion: false), isNull);
      expect(_redirect('/legal/privacidad', sesion: false), isNull);
    });

    test('el estado del consentimiento no importa', () {
      for (final estado in EstadoConsentimiento.values) {
        expect(_redirect('/', sesion: false, consentimiento: estado), '/login');
      }
    });
  });

  group('con sesión y consentimiento al día', () {
    test('se queda donde está', () {
      for (final ubicacion in ['/', '/reservas', '/plan/p1', '/pago/resultado', '/legal/x']) {
        expect(_redirect(ubicacion), isNull, reason: ubicacion);
      }
    });

    test('/login lleva al inicio', () {
      expect(_redirect('/login'), '/');
    });

    test('/consentimiento sin destino lleva al inicio', () {
      expect(_redirect('/consentimiento'), '/');
    });
  });

  group('con sesión y consentimiento sin confirmar (verificando, pendiente o error)', () {
    for (final estado in [
      EstadoConsentimiento.verificando,
      EstadoConsentimiento.pendiente,
      EstadoConsentimiento.error,
    ]) {
      group(estado.name, () {
        test('todo lleva a /consentimiento recordando la ubicación original', () {
          expect(_redirect('/', consentimiento: estado), '/consentimiento?desde=%2F');
          expect(_redirect('/login', consentimiento: estado), '/consentimiento?desde=%2Flogin');
          expect(
            _redirect('/reservas/b-1', consentimiento: estado),
            '/consentimiento?desde=%2Freservas%2Fb-1',
          );
        });

        test('la query de la ubicación original viaja codificada', () {
          expect(
            _redirect('/comparar?ids=a,b', consentimiento: estado),
            '/consentimiento?desde=%2Fcomparar%3Fids%3Da%2Cb',
          );
          expect(
            _redirect('/pago/resultado?reserva=r1&x=2', consentimiento: estado),
            '/consentimiento?desde=%2Fpago%2Fresultado%3Freserva%3Dr1%26x%3D2',
          );
        });

        test('/consentimiento (con o sin desde) y los legales se quedan', () {
          expect(_redirect('/consentimiento', consentimiento: estado), isNull);
          expect(_redirect('/consentimiento?desde=%2Freservas', consentimiento: estado), isNull);
          expect(_redirect('/legal/terminos-viajeros', consentimiento: estado), isNull);
        });
      });
    }
  });

  group('al quedar aceptado en /consentimiento', () {
    String? desde(String valor) =>
        _redirect('/consentimiento?desde=${Uri.encodeQueryComponent(valor)}');

    test('vuelve a la ubicación original, con su query', () {
      expect(desde('/reservas/b-1'), '/reservas/b-1');
      expect(desde('/comparar?ids=a,b'), '/comparar?ids=a,b');
      expect(desde('/plan/p1'), '/plan/p1');
    });

    test('un destino que no es interno y seguro se ignora y va al inicio', () {
      for (final malo in [
        '//evil.com',
        '//evil.com/x',
        'https://x',
        'https://x.com/reservas',
        'javascript:alert(1)',
        r'/\evil.com',
        'reservas',
        '',
        '/login',
        '/login?x=1',
        '/consentimiento',
        '/consentimiento?desde=%2Freservas',
      ]) {
        expect(desde(malo), '/', reason: malo);
      }
    });

    test('sin parámetro desde va al inicio', () {
      expect(_redirect('/consentimiento?otro=1'), '/');
    });
  });

  group('destinoSeguro', () {
    test('conserva ubicaciones internas', () {
      expect(destinoSeguro('/reservas/b-1'), '/reservas/b-1');
      expect(destinoSeguro('/'), '/');
      expect(destinoSeguro('/comparar?ids=a,b'), '/comparar?ids=a,b');
    });

    test('descarta lo demás', () {
      for (final malo in [null, '', '//evil.com', 'https://x', '/login', '/consentimiento']) {
        expect(destinoSeguro(malo), isNull, reason: '$malo');
      }
    });
  });
}
