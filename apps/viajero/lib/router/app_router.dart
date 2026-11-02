import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../ui/features/agencies/views/agencia_view.dart';
import '../ui/features/agencies/views/agencias_view.dart';
import '../ui/features/auth/views/login_view.dart';
import '../ui/features/bookings/views/bookings_view.dart';
import '../ui/features/bookings/views/reserva_detalle_view.dart';
import '../ui/features/bookings/views/review_loader.dart';
import '../ui/features/catalog/view_models/catalog_view_model.dart';
import '../ui/features/catalog/views/catalog_view.dart';
import '../ui/features/catalog/views/comparator_loader.dart';
import '../ui/features/checkout/views/checkout_loader.dart';
import '../ui/features/checkout/views/pago_resultado_view.dart';
import '../ui/features/checkout/views/reserva_view.dart';
import '../ui/features/legal/view_models/consent_view_model.dart';
import '../ui/features/legal/views/consent_view.dart';
import '../ui/features/legal/views/legal_view.dart';
import '../ui/features/plan/views/plan_detail_view.dart';
import '../ui/features/profile/views/profile_view.dart';
import '../ui/shell/app_shell.dart';
import '../ui/shell/pagina_no_encontrada_view.dart';
import 'app_routes.dart';
import 'go_router_refresh_stream.dart';
import 'sesion_redirect.dart';

typedef _Transicion =
    CustomTransitionPage<void> Function({required LocalKey key, required Widget child});

/// Una ruta con su transición de página (ver [DiversoPageTransitions]).
GoRoute _ruta(String path, _Transicion transicion, Widget Function(GoRouterState) pantalla) =>
    GoRoute(
      path: path,
      pageBuilder: (context, state) => transicion(key: state.pageKey, child: pantalla(state)),
    );

/// Ids de `?ids=a,b,c` (sin vacíos ni repetidos, como mucho los que caben en el comparador).
List<String> _idsAComparar(GoRouterState state) => (state.uri.queryParameters['ids'] ?? '')
    .split(',')
    .where((id) => id.isNotEmpty)
    .toSet()
    .take(CatalogViewModel.maxComparar)
    .toList();

/// Router de la app del viajero (go_router): tabla de rutas, redirect por sesión y
/// consentimiento ([sesionRedirect]), `StatefulShellRoute` con estado por pestaña y movimiento
/// Material 3 (shared-axis en flujos, fade-through en pestañas, zoom en la confirmación).
///
/// Se crea **una sola vez** (ver `DiversoApp`): recrearlo reiniciaría la navegación. La sesión se
/// lee de [auth]; el router se reevalúa cuando cambia la sesión o el estado de [consentimiento].
///
/// Todas las pantallas llevan sus ids en la URL (`/plan/:id`, `/reservas/:bookingId`,
/// `/resena/:bookingId`, `/comparar?ids=…`, `/pago/resultado?reserva=…`) y cargan sus datos del
/// backend, así sobreviven a una recarga en web; `state.extra` solo adelanta datos que ya se
/// tenían para pintar al instante.
GoRouter buildViajeroRouter({
  required AuthRepository auth,
  required ConsentViewModel consentimiento,
  String initialLocation = AppRoutes.explorar,
}) {
  return GoRouter(
    initialLocation: initialLocation,
    refreshListenable: Listenable.merge([
      GoRouterRefreshStream(auth.onAuthStateChanged),
      consentimiento,
    ]),
    redirect: (context, state) => sesionRedirect(
      haySesion: auth.currentUserId != null,
      consentimiento: consentimiento.estado,
      ubicacion: state.uri.toString(),
    ),
    errorBuilder: (context, state) => PaginaNoEncontradaView(ubicacion: state.uri.toString()),
    routes: [
      _ruta(AppRoutes.login, DiversoPageTransitions.fadeThrough, (_) => const LoginView()),
      _ruta(
        AppRoutes.legalPatron,
        DiversoPageTransitions.sharedAxisX,
        (state) => LegalView(docId: state.pathParameters['doc']!),
      ),
      _ruta(
        AppRoutes.consentimiento,
        DiversoPageTransitions.fadeThrough,
        (_) => const ConsentView(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              _ruta(
                AppRoutes.explorar,
                DiversoPageTransitions.fadeThrough,
                (_) => const CatalogView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              _ruta(
                AppRoutes.agencias,
                DiversoPageTransitions.fadeThrough,
                (_) => const AgenciasView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              _ruta(
                AppRoutes.reservas,
                DiversoPageTransitions.fadeThrough,
                (_) => const BookingsView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              _ruta(
                AppRoutes.perfil,
                DiversoPageTransitions.fadeThrough,
                (_) => const ProfileView(),
              ),
            ],
          ),
        ],
      ),
      _ruta(
        AppRoutes.agenciaPatron,
        DiversoPageTransitions.sharedAxisX,
        (state) => AgenciaView(agencyId: state.pathParameters['id']!),
      ),
      _ruta(
        AppRoutes.planPatron,
        DiversoPageTransitions.sharedAxisX,
        (state) => PlanDetailView(planId: state.pathParameters['id']!),
      ),
      _ruta(
        AppRoutes.checkoutPatron,
        DiversoPageTransitions.sharedAxisX,
        (state) => CheckoutLoader(
          planId: state.pathParameters['planId']!,
          fechaId: state.pathParameters['fechaId']!,
        ),
      ),
      _ruta(
        AppRoutes.pagoResultado,
        DiversoPageTransitions.fadeThrough,
        (state) => PagoResultadoView(
          transactionId: state.uri.queryParameters['id'],
          bookingId: state.uri.queryParameters['reserva'],
        ),
      ),
      _ruta(
        AppRoutes.reservaPatron,
        DiversoPageTransitions.zoomIn,
        (state) => ReservaView(bookingId: state.pathParameters['bookingId']!),
      ),
      _ruta(
        AppRoutes.reservaDetallePatron,
        DiversoPageTransitions.sharedAxisX,
        (state) => ReservaDetalleView(
          bookingId: state.pathParameters['bookingId']!,
          booking: state.extra as Booking?,
        ),
      ),
      _ruta(
        AppRoutes.resenaPatron,
        DiversoPageTransitions.sharedAxisX,
        (state) => ReviewLoader(
          bookingId: state.pathParameters['bookingId']!,
          booking: state.extra as Booking?,
        ),
      ),
      _ruta(
        AppRoutes.comparar,
        DiversoPageTransitions.sharedAxisX,
        (state) => ComparatorLoader(ids: _idsAComparar(state), planes: state.extra as List<Plan>?),
      ),
      // Rutas anteriores (dependían de `state.extra`, que se pierde al recargar en web).
      GoRoute(path: '/checkout', redirect: (context, state) => AppRoutes.explorar),
      GoRoute(path: '/exito', redirect: (context, state) => AppRoutes.reservas),
      GoRoute(path: AppRoutes.resenaBase, redirect: (context, state) => AppRoutes.reservas),
    ],
  );
}
