import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Grilla, medidasGrilla } from '@/features/catalog/components/Grilla';

describe('medidasGrilla (SliverGridDelegateWithMaxCrossAxisExtent)', () => {
  test('984 px útiles con máximo 430 → 3 columnas; alto = ancho / aspecto', () => {
    const m = medidasGrilla(984, { aspecto: 1.7 });
    expect(m.columnas).toBe(3);
    expect(m.ancho).toBeCloseTo((984 - 14 * 2) / 3);
    expect(m.alto).toBeCloseTo(m.ancho / 1.7);
  });
});

describe('Grilla', () => {
  test('cada fila mide como mínimo el alto de Flutter, pero crece si el contenido no entra (no recorta)', async () => {
    await render(
      <Grilla items={['a', 'b', 'c', 'd']} anchoUtil={984} aspecto={1.7} clave={(x) => x} render={(x) => <Text>{x}</Text>} />,
    );
    const { alto } = medidasGrilla(984, { aspecto: 1.7 });
    const filas = screen.getByTestId('grilla').children as unknown as { props: { style: unknown } }[];
    expect(filas).toHaveLength(2);
    for (const fila of filas) {
      const estilo = StyleSheet.flatten(fila.props.style as never) as { minHeight?: number; height?: number };
      expect(estilo.minHeight).toBeCloseTo(alto);
      expect(estilo.height).toBeUndefined();
    }
  });
});
