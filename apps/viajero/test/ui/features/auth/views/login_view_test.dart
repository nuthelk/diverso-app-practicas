import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/auth/views/login_view.dart';

import '../../../../support/auth_falso.dart';

/// Pantalla de acceso: «Usar cuenta demo» solo existe cuando el flag lo permite (en la app,
/// `kDebugMode`: las builds de release no regalan la clave de la cuenta de pruebas), entrar y
/// crear cuenta pasan por el view model. Sin red ni Supabase.

Future<AuthFalso> _abrir(WidgetTester tester, {required bool cuentaDemo, AuthFalso? auth}) async {
  tester.view.physicalSize = const Size(420, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final falso = auth ?? AuthFalso();
  await tester.pumpWidget(
    Provider<AuthRepository>.value(
      value: falso,
      child: MaterialApp(
        theme: AppTheme.viajeroLight(),
        home: LoginView(mostrarCuentaDemo: cuentaDemo),
      ),
    ),
  );
  return falso;
}

void main() {
  group('bug A: «Usar cuenta demo»', () {
    testWidgets('con el flag apagado (release) el botón no existe', (tester) async {
      await _abrir(tester, cuentaDemo: false);

      expect(find.text('Usar cuenta demo'), findsNothing);
      expect(find.text('Entrar'), findsOneWidget);
    });

    testWidgets('con el flag encendido (debug) rellena el correo y la clave de la cuenta demo', (
      tester,
    ) async {
      await _abrir(tester, cuentaDemo: true);

      expect(find.text('Usar cuenta demo'), findsOneWidget);
      await tester.tap(find.text('Usar cuenta demo'));
      await tester.pump();

      expect(find.text('viajero@demo.com'), findsOneWidget);
      final clave = tester.widget<TextField>(find.widgetWithText(TextField, 'Contraseña'));
      expect(clave.controller!.text, 'demo1234');
    });

    testWidgets('por defecto sigue a kDebugMode', (tester) async {
      tester.view.physicalSize = const Size(420, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        Provider<AuthRepository>.value(
          value: AuthFalso(),
          child: MaterialApp(theme: AppTheme.viajeroLight(), home: const LoginView()),
        ),
      );

      expect(find.text('Usar cuenta demo'), findsOneWidget, reason: 'las pruebas corren en debug');
    });

    testWidgets('al pasar a «Crear cuenta nueva» el botón demo desaparece', (tester) async {
      await _abrir(tester, cuentaDemo: true);

      await tester.tap(find.text('Crear cuenta nueva'));
      await tester.pump();

      expect(find.text('Usar cuenta demo'), findsNothing);
    });
  });

  group('entrar y crear cuenta', () {
    testWidgets('entrar con datos válidos llama a signIn con el correo recortado', (tester) async {
      final auth = await _abrir(tester, cuentaDemo: false);

      await tester.enterText(find.widgetWithText(TextFormField, 'Correo'), ' ana@correo.test ');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'secreto1');
      await tester.tap(find.text('Entrar'));
      await tester.pump();

      expect(auth.entradas, [(email: 'ana@correo.test', password: 'secreto1')]);
    });

    testWidgets('datos inválidos muestran los avisos del formulario y no llaman a nada', (
      tester,
    ) async {
      final auth = await _abrir(tester, cuentaDemo: false);

      await tester.tap(find.text('Entrar'));
      await tester.pump();

      expect(find.text('Correo inválido'), findsOneWidget);
      expect(find.text('Mínimo 6 caracteres'), findsOneWidget);
      expect(auth.entradas, isEmpty);
    });

    testWidgets('credenciales rechazadas: se ve el mensaje y el botón vuelve a estar activo', (
      tester,
    ) async {
      final auth = AuthFalso()..falloAlEntrar = Exception('Invalid login credentials');
      await _abrir(tester, cuentaDemo: false, auth: auth);

      await tester.enterText(find.widgetWithText(TextFormField, 'Correo'), 'ana@correo.test');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'secreto1');
      await tester.tap(find.text('Entrar'));
      await tester.pump();
      await tester.pump();

      expect(find.text('Correo o contraseña incorrectos, o no hay conexión.'), findsOneWidget);
      final boton = tester.widget<FilledButton>(find.byType(FilledButton));
      expect(boton.onPressed, isNotNull);
    });

    testWidgets('crear cuenta sin marcar las casillas no registra y las resalta', (tester) async {
      final auth = await _abrir(tester, cuentaDemo: false);

      await tester.tap(find.text('Crear cuenta nueva'));
      await tester.pump();
      await tester.enterText(find.widgetWithText(TextFormField, 'Tu nombre'), 'Ana');
      await tester.enterText(find.widgetWithText(TextFormField, 'Correo'), 'ana@correo.test');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'secreto1');
      await tester.tap(find.text('Crear cuenta'));
      await tester.pump();

      expect(auth.registros, isEmpty);
    });

    testWidgets('crear cuenta con las dos casillas registra con autorización expresa', (
      tester,
    ) async {
      final auth = await _abrir(tester, cuentaDemo: false);

      await tester.tap(find.text('Crear cuenta nueva'));
      await tester.pump();
      await tester.enterText(find.widgetWithText(TextFormField, 'Tu nombre'), 'Ana');
      await tester.enterText(find.widgetWithText(TextFormField, 'Correo'), 'ana@correo.test');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'secreto1');
      for (final casilla in find.byType(Checkbox).evaluate().toList()) {
        await tester.tap(find.byWidget(casilla.widget));
      }
      await tester.pump();
      await tester.tap(find.text('Crear cuenta'));
      await tester.pump();

      expect(auth.registros, [
        (nombre: 'Ana', email: 'ana@correo.test', password: 'secreto1', aceptaDocumentos: true),
      ]);
    });
  });
}
