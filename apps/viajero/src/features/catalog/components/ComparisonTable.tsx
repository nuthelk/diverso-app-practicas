import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, formatCOP, type ComparisonRow, type Plan } from '@/core';
import { AppRoutes } from '@/router';
import { FilledButton, Icon, Text } from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

export const LABEL_WIDTH = 92;
export const MIN_COLUMN_WIDTH = 132;

/** Ancho de cada columna de plan para un ancho disponible, y si la tabla debe deslizarse. */
export function tableMetrics(availableWidth: number, planCount: number) {
  const columnWidth = Math.max(MIN_COLUMN_WIDTH, (availableWidth - LABEL_WIDTH) / planCount);
  const tableWidth = LABEL_WIDTH + columnWidth * planCount;
  return { columnWidth, tableWidth, isScrollable: tableWidth > availableWidth + 0.5 };
}

/**
 * Tabla de comparación (`tabla_comparacion.dart`): columna de etiquetas de 92 y una columna por
 * plan de al menos 132. Si no caben, la tabla se desliza de lado (con aviso) en vez de aplastar
 * las columnas. La columna del más barato (empates: todas) va resaltada de punta a punta.
 * [availableWidth] sale de la ventana (sin medir el layout, como `LayoutBuilder`).
 */
export function ComparisonTable({
  plans,
  rows,
  availableWidth,
}: {
  plans: readonly Plan[];
  rows: readonly ComparisonRow[];
  availableWidth: number;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  const lowestPrice = Math.min(...plans.map((p) => p.priceCop));
  const isCheapest = (i: number) => plans[i]!.priceCop === lowestPrice;
  const { columnWidth, tableWidth, isScrollable } = tableMetrics(availableWidth, plans.length);

  // Celda de la columna [i]; la del más barato lleva un fondo tenue de punta a punta.
  const cell = (i: number, child: ReactNode, { top = false, bottom = false } = {}) => (
    <View
      testID={`columna-${i}`}
      style={{
        width: columnWidth,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: top ? 8 : 12,
        paddingBottom: bottom ? 10 : 12,
        backgroundColor: isCheapest(i) ? withAlpha(cs.primary, 0.07) : undefined,
        borderTopLeftRadius: top ? 16 : 0,
        borderTopRightRadius: top ? 16 : 0,
        borderBottomLeftRadius: bottom ? 16 : 0,
        borderBottomRightRadius: bottom ? 16 : 0,
      }}
    >
      {child}
    </View>
  );

  const table = (
    <View testID="tabla-comparacion" style={{ width: tableWidth }}>
      {/* Cabecera: foto, título y sello de mejor precio. */}
      <View style={styles.row}>
        <View style={{ width: LABEL_WIDTH }} />
        {plans.map((p, i) => (
          <Fragment key={p.id}>{cell(i, <PlanHeader plan={p} bestPrice={isCheapest(i)} />, { top: true })}</Fragment>
        ))}
      </View>
      {rows.map((row) => {
        const isPrice = row.icon === 'precio' || row.icon === 'total';
        return (
          <View key={row.icon} style={[styles.row, { borderTopWidth: 1, borderTopColor: withAlpha(cs.outlineVariant, 0.5) }]}>
            <View style={{ width: LABEL_WIDTH, paddingTop: 12, paddingRight: 8, paddingBottom: 12 }}>
              <Text height={1.3} style={{ fontSize: AppText.caption, fontWeight: '600', color: cs.onSurfaceVariant }}>
                {row.title}
              </Text>
            </View>
            {row.values.map((v, i) => (
              <Fragment key={i}>
                {cell(i, <ComparedValue value={v} isPrice={isPrice} highlighted={isPrice && isCheapest(i)} />)}
              </Fragment>
            ))}
          </View>
        );
      })}
      {/* Un botón por plan, alineado con su columna. */}
      <View style={styles.row}>
        <View style={{ width: LABEL_WIDTH }} />
        {plans.map((p, i) => (
          <Fragment key={p.id}>
            {cell(
              i,
              <FilledButton
                variant="tonal"
                text="Ver plan"
                accessibilityLabel={`Ver plan ${p.title}`}
                style={{ minHeight: 40, paddingHorizontal: 8 }}
                onPress={() => router.push(AppRoutes.plan(p.id) as Href)}
              />,
              { bottom: true },
            )}
          </Fragment>
        ))}
      </View>
    </View>
  );

  if (!isScrollable) return table;
  return (
    <View>
      <View style={[styles.row, { alignItems: 'center' }]}>
        <Icon name="swipe_left_rounded" size={16} color={cs.onSurfaceVariant} />
        <Text style={{ marginLeft: 6, flex: 1, fontSize: AppText.caption, color: cs.onSurfaceVariant }}>
          Desliza la tabla para ver todos los planes
        </Text>
      </View>
      <View style={{ height: 10 }} />
      <ScrollView testID="tabla-deslizable" horizontal showsHorizontalScrollIndicator>
        {table}
      </ScrollView>
    </View>
  );
}

/** Foto (o emoji), título de hasta 3 líneas y sello «Mejor precio». */
function PlanHeader({ plan, bestPrice }: { plan: Plan; bestPrice: boolean }) {
  const cs = useTheme().colorScheme;
  const photo = plan.mainPhoto;
  return (
    <View>
      <View style={[styles.photo, { backgroundColor: cs.primaryContainer }]}>
        {photo === null ? (
          <Text style={{ fontSize: AppText.heading3xl }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
        ) : (
          <Image source={{ uri: photo }} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
        )}
      </View>
      <View style={{ height: 8 }} />
      <Text numberOfLines={3} ellipsizeMode="tail" height={1.25} style={{ fontWeight: '700', fontSize: AppText.smallBody }}>
        {plan.title}
      </Text>
      {bestPrice ? (
        <View style={[styles.seal, { backgroundColor: cs.primaryContainer }]}>
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
function ComparedValue({ value, isPrice, highlighted }: { value: string; isPrice: boolean; highlighted: boolean }) {
  const cs = useTheme().colorScheme;
  if (isPrice) {
    const amount = Number(value);
    return (
      <Text
        testID="valor-precio-comparado"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={{
          fontSize: highlighted ? AppText.subtitle : AppText.largeBody,
          fontWeight: highlighted ? '800' : '600',
          color: highlighted ? cs.primary : cs.onSurface,
        }}
      >
        {value.trim() === '' || Number.isNaN(amount) ? value : formatCOP(amount)}
      </Text>
    );
  }
  const included = value === '✓ Incluido';
  const empty = value === '—';
  return (
    <Text
      height={1.4}
      style={{
        fontSize: AppText.detail,
        fontWeight: included ? '700' : '500',
        color: included ? cs.primary : empty ? cs.outline : cs.onSurface,
      }}
    >
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  photo: { aspectRatio: 1.5, borderRadius: AppRadii.control, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  seal: { marginTop: 6, alignSelf: 'flex-start', borderRadius: AppRadii.pill, paddingHorizontal: 8, paddingVertical: 3 },
});
