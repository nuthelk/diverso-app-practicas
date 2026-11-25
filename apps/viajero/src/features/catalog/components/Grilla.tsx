import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Medidas de `SliverGridDelegateWithMaxCrossAxisExtent` de Flutter: tantas columnas como hagan
 * falta para que ninguna pase de [maxAncho]; el alto sale del [aspecto] (ancho / alto).
 */
export function medidasGrilla(anchoUtil: number, { maxAncho = 430, espacio = 14, aspecto }: { maxAncho?: number; espacio?: number; aspecto: number }) {
  const columnas = Math.max(1, Math.ceil(anchoUtil / (maxAncho + espacio)));
  const ancho = (anchoUtil - espacio * (columnas - 1)) / columnas;
  return { columnas, ancho, alto: ancho / aspecto, espacio };
}

/**
 * Rejilla de tarjetas en pantallas anchas (> 640): filas de [columnas] celdas. El ancho útil se
 * calcula con el de la VENTANA (estable al hacer scroll), como en Flutter.
 *
 * Alto: el de Flutter (ancho / aspecto) como MÍNIMO. En Flutter era fijo y, si el contenido no
 * entraba (p. ej. la fila «★ ciudad · N planes» de una agencia partida en dos líneas), la tarjeta
 * desbordaba y se recortaba. Aquí la fila crece; cuando el contenido entra, mide lo mismo.
 * Las celdas se estiran al alto de la fila (las tarjetas usan flexGrow) para que la fila quede pareja.
 */
export function Grilla<T>({
  items,
  anchoUtil,
  aspecto,
  clave,
  render,
}: {
  items: readonly T[];
  anchoUtil: number;
  aspecto: number;
  clave: (item: T, i: number) => string;
  render: (item: T, i: number) => ReactNode;
}) {
  const m = medidasGrilla(anchoUtil, { aspecto });
  const filas: T[][] = [];
  for (let i = 0; i < items.length; i += m.columnas) filas.push(items.slice(i, i + m.columnas));
  return (
    <View testID="grilla" style={{ gap: m.espacio }}>
      {filas.map((fila, f) => (
        <View key={f} style={{ flexDirection: 'row', gap: m.espacio, minHeight: m.alto }}>
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
