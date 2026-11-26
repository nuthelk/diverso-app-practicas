import { Easing } from 'react-native';

/**
 * Lenguaje de movimiento (§3.9 y `diverso_core/lib/ui/page_transitions.dart`).
 *
 * Las curvas de Flutter son cubic-bezier: `puntos` sirve para `Easing.bezier` de Reanimated o
 * `cubic-bezier()` en CSS; `fn` ya es la función de RN Animated.
 */

export interface Curve {
  points: readonly [number, number, number, number];
  fn: (t: number) => number;
}

function cubic(x1: number, y1: number, x2: number, y2: number): Curve {
  return { points: [x1, y1, x2, y2], fn: Easing.bezier(x1, y1, x2, y2) };
}

/** `Curves.elasticOut` (ElasticOutCurve con período 0.4). */
function elasticOut(t: number): number {
  const period = 0.4;
  const s = period / 4;
  return Math.pow(2, -10 * t) * Math.sin(((t - s) * (Math.PI * 2)) / period) + 1;
}

export const Curves = {
  easeIn: cubic(0.42, 0.0, 1.0, 1.0),
  easeOut: cubic(0.0, 0.0, 0.58, 1.0),
  easeInOut: cubic(0.42, 0.0, 0.58, 1.0),
  easeInCubic: cubic(0.55, 0.055, 0.675, 0.19),
  easeOutCubic: cubic(0.215, 0.61, 0.355, 1.0),
  easeOutBack: cubic(0.175, 0.885, 0.32, 1.275),
  /** Curva de las transiciones de Material (p.ej. la etiqueta flotante del campo de texto). */
  fastOutSlowIn: cubic(0.4, 0.0, 0.2, 1.0),
  elasticOut,
} as const;

/** `Interval(inicio, fin, curve:)` de Flutter. */
export function interval(start: number, end: number, curve: (t: number) => number = (t) => t) {
  return (t: number) => {
    if (t <= start) return curve(0);
    if (t >= end) return curve(1);
    return curve((t - start) / (end - start));
  };
}

/** Duraciones en milisegundos (§3.9). */
export const Durations = {
  /** Pulso del skeleton (repeat reverse, opacidad .45 → 1, easeInOut). */
  skeleton: 1100,
  /** `CategoryChip` (color/borde, easeOut). */
  categoryChip: 180,
  /** Chips de fecha de `BookingBar` (easeOut). */
  dateChip: 160,
  /** Bandeja de comparar: entra easeOutCubic, sale easeInCubic (Size desde arriba + Fade). */
  compareTray: 220,
  /** Etiqueta de estrellas de la reseña (AnimatedSwitcher, fade). */
  starsLabel: 150,
  /** Galería de la ficha: escala 1.06 → 1, easeOutCubic. */
  gallery: 900,
  /** Check de confirmación: escala 0 → 1, elasticOut. */
  confirmationCheck: 380,
  /** `Appear`: escalonado 0.14 por paso, ventana 0.42, easeOutCubic, opacidad + translateY 14→0. */
  appear: 640,
  /** Etiqueta flotante del InputDecorator (`_kTransitionDuration`). */
  textField: 167,
} as const;

/** Estado visual de una página en un instante de la transición. */
export interface TransitionFrame {
  opacity: number;
  /** Desplazamiento horizontal como fracción del ancho (Offset de SlideTransition). */
  translateXFraction: number;
  scale: number;
}

export interface PageTransition {
  duration: number;
  reverseDuration: number;
  /** Página que entra, según el progreso de su animación (0 → 1). */
  enter: (progress: number) => TransitionFrame;
  /** Página cubierta, según el progreso de la animación secundaria (0 → 1). */
  exit: (progress: number) => TransitionFrame;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Port de `DiversoPageTransitions`. Las funciones son puras: sirven para un
 * `cardStyleInterpolator`, para Reanimated (`interpolate`) o para animaciones propias.
 * (La vuelta usa las curvas inversas — `reverseCurve` — al recorrer el progreso de 1 a 0.)
 */
export const PageTransitions: Record<'sharedAxisX' | 'fadeThrough' | 'zoomIn', PageTransition> = {
  /** Navegación adelante/atrás (catálogo → plan → checkout). */
  sharedAxisX: {
    duration: 380,
    reverseDuration: 300,
    enter: (p) => {
      const t = Curves.easeOutCubic.fn(p);
      return { opacity: t, translateXFraction: lerp(0.08, 0, t), scale: 1 };
    },
    exit: (p) => {
      const t = Curves.easeOutCubic.fn(p);
      return { opacity: 1 - t, translateXFraction: lerp(0, -0.05, t), scale: 1 };
    },
  },
  /** Pestañas del shell y cambios de estado. */
  fadeThrough: {
    duration: 320,
    reverseDuration: 320,
    enter: (p) => {
      const t = interval(0.35, 1.0, Curves.easeOut.fn)(p);
      return { opacity: t, translateXFraction: 0, scale: lerp(0.94, 1, t) };
    },
    exit: (p) => {
      const t = interval(0.0, 0.4, Curves.easeIn.fn)(p);
      return { opacity: 1 - t, translateXFraction: 0, scale: 1 };
    },
  },
  /** Celebración (reserva confirmada, `/reserva/:bookingId`). */
  zoomIn: {
    duration: 440,
    reverseDuration: 440,
    enter: (p) => ({
      opacity: Curves.easeOutCubic.fn(p),
      translateXFraction: 0,
      scale: lerp(0.9, 1, Curves.easeOutBack.fn(p)),
    }),
    exit: (p) => ({
      opacity: 1 - Curves.easeInCubic.fn(p),
      translateXFraction: 0,
      scale: 1,
    }),
  },
};

/**
 * Opciones para `<Stack.Screen options={...}>` de Expo Router (native-stack). El stack nativo no
 * admite curvas ni escalas propias: es la aproximación más cercana (`animationDuration` solo
 * aplica en iOS). Para el movimiento exacto, usar `PageTransitions` con Reanimated.
 */
export const screenOptions = {
  sharedAxisX: { animation: 'slide_from_right', animationDuration: 380 },
  fadeThrough: { animation: 'fade', animationDuration: 320 },
  zoomIn: { animation: 'fade', animationDuration: 440 },
} as const;
