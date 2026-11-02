import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/theme_mode_controller.dart';
import 'package:viajero/ui/core/app_theme.dart';
import 'package:viajero/ui/core/widgets.dart';
import 'package:viajero/ui/features/agencies/agencia_view.dart';
import 'package:viajero/ui/features/agencies/agencias_view.dart';
import 'package:viajero/ui/features/bookings/bookings_view.dart';
import 'package:viajero/ui/features/catalog/catalog_view.dart';
import 'package:viajero/ui/features/plan/plan_detail_view.dart';
import 'package:viajero/ui/features/profile/profile_view.dart';

/// Ningún contenido se dibuja encima de la cabecera de una página ni bajo la barra de estado:
/// Explorar, Agencias, Reservas y Perfil llevan el título en el AppBar del Scaffold (fuera del
/// scroll); el detalle del plan y la página de la agencia tienen una cabecera colapsable que
/// termina SÓLIDA. Todas comparten el mismo título grande. Sin red ni Supabase.

const _agencia = AgenciaResumen(
  id: 'ag-rutas',
  nombre: 'Rutas de Antioquia Cultural',
  ciudad: 'Medellín',
  descripcion: 'Cultura, memoria y patrimonio de Antioquia.',
  planesCount: 6,
  rating: 4.5,
  reviewsTotal: 2,
);

Plan _plan(int i) => Plan(
  id: 'plan-$i',
  agencyId: 'ag-rutas',
  titulo: 'Plan número $i',
  destino: 'Guatapé',
  categoria: ExperienceCategory.cultura,
  precioCop: 100000.0 + i,
  estado: PlanStatus.publicado,
  descripcion: 'Una descripción larga. ' * 40,
  itinerario: [
    for (var h = 8; h < 18; h++) ItinerarioPaso(hora: '$h:00', actividad: 'Actividad de las $h'),
  ],
  ratingPromedio: 4.0,
  reviewsCount: 2,
);

class _Catalogo implements CatalogService {
  final planes = [for (var i = 1; i <= 8; i++) _plan(i)];

  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async => planes;

  @override
  Future<List<String>> destinos() async => const [];

  @override
  Future<Plan> planDetalle(String planId) async => planes.first;

  @override
  Future<List<AgenciaResumen>> agencias() async => [_agencia, for (var i = 0; i < 6; i++) _agencia];

  @override
  Future<({AgenciaResumen agencia, List<Plan> planes})?> agenciaConPlanes(String agencyId) async =>
      (agencia: _agencia, planes: planes);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewService {
  @override
  Future<List<Review>> porPlan(String planId, {int limit = 20}) async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Auth implements AuthService {
  @override
  String? get currentUserEmail => 'ana@correo.test';

  @override
  Future<Profile> currentProfile() async => Profile(id: 'u', rol: UserRole.viajero, nombre: 'Ana');

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Reservas implements BookingService {
  @override
  Future<List<Booking>> misReservas() async => [
    for (var i = 0; i < 9; i++)
      Booking(
        id: 'b$i',
        codigo: 'FUT$i',
        planDateId: 'pd',
        viajeroId: 'v',
        pax: 2,
        montoTotal: 190000,
        estado: BookingStatus.confirmada,
        createdAt: DateTime.now(),
        salidaAt: DateTime.now().add(Duration(days: 3 + i)),
      ),
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Pasarela implements PaymentGateway {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _abrir(WidgetTester tester, Widget vista, {ThemeData? tema}) async {
  // 600 de ancho: lista de una columna (la tipografía de prueba, Ahem, es más ancha que la real).
  tester.view.physicalSize = const Size(600, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeController()),
        Provider<CatalogService>.value(value: _Catalogo()),
        Provider<ReviewService>.value(value: _Resenas()),
        Provider<AuthService>.value(value: _Auth()),
        Provider<BookingService>.value(value: _Reservas()),
        Provider<PaymentGateway>.value(value: _Pasarela()),
      ],
      child: MaterialApp(theme: tema ?? AppTheme.viajeroLight(), home: vista),
    ),
  );
  await tester.pumpAndSettle();
}

Rect _cabecera(WidgetTester tester) => tester.getRect(find.byType(AppBar));

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('causa raíz: el AppBar del tema es opaco', () {
    for (final (nombre, tema) in [
      ('claro', AppTheme.viajeroLight()),
      ('oscuro', AppTheme.viajeroDark()),
    ]) {
      test('tema $nombre: fondo sólido del color de la página, sin tinte', () {
        final bar = tema.appBarTheme;
        expect(bar.backgroundColor, tema.scaffoldBackgroundColor);
        expect(bar.backgroundColor!.a, 1.0);
        expect(bar.surfaceTintColor, Colors.transparent);
      });
    }
  });

  group('páginas con el título en el AppBar del Scaffold', () {
    // (nombre, vista, título, lo que se desplaza)
    final paginas = <(String, Widget, String, Finder)>[
      ('Explorar', const CatalogView(), 'Descubre Antioquia', find.byType(CustomScrollView)),
      ('Agencias', const AgenciasView(), 'Agencias', find.byType(CustomScrollView)),
      ('Reservas', const BookingsView(), 'Mis reservas', find.byType(ListView)),
      ('Perfil', const ProfileView(), 'Perfil', find.byType(ListView)),
    ];

    for (final (nombre, vista, titulo, scroll) in paginas) {
      testWidgets('$nombre: el título no está dentro del scroll y la lista empieza debajo', (
        tester,
      ) async {
        await _abrir(tester, vista);

        expect(
          find.descendant(of: find.byType(Scrollable), matching: find.byType(AppBar)),
          findsNothing,
        );
        final cab = _cabecera(tester);
        expect(tester.getRect(find.text(titulo)).bottom, lessThanOrEqualTo(cab.bottom));

        // Lo que se desplaza arranca justo bajo el AppBar (y bajo las pestañas, si las hay).
        final zona = tester.getRect(scroll);
        final limite = nombre == 'Reservas'
            ? tester.getRect(find.byType(TabBar)).bottom
            : cab.bottom;
        expect(zona.top, greaterThanOrEqualTo(limite));

        await tester.drag(scroll, const Offset(0, -500));
        await tester.pumpAndSettle();

        expect(tester.getRect(scroll).top, greaterThanOrEqualTo(limite));
        expect(_cabecera(tester), cab);
        expect(find.text(titulo), findsOneWidget);
      });

      testWidgets('$nombre: usa el título de página compartido (grande)', (tester) async {
        await _abrir(tester, vista);

        final t = find.descendant(of: find.byType(AppBar), matching: find.byType(TituloPagina));
        expect(t, findsOneWidget);
        final texto = tester.widget<Text>(find.descendant(of: t, matching: find.text(titulo)));
        expect(texto.style!.fontSize, greaterThanOrEqualTo(24));
        expect(texto.style!.fontWeight, FontWeight.w800);
      });
    }

    testWidgets('en tema oscuro el título y la cabecera también se leen', (tester) async {
      await _abrir(tester, const AgenciasView(), tema: AppTheme.viajeroDark());

      final tema = AppTheme.viajeroDark();
      final texto = tester.widget<Text>(
        find.descendant(of: find.byType(AppBar), matching: find.text('Agencias')),
      );
      expect(texto.style!.color, tema.colorScheme.onSurface);
      final fondo = tester.widget<Material>(
        find.descendant(of: find.byType(AppBar), matching: find.byType(Material)).first,
      );
      expect(fondo.color, tema.scaffoldBackgroundColor);
    });
  });

  group('cabecera colapsable', () {
    testWidgets(
      'detalle del plan: el contenido arranca bajo la cabecera y al colapsar queda sólida con el título',
      (tester) async {
        await _abrir(tester, const PlanDetailView(planId: 'plan-1'));

        final cab = _cabecera(tester);
        expect(tester.getTopLeft(find.text('Plan número 1')).dy, greaterThanOrEqualTo(cab.bottom));
        // Expandida, el título del plan no se repite en la cabecera.
        expect(
          find.descendant(of: find.byType(AppBar), matching: find.text('Plan número 1')),
          findsNothing,
        );

        await tester.drag(find.byType(CustomScrollView), const Offset(0, -2500));
        await tester.pumpAndSettle();

        final colapsada = _cabecera(tester);
        expect(colapsada.height, lessThan(cab.height));
        expect(colapsada.top, 0);
        final scaffoldBg = AppTheme.viajeroLight().scaffoldBackgroundColor;
        expect(tester.widget<AppBar>(find.byType(AppBar)).backgroundColor, scaffoldBg);
        expect(
          find.descendant(of: find.byType(AppBar), matching: find.text('Plan número 1')),
          findsOneWidget,
        );
        expect(find.byTooltip('Volver'), findsOneWidget);
      },
    );

    testWidgets(
      'página de la agencia: con la portada a la vista no hay nombre en la cabecera; al colapsar queda sólida con nombre y volver',
      (tester) async {
        await _abrir(tester, const AgenciaView(agencyId: 'ag-rutas'));

        final cab = _cabecera(tester);
        expect(
          find.descendant(of: find.byType(AppBar), matching: find.text(_agencia.nombre)),
          findsNothing,
        );
        expect(find.text(_agencia.nombre), findsOneWidget);

        await tester.drag(find.byType(CustomScrollView), const Offset(0, -2500));
        await tester.pumpAndSettle();

        final colapsada = _cabecera(tester);
        expect(colapsada.height, lessThan(cab.height));
        expect(colapsada.top, 0);
        expect(
          tester.widget<AppBar>(find.byType(AppBar)).backgroundColor,
          AppTheme.viajeroLight().scaffoldBackgroundColor,
        );
        expect(
          find.descendant(of: find.byType(AppBar), matching: find.text(_agencia.nombre)),
          findsOneWidget,
        );
        expect(find.byTooltip('Volver'), findsOneWidget);
        // El nombre de la cabecera cabe entre el botón de volver y el borde derecho.
        final nombre = tester.getRect(
          find.descendant(of: find.byType(AppBar), matching: find.text(_agencia.nombre)),
        );
        expect(nombre.left, greaterThanOrEqualTo(tester.getRect(find.byTooltip('Volver')).right));
        expect(nombre.right, lessThanOrEqualTo(600));
      },
    );
  });
}
