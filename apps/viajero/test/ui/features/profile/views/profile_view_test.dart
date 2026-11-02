import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';
import 'package:viajero/ui/features/profile/views/profile_view.dart';

import '../../../../support/auth_falso.dart';

/// Perfil: el nombre y el correo vienen del view model; si el perfil no carga ya no se queda
/// callado (aviso con «Reintentar»); «Cerrar sesión» pasa por el view model. Sin red ni Supabase.

Future<void> _abrir(WidgetTester tester, AuthFalso auth) async {
  tester.view.physicalSize = const Size(800, 1600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<AuthRepository>.value(value: auth),
      ],
      child: MaterialApp(theme: AppTheme.viajeroLight(), home: const ProfileView()),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('muestra el nombre, la inicial y el correo del viajero', (tester) async {
    await _abrir(tester, AuthFalso());

    expect(find.text('Ana'), findsOneWidget);
    expect(find.text('A'), findsOneWidget);
    expect(find.text('ana@correo.test'), findsOneWidget);
    expect(find.text('No pudimos cargar tu perfil.'), findsNothing);
  });

  testWidgets('si el perfil no carga avisa con «Reintentar» y al reintentar muestra el nombre', (
    tester,
  ) async {
    final auth = AuthFalso()..falloAlCargarPerfil = Exception('sin red');
    await _abrir(tester, auth);

    expect(find.text('Viajero'), findsOneWidget);
    expect(find.text('No pudimos cargar tu perfil.'), findsOneWidget);

    auth.falloAlCargarPerfil = null;
    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    expect(find.text('Ana'), findsOneWidget);
    expect(find.text('No pudimos cargar tu perfil.'), findsNothing);
  });

  testWidgets('«Cerrar sesión» cierra la sesión', (tester) async {
    final auth = AuthFalso();
    await _abrir(tester, auth);

    await tester.ensureVisible(find.text('Cerrar sesión'));
    await tester.tap(find.text('Cerrar sesión'));
    await tester.pumpAndSettle();

    expect(auth.currentUserId, isNull);
  });

  testWidgets('si cerrar la sesión falla lo dice en un aviso', (tester) async {
    final auth = AuthFalso()..falloAlSalir = Exception('sin red');
    await _abrir(tester, auth);

    await tester.ensureVisible(find.text('Cerrar sesión'));
    await tester.tap(find.text('Cerrar sesión'));
    await tester.pumpAndSettle();

    expect(find.text('No pudimos cerrar la sesión. Intenta de nuevo.'), findsOneWidget);
    expect(auth.currentUserId, 'viajero-1');
  });
}
