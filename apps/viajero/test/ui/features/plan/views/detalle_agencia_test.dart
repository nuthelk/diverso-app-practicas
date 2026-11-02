import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/core/widgets/agency_avatar.dart';
import 'package:viajero/ui/core/widgets/plan/verified_badge.dart';
import 'package:viajero/ui/features/plan/views/plan_detail_view.dart';

/// La tarjeta de la agencia en la ficha del plan usa el mismo avatar que la lista de agencias:
/// el logo si hay `logo_url`, y si no, las iniciales sobre el color estable de la agencia.

Plan _plan({String? logoUrl}) => Plan(
  id: 'plan-1',
  agencyId: 'ag-rutas',
  titulo: 'Comuna 13 y memoria',
  destino: 'Medellín',
  categoria: ExperienceCategory.cultura,
  precioCop: 120000,
  estado: PlanStatus.publicado,
  agency: Agency(
    id: 'ag-rutas',
    nombre: 'Rutas de Antioquia Cultural',
    numeroRnt: '12345',
    matriculaCamaraComercio: '999',
    estadoVerificacion: VerificationStatus.verificado,
    rntVigenteHasta: DateTime.now().add(const Duration(days: 365)),
    logoUrl: logoUrl,
  ),
);

class _Catalogo implements CatalogService {
  _Catalogo(this.plan);

  final Plan plan;

  @override
  Future<Plan> planDetalle(String planId) async => plan;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewService {
  @override
  Future<List<Review>> porPlan(String planId, {int limit = 20}) async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _abrir(WidgetTester tester, Plan plan, {double ancho = 600}) async {
  tester.view.physicalSize = Size(ancho, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const PlanDetailView(planId: 'plan-1'),
      ),
      GoRoute(
        path: '/agencia/:id',
        builder: (_, _) => const Scaffold(body: Text('página agencia')),
      ),
    ],
  );
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<CatalogService>.value(value: _Catalogo(plan)),
        Provider<ReviewService>.value(value: _Resenas()),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('sin logo: iniciales «RA» sobre el color de la agencia, sin pedir imagen', (
    tester,
  ) async {
    await _abrir(tester, _plan());

    final avatar = find.byType(AgencyAvatar);
    expect(avatar, findsOneWidget);
    expect(find.descendant(of: avatar, matching: find.text('RA')), findsOneWidget);
    expect(find.descendant(of: avatar, matching: find.byType(Image)), findsNothing);
    final fondo = tester.widget<ColoredBox>(
      find.descendant(of: avatar, matching: find.byType(ColoredBox)).first,
    );
    expect(fondo.color, colorDeAgencia('ag-rutas'));
  });

  testWidgets('con logo_url: muestra la imagen', (tester) async {
    await _abrir(tester, _plan(logoUrl: 'https://logos.test/rutas.png'));

    expect(
      find.descendant(of: find.byType(AgencyAvatar), matching: find.byType(Image)),
      findsOneWidget,
    );
  });

  testWidgets('celular angosto (320): el sello va debajo del nombre y el texto usa todo el ancho', (
    tester,
  ) async {
    await _abrir(tester, _plan(), ancho: 320);

    final nombre = tester.getRect(find.text('Rutas de Antioquia Cultural'));
    final sello = tester.getRect(find.byType(VerifiedBadge));
    expect(sello.top, greaterThanOrEqualTo(nombre.bottom));
    expect(sello.left, lessThan(nombre.right));
  });

  testWidgets('PRESERVE: la tarjeta sigue mostrando RNT y abre la página de la agencia', (
    tester,
  ) async {
    await _abrir(tester, _plan());

    expect(find.text('Rutas de Antioquia Cultural'), findsOneWidget);
    expect(find.textContaining('RNT 12345'), findsOneWidget);
    await tester.tap(find.text('Rutas de Antioquia Cultural'));
    await tester.pumpAndSettle();
    expect(find.text('página agencia'), findsOneWidget);
  });
}
