import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ItineraryStepRow, CancellationCard, VerifiedBadge } from '@/ui/components';
import { lightTheme } from '@/ui/theme';

import { icon, renderWithTheme } from '../support/render-with-theme';

const styleOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

/** Luminancia relativa de un rgba/hex (para «fondo oscuro»). */
function rgba(color: string): [number, number, number, number] {
  const m = color.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const n = parseInt(color.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
}

// Port de widget_test.dart.
describe('VerifiedBadge', () => {
  it('muestra el sello RNT', async () => {
    await renderWithTheme(<VerifiedBadge />);
    expect(screen.getByText('Verificada RNT')).toBeOnTheScreen();
    expect(icon('verified_rounded').el).toBeOnTheScreen();
  });

  it('sobre foto: fondo oscuro casi opaco y texto blanco, legible sobre fotos claras', async () => {
    await renderWithTheme(<VerifiedBadge onPhoto compact />);
    const [r, g, b, a] = rgba(styleOf(screen.getByTestId('verified-badge')).backgroundColor as string);
    expect(a).toBeGreaterThanOrEqual(0.6);
    expect(r + g + b).toBe(0);
    const text = styleOf(screen.getByText('Verificada RNT'));
    expect(text.color).toBe('#FFFFFF');
    expect(text.fontSize).toBeGreaterThanOrEqual(10.5);
  });

  it('normal (fuera de fotos) conserva su color de marca', async () => {
    await renderWithTheme(<VerifiedBadge />);
    expect(styleOf(screen.getByText('Verificada RNT')).color).toBe(lightTheme.colorScheme.primary);
    expect(styleOf(screen.getByTestId('verified-badge')).backgroundColor).toBe(
      'rgba(31, 106, 79, 0.1)',
    );
  });

  it('compacto: padding 7/2.5, texto 10.5, ícono 13; normal: 10/5, 11, 15', async () => {
    const { rerender } = await renderWithTheme(<VerifiedBadge compact />);
    let box = styleOf(screen.getByTestId('verified-badge'));
    expect([box.paddingHorizontal, box.paddingVertical]).toEqual([7, 2.5]);
    expect(styleOf(screen.getByText('Verificada RNT')).fontSize).toBe(10.5);
    expect(icon('verified_rounded').size).toBe(13);

    await rerender(<VerifiedBadge />);
    box = styleOf(screen.getByTestId('verified-badge'));
    // `rerender` reemplaza el árbol completo: se monta sin el provider y usa el sistema (claro).
    expect([box.paddingHorizontal, box.paddingVertical]).toEqual([10, 5]);
    expect(styleOf(screen.getByText('Verificada RNT')).fontSize).toBe(11);
    expect(icon('verified_rounded').size).toBe(15);
  });
});

describe('CancellationCard', () => {
  it('título fijo, texto y escudo', async () => {
    await renderWithTheme(<CancellationCard text="Reembolso del 100 % hasta 48 h antes." />);
    expect(screen.getByText('Política de cancelación')).toBeOnTheScreen();
    expect(screen.getByText('Reembolso del 100 % hasta 48 h antes.')).toBeOnTheScreen();
    const shield = icon('shield_outlined');
    expect(shield.size).toBe(19);
    expect(shield.color).toBe(lightTheme.colorScheme.onTertiaryContainer);
    const box = styleOf(screen.getByTestId('cancellation-card'));
    expect(box.backgroundColor).toBe('rgba(193, 232, 252, 0.45)');
    expect(box.borderRadius).toBe(20);
    expect(box.padding).toBe(14);
  });
});

describe('ItineraryStepRow', () => {
  it('hora en primary w800 y la actividad', async () => {
    await renderWithTheme(<ItineraryStepRow step={{ time: '8:00', activity: 'Desayuno típico' }} />);
    const time = styleOf(screen.getByText('8:00'));
    expect(time.color).toBe(lightTheme.colorScheme.primary);
    expect(time.fontWeight).toBe('800');
    expect(time.fontSize).toBe(13);
    expect(time.lineHeight).toBeCloseTo(13 * 1.35, 5);
    const act = styleOf(screen.getByText('Desayuno típico'));
    expect(act.fontSize).toBe(14);
    expect(act.lineHeight).toBeCloseTo(14 * 1.45, 5);
  });

  it('la línea de tiempo une los puntos y termina en el último (no sigue por debajo)', async () => {
    await renderWithTheme(
      <>
        <ItineraryStepRow step={{ time: '8:00', activity: 'Desayuno típico' }} />
        <ItineraryStepRow step={{ time: '9:00', activity: 'Caminata' }} />
        <ItineraryStepRow step={{ time: '12:00', activity: 'Regreso' }} isLast />
      </>,
    );
    expect(screen.getAllByTestId('itinerary-line')).toHaveLength(2);
    expect(screen.getByText('Regreso')).toBeOnTheScreen();
  });
});
