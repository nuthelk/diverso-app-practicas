import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

Plan _plan({int reviews = 0, double rating = 0}) => Plan(
  id: 'p',
  agencyId: 'a',
  titulo: 'Plan',
  destino: 'Jericó',
  categoria: ExperienceCategory.cultura,
  precioCop: 100000,
  estado: PlanStatus.publicado,
  ratingPromedio: rating,
  reviewsCount: reviews,
);

void main() {
  test('Plan.esNuevo: sin reseñas aunque el promedio venga en 0', () {
    expect(_plan().esNuevo, isTrue);
    expect(_plan(reviews: 2, rating: 4.5).esNuevo, isFalse);
  });

  test('el comparador dice «Nueva» para un plan sin reseñas y conserva el formato con reseñas', () {
    final filas = buildComparisonRows([_plan(), _plan(reviews: 3, rating: 4.5)]);
    final rating = filas.firstWhere((f) => f.icono == 'rating');
    expect(rating.valores, ['Nueva', '4.5 ★ (3)']);
  });
}
