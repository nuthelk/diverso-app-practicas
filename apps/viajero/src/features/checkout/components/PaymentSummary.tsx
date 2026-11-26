import { StyleSheet, View } from 'react-native';

import { formatCOP } from '@/core';
import { Divider, Icon, SectionLabel, Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/** «Resumen» del checkout: precio por persona, personas y total a pagar. */
export function PaymentSummary({ pricePerPerson, pax, total }: { pricePerPerson: number; pax: number; total: number }) {
  const cs = useTheme().colorScheme;
  return (
    <View>
      <SectionLabel text="Resumen" />
      <View style={[AppInsets.wideCard, styles.box, { backgroundColor: cs.surfaceContainerLow }]}>
        <PaymentLine label="Precio por persona" value={formatCOP(pricePerPerson)} />
        <PaymentLine label="Personas" value={String(pax)} />
        <View style={{ paddingVertical: 8 }}>
          <Divider />
        </View>
        <View style={styles.spaceBetween}>
          <Text style={{ fontWeight: '700', fontSize: AppText.emphasis }}>Total a pagar</Text>
          <Text style={{ fontSize: AppText.headingXs, fontWeight: '800', letterSpacing: -0.4, color: cs.primary }}>
            {formatCOP(total)}
          </Text>
        </View>
        <View style={{ height: 6 }} />
        <View style={styles.row}>
          <Icon name="lock_outline_rounded" size={12} color={cs.outline} />
          <View style={{ width: 5 }} />
          <Text style={{ fontSize: AppText.label, color: cs.outline }}>Precio final, sin cargos ocultos</Text>
        </View>
      </View>
    </View>
  );
}

function PaymentLine({ label, value }: { label: string; value: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[styles.spaceBetween, { paddingVertical: 3 }]}>
      <Text style={{ fontSize: AppText.smallBody, color: cs.onSurfaceVariant }}>{label}</Text>
      <Text style={{ fontWeight: '600', fontSize: AppText.smallBody }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: AppRadii.card },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
