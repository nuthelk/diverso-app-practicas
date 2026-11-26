import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, Icon, Text, type IconName } from '@/ui/components';
import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

/** Datos de prueba del sandbox de Wompi (docs.wompi.co): con ellos se simula cada desenlace. */
export const wompiTestData = [
  'Tarjeta: 4242 4242 4242 4242 → aprobada · 4111 1111 1111 1111 → rechazada ' +
    '(fecha futura y CVC de 3 dígitos cualquiera)',
  'Nequi: 3991111111 → aprobado · 3992222222 → rechazado',
  'PSE: banco 1 → aprobado · banco 2 → rechazado',
  'Daviplata: código (OTP) 574829 → aprobado · 932015 → rechazado',
  'Bancolombia: el estado final se elige en la pantalla de prueba de Wompi',
] as const;

const paymentMethods: readonly [IconName, string][] = [
  ['credit_card_rounded', 'Tarjeta'],
  ['account_balance_rounded', 'PSE'],
  ['smartphone_rounded', 'Nequi'],
  ['phone_iphone_rounded', 'Daviplata'],
  ['account_balance_wallet_rounded', 'Bancolombia'],
];

/**
 * Pago con Wompi: el medio se elige en la página de Wompi; aquí solo se informa cuáles acepta y que
 * es un entorno de prueba (con los datos de prueba en un `ExpansionTile`).
 */
export function WompiPaymentCard() {
  const cs = useTheme().colorScheme;
  return (
    <View>
      <View
        style={[
          AppInsets.wideCard,
          styles.card,
          { backgroundColor: cs.primaryContainer, borderColor: cs.primary },
        ]}
      >
        <View style={styles.row}>
          <Icon name="lock_rounded" size={20} color={cs.primary} />
          <View style={{ width: 10 }} />
          <Text style={[styles.flexible, { fontSize: AppText.largeEmphasis, fontWeight: '700', color: cs.onPrimaryContainer }]}>
            Pagar con Wompi
          </Text>
        </View>
        <View style={{ height: 8 }} />
        <Text height={1.35} style={{ fontSize: AppText.largeCaption, color: cs.onPrimaryContainer }}>
          Eliges el medio en la página segura de Wompi; nosotros nunca vemos los datos de tu tarjeta o cuenta. Medios aceptados:
        </Text>
        <View style={{ height: 10 }} />
        <View style={styles.chips}>
          {paymentMethods.map(([icon, name]) => (
            <Chip
              key={name}
              label={name}
              icon={icon}
              iconSize={16}
              iconColor={cs.primary}
              labelStyle={{ fontSize: AppText.caption }}
              dense
            />
          ))}
        </View>
      </View>
      <View style={{ height: 10 }} />
      <TestData />
      <View style={{ height: 8 }} />
      <View style={[styles.row, { paddingLeft: 4 }]}>
        <Icon name="shield_outlined" size={14} color={cs.tertiary} />
        <View style={{ width: 6 }} />
        <Text style={[styles.flexible, { fontSize: AppText.caption, color: cs.onSurfaceVariant }]}>
          Retenemos tus cupos 30 minutos mientras pagas. Reembolso según la política de cancelación.
        </Text>
      </View>
    </View>
  );
}

/**
 * `ExpansionTile` sin divisores sobre tertiaryContainer al 55 %: «Modo de prueba» y, al tocar, las
 * viñetas de [wompiTestData]. La flecha (`expand_more`) gira media vuelta al abrir.
 */
function TestData() {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.expansion, { backgroundColor: withAlpha(cs.tertiaryContainer, 0.55) }]}>
      <Pressable
        onPress={() => setOpen((a) => !a)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        {({ pressed }) => (
          <>
            {pressed ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(cs.onSurface, theme.components.pressedOpacity) }]}
              />
            ) : null}
            <Icon name="science_outlined" color={cs.onTertiaryContainer} />
            <View style={{ width: 16 }} />
            <View style={styles.flexible}>
              <Text style={{ fontSize: AppText.smallBody, fontWeight: '700', color: cs.onTertiaryContainer }}>
                Modo de prueba — no se cobra dinero real
              </Text>
              <Text style={{ fontSize: AppText.label, color: cs.onTertiaryContainer }}>Toca para ver los datos de prueba</Text>
            </View>
            <View style={{ width: 16 }} />
            {/* `expand_more` = chevron a la derecha girado un cuarto de vuelta; abierto, tres cuartos. */}
            <View style={{ transform: [{ rotate: open ? '270deg' : '90deg' }] }}>
              <Icon name="chevron_right_rounded" color={open ? cs.primary : cs.onSurfaceVariant} />
            </View>
          </>
        )}
      </Pressable>
      {open ? (
        <View style={styles.data}>
          {wompiTestData.map((item) => (
            <Text key={item} height={1.35} style={{ fontSize: AppText.caption, color: cs.onTertiaryContainer, marginBottom: 6 }}>
              {`• ${item}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: AppRadii.card, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flexible: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 6 },
  expansion: { borderRadius: AppRadii.card, overflow: 'hidden' },
  // ListTile de dos líneas (M3): alto mínimo 72, 16 a los lados.
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: 16, paddingVertical: 8 },
  data: { paddingLeft: 16, paddingRight: 16, paddingBottom: 14 },
});
