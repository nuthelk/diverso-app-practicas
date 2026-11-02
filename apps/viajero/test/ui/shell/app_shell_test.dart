import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/shell/app_shell.dart';

/// Barra inferior: fija al borde, sólida, con línea superior y cuatro destinos
/// (Explorar, Agencias, Reservas, Perfil). El contenido nunca queda debajo de ella.
/// Sin red ni Supabase: las páginas son marcadores.

const _tamano = Size(400, 800);

GoRouter _router() {
  GoRoute pagina(String ruta, String texto) => GoRoute(
    path: ruta,
    builder: (_, _) => Container(
      key: ValueKey('pagina $texto'),
      color: Colors.amber,
      child: Center(child: Text(texto)),
    ),
  );
  return GoRouter(
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [pagina('/', 'Página explorar')]),
          StatefulShellBranch(routes: [pagina('/agencias', 'Página agencias')]),
          StatefulShellBranch(routes: [pagina('/reservas', 'Página reservas')]),
          StatefulShellBranch(routes: [pagina('/perfil', 'Página perfil')]),
        ],
      ),
    ],
  );
}

Future<void> _abrir(WidgetTester tester) async {
  tester.view.physicalSize = _tamano;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: _router()),
  );
  await tester.pumpAndSettle();
}

NavigationBar _barra(WidgetTester tester) =>
    tester.widget<NavigationBar>(find.byType(NavigationBar));

void main() {
  testWidgets('tiene cuatro destinos: Explorar, Agencias, Reservas, Perfil', (tester) async {
    await _abrir(tester);
    expect(find.byType(NavigationDestination), findsNWidgets(4));
    for (final etiqueta in ['Explorar', 'Agencias', 'Reservas', 'Perfil']) {
      expect(
        find.descendant(of: find.byType(NavigationBar), matching: find.text(etiqueta)),
        findsOneWidget,
      );
    }
  });

  testWidgets('el destino activo cambia al tocar y muestra su página', (tester) async {
    await _abrir(tester);
    expect(_barra(tester).selectedIndex, 0);
    expect(find.text('Página explorar'), findsOneWidget);

    await tester.tap(
      find.descendant(of: find.byType(NavigationBar), matching: find.text('Agencias')),
    );
    await tester.pumpAndSettle();
    expect(_barra(tester).selectedIndex, 1);
    expect(find.text('Página agencias'), findsOneWidget);

    await tester.tap(
      find.descendant(of: find.byType(NavigationBar), matching: find.text('Perfil')),
    );
    await tester.pumpAndSettle();
    expect(_barra(tester).selectedIndex, 3);
    expect(find.text('Página perfil'), findsOneWidget);
  });

  testWidgets('está pegada al borde inferior y ocupa todo el ancho (no flota)', (tester) async {
    await _abrir(tester);
    final barra = tester.getRect(find.byKey(const ValueKey('barra-inferior')));
    expect(barra.bottom, _tamano.height);
    expect(barra.left, 0);
    expect(barra.right, _tamano.width);
  });

  testWidgets('es sólida, con línea superior sutil', (tester) async {
    await _abrir(tester);
    final contexto = tester.element(find.byType(NavigationBar));
    final fondo = _barra(tester).backgroundColor ?? NavigationBarTheme.of(contexto).backgroundColor;
    expect(fondo, isNotNull);
    expect(fondo!.a, 1.0);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('barra-inferior')),
        matching: find.byType(Divider),
      ),
      findsOneWidget,
    );
  });

  testWidgets('íconos más grandes y el activo en verde con su píldora', (tester) async {
    await _abrir(tester);
    final cs = Theme.of(tester.element(find.byType(NavigationBar))).colorScheme;
    // Activo (Explorar): ícono relleno, verde de marca.
    expect(tester.getSize(find.byIcon(Icons.explore_rounded)).width, greaterThanOrEqualTo(28));
    expect(IconTheme.of(tester.element(find.byIcon(Icons.explore_rounded))).color, cs.primary);
    expect(
      NavigationBarTheme.of(tester.element(find.byType(NavigationBar))).indicatorColor,
      cs.primaryContainer,
    );
    // Inactivo: contorno, gris.
    expect(tester.getSize(find.byIcon(Icons.storefront_outlined)).width, greaterThanOrEqualTo(28));
    expect(
      IconTheme.of(tester.element(find.byIcon(Icons.storefront_outlined))).color,
      cs.onSurfaceVariant,
    );
  });

  testWidgets('el contenido termina donde empieza la barra: nunca queda debajo', (tester) async {
    await _abrir(tester);
    final pagina = tester.getRect(find.byKey(const ValueKey('pagina Página explorar')));
    final barra = tester.getRect(find.byKey(const ValueKey('barra-inferior')));
    expect(pagina.bottom, lessThanOrEqualTo(barra.top));
    expect(pagina.top, 0);
  });
}
