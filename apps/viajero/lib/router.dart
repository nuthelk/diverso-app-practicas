import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'ui/features/auth/login_view.dart';
import 'ui/features/bookings/bookings_view.dart';
import 'ui/features/bookings/review_view.dart';
import 'ui/features/catalog/catalog_view.dart';
import 'ui/features/catalog/comparator_view.dart';
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
/// - transiciones fade-through suaves en flujos
GoRouter buildViajeroRouter() {
  final auth = Supabase.instance.client.auth;

  return GoRouter(
    initialLocation: '/',
    refreshListenable: GoRouterRefreshStream(auth.onAuthStateChange),
    redirect: (context, state) {
      final logueado = auth.currentUser != null;
      final enLogin = state.matchedLocation == '/login';
      if (!logueado && !enLogin) return '/login';
      if (logueado && enLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginView(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (context, state) => const CatalogView()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/reservas', builder: (context, state) => const BookingsView()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/perfil', builder: (context, state) => const ProfileView()),
          ]),
        ],
      ),
      GoRoute(
        path: '/plan/:id',
        pageBuilder: (context, state) => _fade(state, PlanDetailView(planId: state.pathParameters['id']!)),
      ),
      GoRoute(
        path: '/checkout',
        pageBuilder: (context, state) {
          final extra = state.extra as (Plan, PlanDate)?;
          if (extra == null) return _fade(state, const CatalogView());
          return _fade(state, CheckoutView(plan: extra.$1, fecha: extra.$2));
        },
      ),
      GoRoute(
        path: '/exito',
        pageBuilder: (context, state) {
          final extra = state.extra;
          if (extra is SuccessArgs) return _fade(state, BookingSuccessView(args: extra));
          return _fade(state, const BookingsView());
        },
      ),
      GoRoute(
        path: '/resena',
        pageBuilder: (context, state) {
          final booking = state.extra as Booking?;
          if (booking == null) return _fade(state, const BookingsView());
          return _fade(state, ReviewView(booking: booking));
        },
      ),
      GoRoute(
        path: '/comparar',
        pageBuilder: (context, state) {
          final planes = (state.extra as List<Plan>?) ?? const <Plan>[];
          return _fade(state, ComparatorView(planes: planes));
        },
      ),
    ],
  );
}

CustomTransitionPage<T> _fade<T>(GoRouterState state, Widget child) {
  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 260),
    transitionsBuilder: (context, animation, secondary, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(scale: Tween(begin: .985, end: 1.0).animate(curved), child: child),
      );
    },
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
