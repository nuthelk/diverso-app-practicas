import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { DefaultTextStyle, Text } from '@/ui/components';

import { renderConTema } from '../support/conTema';

const estilo = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

/** Gotcha 1: sin un Text base propio el diseño se ve distinto (RN no hereda 1.43 ni 0.25). */
describe('Text base', () => {
  it('claro: #1D1B20, 14, lineHeight 14×1.43, letterSpacing 0.25', async () => {
    await renderConTema(<Text testID="t">hola</Text>);
    const s = estilo('t');
    expect(s.color).toBe('#1D1B20');
    expect(s.fontSize).toBe(14);
    expect(s.lineHeight).toBeCloseTo(20.02, 5);
    expect(s.letterSpacing).toBe(0.25);
  });

  it('oscuro: #E6E0E9', async () => {
    await renderConTema(<Text testID="t">hola</Text>, { modo: 'dark' });
    expect(estilo('t').color).toBe('#E6E0E9');
  });

  it('un estilo propio hereda altura y letter-spacing', async () => {
    await renderConTema(
      <Text testID="t" style={{ fontSize: 13, fontWeight: '700' }}>
        hola
      </Text>,
    );
    const s = estilo('t');
    expect(s.fontSize).toBe(13);
    expect(s.lineHeight).toBeCloseTo(18.59, 5);
    expect(s.letterSpacing).toBe(0.25);
    expect(s.fontWeight).toBe('700');
  });

  it('variante de la escala M3', async () => {
    await renderConTema(
      <Text testID="t" variante="labelSmall">
        hola
      </Text>,
    );
    const s = estilo('t');
    expect(s.fontSize).toBe(11);
    expect(s.fontWeight).toBe('500');
    expect(s.lineHeight).toBeCloseTo(15.95, 5);
    expect(s.letterSpacing).toBe(0.5);
  });

  it('un Text anidado hereda del padre, como un TextSpan', async () => {
    await renderConTema(
      <Text style={{ fontSize: 20, color: '#FF0000' }}>
        padre <Text testID="hijo">hijo</Text>
      </Text>,
    );
    const s = estilo('hijo');
    expect(s.fontSize).toBe(20);
    expect(s.color).toBe('#FF0000');
  });

  it('DefaultTextStyle reemplaza la base (lo que hacen los botones de Flutter)', async () => {
    await renderConTema(
      <DefaultTextStyle estilo={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: '#FFFFFF', altura: null }}>
        <Text testID="t">Pagar</Text>
      </DefaultTextStyle>,
    );
    const s = estilo('t');
    expect(s.fontSize).toBe(15);
    expect(s.letterSpacing).toBe(-0.2);
    expect(s.color).toBe('#FFFFFF');
    expect(s.lineHeight).toBeUndefined();
  });
});
