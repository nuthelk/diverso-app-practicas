import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/review.dart';
import 'booking_service.dart';

class ReviewService {
  SupabaseClient get _client => Supabase.instance.client;

  Future<List<Review>> porPlan(String planId, {int limit = 20}) async {
    final res = await _client
        .from('reviews')
        .select('*, profiles(nombre)')
        .eq('plan_id', planId)
        .order('created_at', ascending: false)
        .limit(limit);
    return res.map((e) => Review.fromMap((e as Map).cast<String, dynamic>())).toList();
  }

  /// Publica la reseña de una reserva propia ya viajada.
  /// El servidor valida (RLS) que la reserva esté confirmada/completada,
  /// sea del usuario y la fecha del plan ya haya pasado, y deriva plan/viajero.
  Future<void> crear({
    required String bookingId,
    required int calificacion,
    String? comentario,
  }) async {
    try {
      await _client.from('reviews').insert({
        'booking_id': bookingId,
        'calificacion': calificacion,
        'comentario': comentario?.trim().isEmpty == true ? null : comentario?.trim(),
      });
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }
}
