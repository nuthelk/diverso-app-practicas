import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, formatCOP, type ComparisonRow, type Plan } from '@/core';
import { AppRoutes } from '@/router';
import { FilledButton, Icono, Text } from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

export const ANCHO_ETIQUETA = 92;
export const ANCHO_MIN_COLUMNA = 132;

/** Ancho de cada columna de plan para un ancho disponible, y si la tabla debe deslizarse. */
export function medidasTabla(anchoDisponible: number, planes: number) {
  const anchoColumna = Math.max(ANCHO_MIN_COLUMNA, (anchoDisponible - ANCHO_ETIQUETA) / planes);
  const anchoTabla = ANCHO_ETIQUETA + anchoColumna * planes;
  return { anchoColumna, anchoTabla, desliza: anchoTabla > anchoDisponible + 0.5 };
}

/**
 * Tabla de comparación (`tabla_comparacion.dart`): columna de etiquetas de 92 y una columna por
 * plan de al menos 132. Si no caben, la tabla se desliza de lado (con aviso) en vez de aplastar
 * las columnas. La columna del más barato (empates: todas) va resaltada de punta a punta.
 * [anchoDisponible] sale de la ventana (sin medir el layout, como `LayoutBuilder`).
 */
export function TablaComparacion({
  planes,
  filas,
  anchoDisponible,
}: {
  planes: readonly Plan[];
  filas: readonly ComparisonRow[];
  anchoDisponible: number;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  const barato = Math.min(...planes.map((p) => p.priceCop));
  const esBarato = (i: number) => planes[i]!.priceCop === barato;
  const { anchoColumna, anchoTabla, desliza } = medidasTabla(anchoDisponible, planes.length);

  // Celda de la columna [i]; la del más barato lleva un fondo tenue de punta a punta.
  const celda = (i: number, hijo: ReactNode, { arriba = false, abajo = false } = {}) => (
    <View
      testID={`columna-${i}`}
      style={{
        width: anchoColumna,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: arriba ? 8 : 12,
        paddingBottom: abajo ? 10 : 12,
        backgroundColor: esBarato(i) ? withAlpha(cs.primary, 0.07) : undefined,
        borderTopLeftRadius: arriba ? 16 : 0,
        borderTopRightRadius: arriba ? 16 : 0,
        borderBottomLeftRadius: abajo ? 16 : 0,
        borderBottomRightRadius: abajo ? 16 : 0,
      }}
    >
      {hijo}
    </View>
  );

  const tabla = (
    <View testID="tabla-comparacion" style={{ width: anchoTabla }}>
      {/* Cabecera: foto, título y sello de mejor precio. */}
      <View style={estilos.fila}>
        <View style={{ width: ANCHO_ETIQUETA }} />
        {planes.map((p, i) => (
          <Fragment key={p.id}>{celda(i, <CabeceraPlan plan={p} mejorPrecio={esBarato(i)} />, { arriba: true })}</Fragment>
        ))}
      </View>
      {filas.map((fila) => {
        const esPrecio = fila.icon === 'precio' || fila.icon === 'total';
        return (
          <View key={fila.icon} style={[estilos.fila, { borderTopWidth: 1, borderTopColor: withAlpha(cs.outlineVariant, 0.5) }]}>
            <View style={{ width: ANCHO_ETIQUETA, paddingTop: 12, paddingRight: 8, paddingBottom: 12 }}>
              <Text altura={1.3} style={{ fontSize: AppText.caption, fontWeight: '600', color: cs.onSurfaceVariant }}>
                {fila.title}
              </Text>
            </View>
            {fila.values.map((v, i) => (
              <Fragment key={i}>
                {celda(i, <ValorComparado valor={v} esPrecio={esPrecio} destacado={esPrecio && esBarato(i)} />)}
              </Fragment>
            ))}
          </View>
        );
      })}
      {/* Un botón por plan, alineado con su columna. */}
      <View style={estilos.fila}>
        <View style={{ width: ANCHO_ETIQUETA }} />
        {planes.map((p, i) => (
          <Fragment key={p.id}>
            {celda(
              i,
              <FilledButton
                variante="tonal"
                texto="Ver plan"
                accessibilityLabel={`Ver plan ${p.title}`}
                style={{ minHeight: 40, paddingHorizontal: 8 }}
                onPress={() => router.push(AppRoutes.plan(p.id) as Href)}
              />,
              { abajo: true },
            )}
          </Fragment>
        ))}
      </View>
    </View>
  );

  if (!desliza) return tabla;
  return (
    <View>
      <View style={[estilos.fila, { alignItems: 'center' }]}>
        <Icono nombre="swipe_left_rounded" size={16} color={cs.onSurfaceVariant} />
        <Text style={{ marginLeft: 6, flex: 1, fontSize: AppText.caption, color: cs.onSurfaceVariant }}>
          Desliza la tabla para ver todos los planes
        </Text>
      </View>
      <View style={{ height: 10 }} />
      <ScrollView testID="tabla-deslizable" horizontal showsHorizontalScrollIndicator>
        {tabla}
      </ScrollView>
    </View>
  );
}

/** Foto (o emoji), título de hasta 3 líneas y sello «Mejor precio». */
function CabeceraPlan({ plan, mejorPrecio }: { plan: Plan; mejorPrecio: boolean }) {
  const cs = useTheme().colorScheme;
  const foto = plan.mainPhoto;
  return (
    <View>
      <View style={[estilos.foto, { backgroundColor: cs.primaryContainer }]}>
        {foto === null ? (
          <Text style={{ fontSize: AppText.heading3xl }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
        ) : (
          <Image source={{ uri: foto }} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
        )}
      </View>
      <View style={{ height: 8 }} />
      <Text numberOfLines={3} ellipsizeMode="tail" altura={1.25} style={{ fontWeight: '700', fontSize: AppText.smallBody }}>
        {plan.title}
      </Text>
      {mejorPrecio ? (
        <View style={[estilos.sello, { backgroundColor: cs.primaryContainer }]}>
          <Text style={{ fontSize: AppText.micro, fontWeight: '700', color: cs.onPrimaryContainer }}>Mejor precio</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Valor de una celda: los precios se formatean en COP en UNA línea (si no cabe, se achica: el «$»
 * nunca queda separado del monto); «✓ Incluido» en primary, «—» en outline.
 */
function ValorComparado({ valor, esPrecio, destacado }: { valor: string; esPrecio: boolean; destacado: boolean }) {
  const cs = useTheme().colorScheme;
  if (esPrecio) {
    const numero = Number(valor);
    return (
      <Text
        testID="valor-precio-comparado"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={{
          fontSize: destacado ? AppText.subtitle : AppText.largeBody,
          fontWeight: destacado ? '800' : '600',
          color: destacado ? cs.primary : cs.onSurface,
        }}
      >
        {valor.trim() === '' || Number.isNaN(numero) ? valor : formatCOP(numero)}
      </Text>
    );
  }
  const incluido = valor === '✓ Incluido';
  const vacio = valor === '—';
  return (
    <Text
      altura={1.4}
      style={{
        fontSize: AppText.detail,
        fontWeight: incluido ? '700' : '500',
        color: incluido ? cs.primary : vacio ? cs.outline : cs.onSurface,
      }}
    >
      {valor}
    </Text>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'stretch' },
  foto: { aspectRatio: 1.5, borderRadius: AppRadii.control, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  sello: { marginTop: 6, alignSelf: 'flex-start', borderRadius: AppRadii.pill, paddingHorizontal: 8, paddingVertical: 3 },
});
