import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'ui/features/auth/login_view.dart';
import 'ui/features/bookings/bookings_view.dart';
import 'ui/features/bookings/review_view.dart';
import 'ui/features/catalog/catalog_view.dart';
import 'ui/features/catalog/comparator_view.dart';
import 'ui/features/legal/consent_view.dart';
import 'ui/features/legal/legal_view.dart';
import 'ui/features/checkout/booking_success_view.dart';
import 'ui/features/checkout/checkout_view.dart';
import 'ui/features/plan/plan_detail_view.dart';
import 'ui/features/profile/profile_view.dart';
import 'shell/app_shell.dart';
import 'package:diverso_core/diverso_core.dart';
import 'ui/features/checkout/checkout_controller.dart';

/// Router de la app del viajero (go_router):
/// - redirect global por sesión
/// - StatefulShellRoute con estado por pestaña
/// - movimiento Material 3: shared-axis en flujos, fade-through en pestañas,
///   zoom en la confirmación (ver DiversoPageTransitions)
GoRouter buildViajeroRouter() {
  final auth = Supabase.instance.client.auth;

  return GoRouter(
    initialLocation: '/',
    refreshListenable: GoRouterRefreshStream(auth.onAuthStateChange),
    redirect: (context, state) {
      final logueado = auth.currentUser != null;
      final enLogin = state.matchedLocation == '/login';
      // Los documentos legales se leen antes de crear la cuenta.
      final enLegal = state.matchedLocation.startsWith('/legal/');
      if (!logueado && !enLogin && !enLegal) return '/login';
      if (logueado && enLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => DiversoPageTransitions.fadeThrough(
          key: state.pageKey,
          child: const LoginView(),
        ),
      ),
      GoRoute(
        path: '/legal/:doc',
        pageBuilder: (context, state) => DiversoPageTransitions.sharedAxisX(
          key: state.pageKey,
          child: LegalView(docId: state.pathParameters['doc']!),
        ),
      ),
      GoRoute(
        path: '/consentimiento',
        pageBuilder: (context, state) => DiversoPageTransitions.fadeThrough(
          key: state.pageKey,
          child: const ConsentView(),
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                pageBuilder: (context, state) =>
                    DiversoPageTransitions.fadeThrough(
                      key: state.pageKey,
                      child: const CatalogView(),
                    ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/reservas',
                pageBuilder: (context, state) =>
                    DiversoPageTransitions.fadeThrough(
                      key: state.pageKey,
                      child: const BookingsView(),
                    ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/perfil',
                pageBuilder: (context, state) =>
                    DiversoPageTransitions.fadeThrough(
                      key: state.pageKey,
                      child: const ProfileView(),
                    ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/plan/:id',
        pageBuilder: (context, state) => DiversoPageTransitions.sharedAxisX(
          key: state.pageKey,
          child: PlanDetailView(planId: state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/checkout',
        pageBuilder: (context, state) {
          final extra = state.extra as (Plan, PlanDate)?;
          if (extra == null) {
            return DiversoPageTransitions.fadeThrough(
              key: state.pageKey,
              child: const CatalogView(),
            );
          }
          return DiversoPageTransitions.sharedAxisX(
            key: state.pageKey,
            child: CheckoutView(plan: extra.$1, fecha: extra.$2),
          );
        },
      ),
      GoRoute(
        path: '/exito',
        pageBuilder: (context, state) {
          final extra = state.extra;
          if (extra is SuccessArgs) {
            return DiversoPageTransitions.zoomIn(
              key: state.pageKey,
              child: BookingSuccessView(args: extra),
            );
          }
          return DiversoPageTransitions.fadeThrough(
            key: state.pageKey,
            child: const BookingsView(),
          );
        },
      ),
      GoRoute(
        path: '/resena',
        pageBuilder: (context, state) {
          final booking = state.extra as Booking?;
          if (booking == null) {
            return DiversoPageTransitions.fadeThrough(
              key: state.pageKey,
              child: const BookingsView(),
            );
          }
          return DiversoPageTransitions.sharedAxisX(
            key: state.pageKey,
            child: ReviewView(booking: booking),
          );
        },
      ),
      GoRoute(
        path: '/comparar',
        pageBuilder: (context, state) {
          final planes = (state.extra as List<Plan>?) ?? const <Plan>[];
          return DiversoPageTransitions.sharedAxisX(
            key: state.pageKey,
            child: ComparatorView(planes: planes),
          );
        },
      ),
    ],
  );
}

/// Adaptador estándar Stream → Listenable para refreshListenable.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _sub = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
