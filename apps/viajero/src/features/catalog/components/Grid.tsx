import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Columnas de `SliverGridDelegateWithMaxCrossAxisExtent` de Flutter: tantas como hagan falta para
 * que ninguna pase de [maxWidth], todas del mismo ancho.
 */
export function gridMetrics(usableWidth: number, { maxWidth = 430, gap = 14 }: { maxWidth?: number; gap?: number } = {}) {
  const columns = Math.max(1, Math.ceil(usableWidth / (maxWidth + gap)));
  const width = (usableWidth - gap * (columns - 1)) / columns;
  return { columns, width, gap };
}

/**
 * Rejilla de tarjetas en pantallas anchas (> 640): filas de [columns] celdas. El ancho útil se
 * calcula con el de la VENTANA (estable al hacer scroll), como en Flutter.
 *
 * Alto: el del contenido. En Flutter era fijo (ancho / childAspectRatio) y aquí fue un mínimo,
 * pero con celdas anchas la tarjeta de plan (~258 px) quedaba con ~130 px vacíos bajo el precio.
 * Las celdas de una fila se estiran al alto de la más alta (alignItems por defecto, `stretch`) y
 * las tarjetas usan flexGrow para llenarlas: la fila queda pareja sin alto fijo ni mínimo.
 */
export function Grid<T>({
  items,
  usableWidth,
  keyOf,
  render,
}: {
  items: readonly T[];
  usableWidth: number;
  keyOf: (item: T, i: number) => string;
  render: (item: T, i: number) => ReactNode;
}) {
  const m = gridMetrics(usableWidth);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += m.columns) rows.push(items.slice(i, i + m.columns));
  return (
    <View testID="grid" style={{ gap: m.gap }}>
      {rows.map((row, f) => (
        <View key={f} style={{ flexDirection: 'row', gap: m.gap }}>
          {row.map((item, c) => (
            <Fragment key={keyOf(item, f * m.columns + c)}>
              <View style={{ width: m.width }}>{render(item, f * m.columns + c)}</View>
            </Fragment>
          ))}
        </View>
      ))}
    </View>
  );
}
