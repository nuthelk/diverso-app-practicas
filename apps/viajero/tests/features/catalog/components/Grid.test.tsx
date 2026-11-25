import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Grid, gridMetrics } from '@/features/catalog/components/Grid';

describe('gridMetrics (SliverGridDelegateWithMaxCrossAxisExtent)', () => {
  test('984 px útiles con máximo 430 → 3 columnas del mismo ancho', () => {
    const m = gridMetrics(984);
    expect(m.columns).toBe(3);
    expect(m.width).toBeCloseTo((984 - 14 * 2) / 3);
    expect(m).not.toHaveProperty('height');
  });
});

describe('Grid', () => {
  test('cada fila mide lo que su contenido (sin alto mínimo de Flutter) y estira sus celdas al mismo alto', async () => {
    await render(<Grid items={['a', 'b', 'c', 'd']} usableWidth={984} keyOf={(x) => x} render={(x) => <Text>{x}</Text>} />);
    const rows = screen.getByTestId('grilla').children as unknown as { props: { style: unknown }; children: unknown[] }[];
    expect(rows).toHaveLength(2);
    expect(rows.map((f) => f.children.length)).toEqual([3, 1]);
    for (const row of rows) {
      const style = StyleSheet.flatten(row.props.style as never) as { minHeight?: number; height?: number; alignItems?: string };
      // Antes: minHeight = ancho / 0.82 ≈ 388 y la tarjeta de plan (~258) quedaba con ~130 px vacíos.
      expect(style.minHeight).toBeUndefined();
      expect(style.height).toBeUndefined();
      expect(style.alignItems ?? 'stretch').toBe('stretch');
    }
  });
});
