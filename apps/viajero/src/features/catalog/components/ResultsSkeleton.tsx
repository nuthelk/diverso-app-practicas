import { View } from 'react-native';

import { Card, Skeleton } from '@/ui/components';
import { AppInsets } from '@/ui/theme';

import { Grid } from './Grid';
import { PLAN_COVER_HEIGHT } from './PlanCard';

/** Marcador con la forma de una `PlanCard` mientras carga el catálogo. */
export function PlanCardSkeleton() {
  return (
    <Card testID="tarjeta-skeleton">
      <Skeleton height={PLAN_COVER_HEIGHT} radius={0} />
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
export function ResultsSkeleton({ isGrid, usableWidth }: { isGrid: boolean; usableWidth: number }) {
  const n = isGrid ? 4 : 3;
  const items = Array.from({ length: n }, (_, i) => i);
  return (
    <View style={AppInsets.roomyList}>
      {isGrid ? (
        <Grid items={items} usableWidth={usableWidth} keyOf={(i) => String(i)} render={() => <PlanCardSkeleton />} />
      ) : (
        items.map((i) => (
          <View key={i} style={AppInsets.betweenCards}>
            <PlanCardSkeleton />
          </View>
        ))
      )}
    </View>
  );
}
