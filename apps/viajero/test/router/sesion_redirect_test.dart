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

    test('/login y /consentimiento llevan al inicio', () {
      expect(_redirect('/login'), '/');
      expect(_redirect('/consentimiento'), '/');
    });
  });

  group('con sesión y consentimiento pendiente o desconocido por un error', () {
    for (final estado in [EstadoConsentimiento.pendiente, EstadoConsentimiento.error]) {
      test('${estado.name}: todo lleva a /consentimiento salvo él mismo y los legales', () {
        for (final ubicacion in ['/', '/login', '/reservas', '/plan/p1', '/comparar']) {
          expect(
            _redirect(ubicacion, consentimiento: estado),
            '/consentimiento',
            reason: ubicacion,
          );
        }
        expect(_redirect('/consentimiento', consentimiento: estado), isNull);
        expect(_redirect('/legal/terminos-viajeros', consentimiento: estado), isNull);
      });
    }
  });

  group('con sesión y consentimiento verificándose', () {
    const estado = EstadoConsentimiento.verificando;

    test('no mueve a nadie (la verificación decide enseguida)', () {
      expect(_redirect('/reservas', consentimiento: estado), isNull);
      expect(_redirect('/consentimiento', consentimiento: estado), isNull);
    });

    test('/login lleva al inicio', () {
      expect(_redirect('/login', consentimiento: estado), '/');
    });
  });
}
