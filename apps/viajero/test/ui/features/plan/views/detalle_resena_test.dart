import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/plan/views/plan_detail_view.dart';

/// Reseñas de la ficha: la inicial del avatar sale del nombre del viajero y nunca revienta si el
/// nombre viene vacío (antes `substring(0, 1)` lanzaba `RangeError`).

Plan _plan() => Plan(
  id: 'plan-1',
  agencyId: 'ag-1',
  titulo: 'Santa Fe termal',
  destino: 'Santa Fe de Antioquia',
  categoria: ExperienceCategory.cultura,
  precioCop: 178000,
  estado: PlanStatus.publicado,
  reviewsCount: 4,
);

Review _resena(String id, String? nombre, {String? comentario}) => Review(
  id: id,
  bookingId: 'b-$id',
  planId: 'plan-1',
  viajeroId: 'v-$id',
  calificacion: 5,
  createdAt: DateTime(2026, 10, 1),
  viajeroNombre: nombre,
  comentario: comentario,
);

class _Catalogo implements CatalogRepository {
  @override
  Future<Plan> planDetalle(String planId) async => _plan();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewRepository {
  _Resenas(this.resenas);

  final List<Review> resenas;

  @override
  Future<List<Review>> porPlan(String planId, {int limit = 20}) async => resenas;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _abrir(WidgetTester tester, List<Review> resenas) async {
  tester.view.physicalSize = const Size(600, 4000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const PlanDetailView(planId: 'plan-1'),
      ),
    ],
  );
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<CatalogRepository>.value(value: _Catalogo()),
        Provider<ReviewRepository>.value(value: _Resenas(resenas)),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Finder _avatarCon(String texto) =>
    find.descendant(of: find.byType(CircleAvatar), matching: find.text(texto));

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('nombre vacío: no lanza y muestra «V» y «Viajero»', (tester) async {
    await _abrir(tester, [_resena('1', '', comentario: 'Muy bien')]);

    expect(tester.takeException(), isNull);
    expect(_avatarCon('V'), findsOneWidget);
    expect(find.text('Viajero'), findsOneWidget);
    expect(find.text('Muy bien'), findsOneWidget);
  });

  testWidgets('nombre en blanco se trata como sin nombre', (tester) async {
    await _abrir(tester, [_resena('1', '   ')]);

    expect(tester.takeException(), isNull);
    expect(_avatarCon('V'), findsOneWidget);
    expect(find.text('Viajero'), findsOneWidget);
  });

  testWidgets('PRESERVE: con nombre, la inicial va en mayúscula; sin nombre, «V»', (tester) async {
    await _abrir(tester, [_resena('1', 'ana'), _resena('2', null)]);

    expect(tester.takeException(), isNull);
    expect(_avatarCon('A'), findsOneWidget);
    expect(find.text('ana'), findsOneWidget);
    expect(_avatarCon('V'), findsOneWidget);
    expect(find.text('Viajero'), findsOneWidget);
  });
}
