import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Grilla, medidasGrilla } from '@/features/catalog/components/Grilla';

describe('medidasGrilla (SliverGridDelegateWithMaxCrossAxisExtent)', () => {
  test('984 px útiles con máximo 430 → 3 columnas del mismo ancho', () => {
    const m = medidasGrilla(984);
    expect(m.columnas).toBe(3);
    expect(m.ancho).toBeCloseTo((984 - 14 * 2) / 3);
    expect(m).not.toHaveProperty('alto');
  });
});

describe('Grilla', () => {
  test('cada fila mide lo que su contenido (sin alto mínimo de Flutter) y estira sus celdas al mismo alto', async () => {
    await render(<Grilla items={['a', 'b', 'c', 'd']} anchoUtil={984} clave={(x) => x} render={(x) => <Text>{x}</Text>} />);
    const filas = screen.getByTestId('grilla').children as unknown as { props: { style: unknown }; children: unknown[] }[];
    expect(filas).toHaveLength(2);
    expect(filas.map((f) => f.children.length)).toEqual([3, 1]);
    for (const fila of filas) {
      const estilo = StyleSheet.flatten(fila.props.style as never) as { minHeight?: number; height?: number; alignItems?: string };
      // Antes: minHeight = ancho / 0.82 ≈ 388 y la tarjeta de plan (~258) quedaba con ~130 px vacíos.
      expect(estilo.minHeight).toBeUndefined();
      expect(estilo.height).toBeUndefined();
      expect(estilo.alignItems ?? 'stretch').toBe('stretch');
    }
  });
});
