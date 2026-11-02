import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/plan/views/plan_detail_view.dart';

/// La barra de reserva nunca tapa el final de la ficha: al llegar al fondo del scroll, lo último
/// del contenido queda por encima de la barra, sin importar la altura de la barra de gestos.

const _politica = 'Cancelación gratuita hasta 48 horas antes.';

Plan _plan() => Plan(
  id: 'plan-1',
  agencyId: 'ag-1',
  titulo: 'Santa Fe termal',
  destino: 'Santa Fe de Antioquia',
  categoria: ExperienceCategory.cultura,
  precioCop: 178000,
  estado: PlanStatus.publicado,
  politicaCancelacion: _politica,
  // Itinerario largo: la ficha tiene que hacer scroll para llegar al final.
  itinerario: [
    for (var h = 6; h < 18; h++)
      ItinerarioPaso(hora: '${h.toString().padLeft(2, '0')}:00', actividad: 'Parada $h'),
  ],
  dates: [
    PlanDate(
      id: 'f-1',
      planId: 'plan-1',
      fecha: DateTime.now().add(const Duration(days: 3)),
      cupoTotal: 20,
      cupoDisponible: 20,
    ),
  ],
);

class _Catalogo implements CatalogRepository {
  @override
  Future<Plan> planDetalle(String planId) async => _plan();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewRepository {
  @override
  Future<List<Review>> porPlan(String planId, {int limit = 20}) async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets(
    'con barra de gestos alta (48), el final del contenido queda sobre la barra de reserva',
    (tester) async {
      tester.view.physicalSize = const Size(600, 800);
      tester.view.devicePixelRatio = 1.0;
      tester.view.padding = const FakeViewPadding(bottom: 48);
      tester.view.viewPadding = const FakeViewPadding(bottom: 48);
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
            Provider<ReviewRepository>.value(value: _Resenas()),
          ],
          child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      await tester.fling(find.byType(CustomScrollView), const Offset(0, -5000), 4000);
      await tester.pumpAndSettle();

      final fechas = find.byWidgetPredicate(
        (w) => w is ListView && w.scrollDirection == Axis.horizontal,
      );
      // La tarjeta entera (con su padding), no solo el texto.
      final politica = tester.getRect(
        find.ancestor(of: find.text(_politica), matching: find.byType(Container)).first,
      );
      expect(politica.bottom, lessThanOrEqualTo(tester.getRect(fechas).top));
      expect(find.text('Reservar'), findsOneWidget);
    },
  );
}
