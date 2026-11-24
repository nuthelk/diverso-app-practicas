import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PasoItinerario, TarjetaCancelacion, VerifiedBadge } from '@/ui/components';
import { temaClaro } from '@/ui/theme';

import { icono, renderConTema } from '../support/conTema';

const estilo = (el: { props: { style?: unknown } }) =>
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
    await renderConTema(<VerifiedBadge />);
    expect(screen.getByText('Verificada RNT')).toBeOnTheScreen();
    expect(icono('verified_rounded').el).toBeOnTheScreen();
  });

  it('sobre foto: fondo oscuro casi opaco y texto blanco, legible sobre fotos claras', async () => {
    await renderConTema(<VerifiedBadge blanco compacto />);
    const [r, g, b, a] = rgba(estilo(screen.getByTestId('verified-badge')).backgroundColor as string);
    expect(a).toBeGreaterThanOrEqual(0.6);
    expect(r + g + b).toBe(0);
    const texto = estilo(screen.getByText('Verificada RNT'));
    expect(texto.color).toBe('#FFFFFF');
    expect(texto.fontSize).toBeGreaterThanOrEqual(10.5);
  });

  it('normal (fuera de fotos) conserva su color de marca', async () => {
    await renderConTema(<VerifiedBadge />);
    expect(estilo(screen.getByText('Verificada RNT')).color).toBe(temaClaro.colorScheme.primary);
    expect(estilo(screen.getByTestId('verified-badge')).backgroundColor).toBe(
      'rgba(31, 106, 79, 0.1)',
    );
  });

  it('compacto: padding 7/2.5, texto 10.5, ícono 13; normal: 10/5, 11, 15', async () => {
    const { rerender } = await renderConTema(<VerifiedBadge compacto />);
    let caja = estilo(screen.getByTestId('verified-badge'));
    expect([caja.paddingHorizontal, caja.paddingVertical]).toEqual([7, 2.5]);
    expect(estilo(screen.getByText('Verificada RNT')).fontSize).toBe(10.5);
    expect(icono('verified_rounded').size).toBe(13);

    await rerender(<VerifiedBadge />);
    caja = estilo(screen.getByTestId('verified-badge'));
    // `rerender` reemplaza el árbol completo: se monta sin el provider y usa el sistema (claro).
    expect([caja.paddingHorizontal, caja.paddingVertical]).toEqual([10, 5]);
    expect(estilo(screen.getByText('Verificada RNT')).fontSize).toBe(11);
    expect(icono('verified_rounded').size).toBe(15);
  });
});

describe('TarjetaCancelacion', () => {
  it('título fijo, texto y escudo', async () => {
    await renderConTema(<TarjetaCancelacion texto="Reembolso del 100 % hasta 48 h antes." />);
    expect(screen.getByText('Política de cancelación')).toBeOnTheScreen();
    expect(screen.getByText('Reembolso del 100 % hasta 48 h antes.')).toBeOnTheScreen();
    const escudo = icono('shield_outlined');
    expect(escudo.size).toBe(19);
    expect(escudo.color).toBe(temaClaro.colorScheme.onTertiaryContainer);
    const caja = estilo(screen.getByTestId('tarjeta-cancelacion'));
    expect(caja.backgroundColor).toBe('rgba(193, 232, 252, 0.45)');
    expect(caja.borderRadius).toBe(20);
    expect(caja.padding).toBe(14);
  });
});

describe('PasoItinerario', () => {
  it('hora en primary w800 y la actividad', async () => {
    await renderConTema(<PasoItinerario paso={{ hora: '8:00', actividad: 'Desayuno típico' }} />);
    const hora = estilo(screen.getByText('8:00'));
    expect(hora.color).toBe(temaClaro.colorScheme.primary);
    expect(hora.fontWeight).toBe('800');
    expect(hora.fontSize).toBe(13);
    expect(hora.lineHeight).toBeCloseTo(13 * 1.35, 5);
    const act = estilo(screen.getByText('Desayuno típico'));
    expect(act.fontSize).toBe(14);
    expect(act.lineHeight).toBeCloseTo(14 * 1.45, 5);
  });
});
