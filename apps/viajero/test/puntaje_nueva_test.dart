import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/app_theme.dart';
import 'package:viajero/ui/features/catalog/plan_card.dart';
import 'package:viajero/ui/features/plan/plan_detail_view.dart';

/// Un plan sin reseñas muestra «Nueva» (nunca «★ 0.0»), en la tarjeta del catálogo y en la ficha.

Plan _plan({int reviews = 0, double rating = 0}) => Plan(
  id: 'plan-1',
  agencyId: 'ag',
  titulo: 'Jericó 2 días',
  destino: 'Jericó',
  categoria: ExperienceCategory.cultura,
  precioCop: 449000,
  estado: PlanStatus.publicado,
  ratingPromedio: rating,
  reviewsCount: reviews,
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

Future<void> _tarjeta(WidgetTester tester, Plan plan) async {
  tester.view.physicalSize = const Size(600, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.viajeroLight(),
      home: Scaffold(body: PlanCard(plan: plan)),
    ),
  );
}

Future<void> _ficha(WidgetTester tester, Plan plan) async {
  tester.view.physicalSize = const Size(600, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<CatalogService>.value(value: _Catalogo(plan)),
        Provider<ReviewService>.value(value: _Resenas()),
      ],
      child: MaterialApp(
        theme: AppTheme.viajeroLight(),
        home: const PlanDetailView(planId: 'plan-1'),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  test('Plan.esNuevo: sin reseñas aunque el promedio venga en 0', () {
    expect(_plan().esNuevo, isTrue);
    expect(_plan(reviews: 1, rating: 5).esNuevo, isFalse);
  });

  group('tarjeta del catálogo', () {
    testWidgets('sin reseñas dice «Nueva», sin estrella ni 0.0', (tester) async {
      await _tarjeta(tester, _plan());
      expect(find.text('Nueva'), findsOneWidget);
      expect(find.text('0.0'), findsNothing);
      expect(find.byIcon(Icons.star_rounded), findsNothing);
    });

    testWidgets('PRESERVE: con reseñas sigue mostrando ★ 4.5 y la cantidad', (tester) async {
      await _tarjeta(tester, _plan(reviews: 3, rating: 4.5));
      expect(find.text('4.5'), findsOneWidget);
      expect(find.text('(3)'), findsOneWidget);
      expect(find.byIcon(Icons.star_rounded), findsOneWidget);
      expect(find.text('Nueva'), findsNothing);
    });
  });

  group('ficha del plan', () {
    testWidgets('sin reseñas dice «Nueva» y no habla de reseñas verificadas', (tester) async {
      await _ficha(tester, _plan());
      expect(find.text('Nueva'), findsOneWidget);
      expect(find.text('0.0'), findsNothing);
      expect(find.textContaining('reseñas verificadas'), findsNothing);
    });

    testWidgets('PRESERVE: con reseñas muestra el puntaje y «n reseñas verificadas»', (
      tester,
    ) async {
      await _ficha(tester, _plan(reviews: 2, rating: 4.0));
      expect(find.text('4.0'), findsOneWidget);
      expect(find.textContaining('2 reseñas verificadas'), findsOneWidget);
      expect(find.text('Nueva'), findsNothing);
    });
  });
}
