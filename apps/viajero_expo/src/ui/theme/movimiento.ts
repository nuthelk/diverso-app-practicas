import { Easing } from 'react-native';

/**
 * Lenguaje de movimiento (§3.9 y `diverso_core/lib/ui/page_transitions.dart`).
 *
 * Las curvas de Flutter son cubic-bezier: `puntos` sirve para `Easing.bezier` de Reanimated o
 * `cubic-bezier()` en CSS; `fn` ya es la función de RN Animated.
 */

export interface Curva {
  puntos: readonly [number, number, number, number];
  fn: (t: number) => number;
}

function cubica(x1: number, y1: number, x2: number, y2: number): Curva {
  return { puntos: [x1, y1, x2, y2], fn: Easing.bezier(x1, y1, x2, y2) };
}

/** `Curves.elasticOut` (ElasticOutCurve con período 0.4). */
function elasticOut(t: number): number {
  const periodo = 0.4;
  const s = periodo / 4;
  return Math.pow(2, -10 * t) * Math.sin(((t - s) * (Math.PI * 2)) / periodo) + 1;
}

export const Curvas = {
  easeIn: cubica(0.42, 0.0, 1.0, 1.0),
  easeOut: cubica(0.0, 0.0, 0.58, 1.0),
  easeInOut: cubica(0.42, 0.0, 0.58, 1.0),
  easeInCubic: cubica(0.55, 0.055, 0.675, 0.19),
  easeOutCubic: cubica(0.215, 0.61, 0.355, 1.0),
  easeOutBack: cubica(0.175, 0.885, 0.32, 1.275),
  /** Curva de las transiciones de Material (p.ej. la etiqueta flotante del campo de texto). */
  fastOutSlowIn: cubica(0.4, 0.0, 0.2, 1.0),
  elasticOut,
} as const;

/** `Interval(inicio, fin, curve:)` de Flutter. */
export function intervalo(inicio: number, fin: number, curva: (t: number) => number = (t) => t) {
  return (t: number) => {
    if (t <= inicio) return curva(0);
    if (t >= fin) return curva(1);
    return curva((t - inicio) / (fin - inicio));
  };
}

/** Duraciones en milisegundos (§3.9). */
export const Duraciones = {
  /** Pulso del skeleton (repeat reverse, opacidad .45 → 1, easeInOut). */
  skeleton: 1100,
  /** `ChipCategoria` (color/borde, easeOut). */
  chipCategoria: 180,
  /** Chips de fecha de `BarraReserva` (easeOut). */
  chipFecha: 160,
  /** Bandeja de comparar: entra easeOutCubic, sale easeInCubic (Size desde arriba + Fade). */
  bandejaComparar: 220,
  /** Etiqueta de estrellas de la reseña (AnimatedSwitcher, fade). */
  etiquetaEstrellas: 150,
  /** Galería de la ficha: escala 1.06 → 1, easeOutCubic. */
  galeria: 900,
  /** Check de confirmación: escala 0 → 1, elasticOut. */
  checkConfirmacion: 380,
  /** `Aparecer`: escalonado 0.14 por paso, ventana 0.42, easeOutCubic, opacidad + translateY 14→0. */
  aparecer: 640,
  /** Etiqueta flotante del InputDecorator (`_kTransitionDuration`). */
  campoTexto: 167,
} as const;

/** Estado visual de una página en un instante de la transición. */
export interface MarcoTransicion {
  opacity: number;
  /** Desplazamiento horizontal como fracción del ancho (Offset de SlideTransition). */
  translateXFraccion: number;
  scale: number;
}

export interface TransicionDePagina {
  duracion: number;
  duracionVuelta: number;
  /** Página que entra, según el progreso de su animación (0 → 1). */
  entrada: (progreso: number) => MarcoTransicion;
  /** Página cubierta, según el progreso de la animación secundaria (0 → 1). */
  salida: (progreso: number) => MarcoTransicion;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Port de `DiversoPageTransitions`. Las funciones son puras: sirven para un
 * `cardStyleInterpolator`, para Reanimated (`interpolate`) o para animaciones propias.
 * (La vuelta usa las curvas inversas — `reverseCurve` — al recorrer el progreso de 1 a 0.)
 */
export const TransicionesDePagina: Record<'sharedAxisX' | 'fadeThrough' | 'zoomIn', TransicionDePagina> = {
  /** Navegación adelante/atrás (catálogo → plan → checkout). */
  sharedAxisX: {
    duracion: 380,
    duracionVuelta: 300,
    entrada: (p) => {
      const t = Curvas.easeOutCubic.fn(p);
      return { opacity: t, translateXFraccion: lerp(0.08, 0, t), scale: 1 };
    },
    salida: (p) => {
      const t = Curvas.easeOutCubic.fn(p);
      return { opacity: 1 - t, translateXFraccion: lerp(0, -0.05, t), scale: 1 };
    },
  },
  /** Pestañas del shell y cambios de estado. */
  fadeThrough: {
    duracion: 320,
    duracionVuelta: 320,
    entrada: (p) => {
      const t = intervalo(0.35, 1.0, Curvas.easeOut.fn)(p);
      return { opacity: t, translateXFraccion: 0, scale: lerp(0.94, 1, t) };
    },
    salida: (p) => {
      const t = intervalo(0.0, 0.4, Curvas.easeIn.fn)(p);
      return { opacity: 1 - t, translateXFraccion: 0, scale: 1 };
    },
  },
  /** Celebración (reserva confirmada, `/reserva/:bookingId`). */
  zoomIn: {
    duracion: 440,
    duracionVuelta: 440,
    entrada: (p) => ({
      opacity: Curvas.easeOutCubic.fn(p),
      translateXFraccion: 0,
      scale: lerp(0.9, 1, Curvas.easeOutBack.fn(p)),
    }),
    salida: (p) => ({
      opacity: 1 - Curvas.easeInCubic.fn(p),
      translateXFraccion: 0,
      scale: 1,
    }),
  },
};

/**
 * Opciones para `<Stack.Screen options={...}>` de Expo Router (native-stack). El stack nativo no
 * admite curvas ni escalas propias: es la aproximación más cercana (`animationDuration` solo
 * aplica en iOS). Para el movimiento exacto, usar `TransicionesDePagina` con Reanimated.
 */
export const opcionesDePantalla = {
  sharedAxisX: { animation: 'slide_from_right', animationDuration: 380 },
  fadeThrough: { animation: 'fade', animationDuration: 320 },
  zoomIn: { animation: 'fade', animationDuration: 440 },
} as const;
