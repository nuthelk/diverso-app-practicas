import { ScrollView, View } from 'react-native';

import { Skeleton } from '@/ui/components';
import { AppInsets } from '@/ui/theme';

/** Tarjetas de relleno mientras carga «Mis reservas» (3 × 108, radio 20, separadas 12). */
export function ReservasSkeleton() {
  return (
    <ScrollView contentContainerStyle={AppInsets.content} scrollEnabled={false}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ paddingBottom: 12 }}>
          <Skeleton height={108} radius={20} />
        </View>
      ))}
    </ScrollView>
  );
}
