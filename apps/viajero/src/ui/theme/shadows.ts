import type { ViewStyle } from 'react-native';

/**
 * Sombras y elevaciones (§3.8). Casi todo es plano (elevación 0).
 *
 * Conversión de `BoxShadow.blurRadius` de Flutter a CSS/`boxShadow` de RN: Flutter usa
 * sigma = blur × 0.57735 + 0.5 y CSS sigma = blur / 2, así que el blur CSS equivalente es
 * 2 × sigma (blur 6 de Flutter ≈ 8 en CSS). Se deja el valor convertido para que se vea igual.
 */
export function cssBlurFromFlutter(blurRadius: number): number {
  return Math.round(2 * (blurRadius * 0.57735 + 0.5) * 100) / 100;
}

export const Shadows = {
  /**
   * Insignias sobre foto (`BookingStatusPill`, `DateBadge`):
   * `BoxShadow(color: rgba(0,0,0,.25), blurRadius: 6, offset: (0, 2))`.
   */
  badge: {
    boxShadow: `0px 2px ${cssBlurFromFlutter(6)}px rgba(0, 0, 0, 0.25)`,
  } satisfies ViewStyle,
  /**
   * Bandeja de comparar: `Material(elevation: 8, shadowColor: negro 35 %)`. En Android la
   * elevación nativa usa el mismo algoritmo que Flutter (sombra de Skia); en iOS/web se aproxima
   * con `boxShadow`.
   */
  tray: {
    elevation: 8,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.35)',
  } satisfies ViewStyle,
  /** `AppBar.scrolledUnderElevation: 0.5` (casi imperceptible). */
  scrolledAppBar: {
    elevation: 0.5,
    boxShadow: '0px 0.5px 1px rgba(0, 0, 0, 0.2)',
  } satisfies ViewStyle,
} as const;
