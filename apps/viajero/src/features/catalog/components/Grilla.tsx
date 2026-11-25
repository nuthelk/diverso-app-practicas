import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Columnas de `SliverGridDelegateWithMaxCrossAxisExtent` de Flutter: tantas como hagan falta para
 * que ninguna pase de [maxAncho], todas del mismo ancho.
 */
export function medidasGrilla(anchoUtil: number, { maxAncho = 430, espacio = 14 }: { maxAncho?: number; espacio?: number } = {}) {
  const columnas = Math.max(1, Math.ceil(anchoUtil / (maxAncho + espacio)));
  const ancho = (anchoUtil - espacio * (columnas - 1)) / columnas;
  return { columnas, ancho, espacio };
}

/**
 * Rejilla de tarjetas en pantallas anchas (> 640): filas de [columnas] celdas. El ancho útil se
 * calcula con el de la VENTANA (estable al hacer scroll), como en Flutter.
 *
 * Alto: el del contenido. En Flutter era fijo (ancho / childAspectRatio) y aquí fue un mínimo,
 * pero con celdas anchas la tarjeta de plan (~258 px) quedaba con ~130 px vacíos bajo el precio.
 * Las celdas de una fila se estiran al alto de la más alta (alignItems por defecto, `stretch`) y
 * las tarjetas usan flexGrow para llenarlas: la fila queda pareja sin alto fijo ni mínimo.
 */
export function Grilla<T>({
  items,
  anchoUtil,
  clave,
  render,
}: {
  items: readonly T[];
  anchoUtil: number;
  clave: (item: T, i: number) => string;
  render: (item: T, i: number) => ReactNode;
}) {
  const m = medidasGrilla(anchoUtil);
  const filas: T[][] = [];
  for (let i = 0; i < items.length; i += m.columnas) filas.push(items.slice(i, i + m.columnas));
  return (
    <View testID="grilla" style={{ gap: m.espacio }}>
      {filas.map((fila, f) => (
        <View key={f} style={{ flexDirection: 'row', gap: m.espacio }}>
          {fila.map((item, c) => (
            <Fragment key={clave(item, f * m.columnas + c)}>
              <View style={{ width: m.ancho }}>{render(item, f * m.columnas + c)}</View>
            </Fragment>
          ))}
        </View>
      ))}
    </View>
  );
}
