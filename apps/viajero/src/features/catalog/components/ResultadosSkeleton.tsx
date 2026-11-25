import { View } from 'react-native';

import { Card, Skeleton } from '@/ui/components';
import { AppInsets } from '@/ui/theme';

import { Grilla } from './Grilla';
import { ALTO_PORTADA_PLAN } from './PlanCard';

/** Marcador con la forma de una `PlanCard` mientras carga el catálogo. */
export function TarjetaSkeleton() {
  return (
    <Card testID="tarjeta-skeleton">
      <Skeleton height={ALTO_PORTADA_PLAN} radius={0} />
      <View style={AppInsets.card}>
        <Skeleton width={200} height={16} />
        <View style={{ height: 10 }} />
        <Skeleton width={120} height={12} />
        <View style={{ height: 14 }} />
        <Skeleton width={150} height={20} />
      </View>
    </Card>
  );
}

/** Tarjetas de carga: 4 en rejilla (pantallas anchas) o 3 en columna (celulares). */
export function ResultadosSkeleton({ esGrid, anchoUtil }: { esGrid: boolean; anchoUtil: number }) {
  const n = esGrid ? 4 : 3;
  const items = Array.from({ length: n }, (_, i) => i);
  return (
    <View style={AppInsets.roomyList}>
      {esGrid ? (
        <Grilla items={items} anchoUtil={anchoUtil} clave={(i) => String(i)} render={() => <TarjetaSkeleton />} />
      ) : (
        items.map((i) => (
          <View key={i} style={AppInsets.betweenCards}>
            <TarjetaSkeleton />
          </View>
        ))
      )}
    </View>
  );
}
