import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diverso_core/diverso_core.dart';

import 'ui/features/admin/admin_view.dart';
import 'ui/features/auth/login_view.dart';
import 'ui/features/dashboard/dashboard_view.dart';
import 'ui/features/onboarding/onboarding_view.dart';
import 'ui/features/planes/plan_form_view.dart';
import 'ui/features/planes/planes_view.dart';
import 'ui/features/shell/panel_shell.dart';
import 'ui/features/ventas/ventas_view.dart';
import 'starter_view.dart';

/// Router del panel (go_router): URLs persistentes (PWA), decisión de rol
/// en /starter y shell con estado por sección.
GoRouter buildPanelRouter() {
  final auth = Supabase.instance.client.auth;

  return GoRouter(
    initialLocation: '/starter',
    refreshListenable: GoRouterRefreshStream(auth.onAuthStateChange),
    redirect: (context, state) {
      final logueado = auth.currentUser != null;
      final publicas = ['/login', '/starter'];
      if (!logueado && !publicas.contains(state.matchedLocation)) return '/login';
      if (logueado && state.matchedLocation == '/login') return '/starter';
      return null;
    },
    routes: [
      GoRoute(path: '/starter', builder: (_, _) => const StarterView()),
      GoRoute(path: '/login', builder: (_, _) => const LoginView()),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingView()),
      GoRoute(path: '/admin', builder: (_, _) => const AdminRouteGuard()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => PanelShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/dashboard', builder: (_, _) => const DashboardView()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/planes',
              builder: (_, _) => const PlanesView(),
              routes: [
                GoRoute(
                  path: 'nuevo',
                  builder: (_, _) => const PlanFormView(),
                ),
                GoRoute(
                  path: 'editar/:id',
                  builder: (_, s) => PlanFormView(planId: s.pathParameters['id']),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/ventas', builder: (_, _) => const VentasView()),
          ]),
        ],
      ),
    ],
  );
}

/// Guard de la ruta admin: solo rol admin (si no, vuelve al starter).
class AdminRouteGuard extends StatelessWidget {
  const AdminRouteGuard({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: () async {
        final perfil = await AuthService().currentProfile();
        return perfil.rol == UserRole.admin;
      }(),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snap.data == true) {
          return const AdminView();
        }
        WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/starter'));
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      },
    );
  }
}

/// Adaptador Stream → Listenable para refreshListenable.
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
