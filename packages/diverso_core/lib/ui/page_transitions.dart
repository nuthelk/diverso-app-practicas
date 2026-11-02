import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Lenguaje de movimiento compartido por las dos apps (patrones Material 3):
/// - [sharedAxisX]: navegación hacia adelante/atrás (catálogo → plan → checkout,
///   lista → formulario). Entra deslizando desde la derecha; la página cubierta
///   se aparte a la izquierda con desvanecido (parallax sutil).
/// - [fadeThrough]: cambios de pestaña del shell: la saliente se apaga rápido
///   y la entrante aparece con escala (evita el "corte" seco del IndexedStack).
/// - [zoomIn]: momento de celebración (reserva confirmada): la página crece
///   desde 90 % con un rebote contenido.
///
/// Todas respetan la dirección inversa al volver (reverseCurve), que es lo
/// que hace que la navegación se sienta física y predecible.
class DiversoPageTransitions {
  DiversoPageTransitions._();

  static CustomTransitionPage<void> sharedAxisX({required LocalKey key, required Widget child}) {
    return CustomTransitionPage<void>(
      key: key,
      child: child,
      transitionDuration: const Duration(milliseconds: 380),
      reverseTransitionDuration: const Duration(milliseconds: 300),
      transitionsBuilder: (context, animation, secondary, child) {
        final entrada = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        );
        final salida = CurvedAnimation(
          parent: secondary,
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        );
        return FadeTransition(
          opacity: Tween(begin: 1.0, end: 0.0).animate(salida),
          child: SlideTransition(
            position: Tween(begin: Offset.zero, end: const Offset(-0.05, 0)).animate(salida),
            child: FadeTransition(
              opacity: Tween(begin: 0.0, end: 1.0).animate(entrada),
              child: SlideTransition(
                position: Tween(begin: const Offset(0.08, 0), end: Offset.zero).animate(entrada),
                child: child,
              ),
            ),
          ),
        );
      },
    );
  }

  static CustomTransitionPage<void> fadeThrough({required LocalKey key, required Widget child}) {
    return CustomTransitionPage<void>(
      key: key,
      child: child,
      transitionDuration: const Duration(milliseconds: 320),
      transitionsBuilder: (context, animation, secondary, child) {
        final entrada = CurvedAnimation(
          parent: animation,
          curve: const Interval(0.35, 1.0, curve: Curves.easeOut),
        );
        final salida = CurvedAnimation(
          parent: secondary,
          curve: const Interval(0.0, 0.4, curve: Curves.easeIn),
        );
        return FadeTransition(
          opacity: Tween(begin: 1.0, end: 0.0).animate(salida),
          child: FadeTransition(
            opacity: Tween(begin: 0.0, end: 1.0).animate(entrada),
            child: ScaleTransition(
              scale: Tween(begin: 0.94, end: 1.0).animate(entrada),
              child: child,
            ),
          ),
        );
      },
    );
  }

  static CustomTransitionPage<void> zoomIn({required LocalKey key, required Widget child}) {
    return CustomTransitionPage<void>(
      key: key,
      child: child,
      transitionDuration: const Duration(milliseconds: 440),
      transitionsBuilder: (context, animation, secondary, child) {
        final escala = CurvedAnimation(parent: animation, curve: Curves.easeOutBack);
        final opacidad = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        );
        final salida = CurvedAnimation(parent: secondary, curve: Curves.easeInCubic);
        return FadeTransition(
          opacity: Tween(begin: 1.0, end: 0.0).animate(salida),
          child: FadeTransition(
            opacity: Tween(begin: 0.0, end: 1.0).animate(opacidad),
            child: ScaleTransition(
              scale: Tween(begin: 0.90, end: 1.0).animate(escala),
              child: child,
            ),
          ),
        );
      },
    );
  }
}
