import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, Icono, Text, type IconoNombre } from '@/ui/components';
import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

/** Datos de prueba del sandbox de Wompi (docs.wompi.co): con ellos se simula cada desenlace. */
export const datosPruebaWompi = [
  'Tarjeta: 4242 4242 4242 4242 → aprobada · 4111 1111 1111 1111 → rechazada ' +
    '(fecha futura y CVC de 3 dígitos cualquiera)',
  'Nequi: 3991111111 → aprobado · 3992222222 → rechazado',
  'PSE: banco 1 → aprobado · banco 2 → rechazado',
  'Daviplata: código (OTP) 574829 → aprobado · 932015 → rechazado',
  'Bancolombia: el estado final se elige en la pantalla de prueba de Wompi',
] as const;

const medios: readonly [IconoNombre, string][] = [
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
export function PagoWompiCard() {
  const cs = useTheme().colorScheme;
  return (
    <View>
      <View
        style={[
          AppInsets.wideCard,
          estilos.tarjeta,
          { backgroundColor: cs.primaryContainer, borderColor: cs.primary },
        ]}
      >
        <View style={estilos.fila}>
          <Icono nombre="lock_rounded" size={20} color={cs.primary} />
          <View style={{ width: 10 }} />
          <Text style={[estilos.flexible, { fontSize: AppText.largeEmphasis, fontWeight: '700', color: cs.onPrimaryContainer }]}>
            Pagar con Wompi
          </Text>
        </View>
        <View style={{ height: 8 }} />
        <Text altura={1.35} style={{ fontSize: AppText.largeCaption, color: cs.onPrimaryContainer }}>
          Eliges el medio en la página segura de Wompi; nosotros nunca vemos los datos de tu tarjeta o cuenta. Medios aceptados:
        </Text>
        <View style={{ height: 10 }} />
        <View style={estilos.chips}>
          {medios.map(([icono, nombre]) => (
            <Chip
              key={nombre}
              etiqueta={nombre}
              icono={icono}
              tamanoIcono={16}
              colorIcono={cs.primary}
              estiloEtiqueta={{ fontSize: AppText.caption }}
              denso
            />
          ))}
        </View>
      </View>
      <View style={{ height: 10 }} />
      <DatosDePrueba />
      <View style={{ height: 8 }} />
      <View style={[estilos.fila, { paddingLeft: 4 }]}>
        <Icono nombre="shield_outlined" size={14} color={cs.tertiary} />
        <View style={{ width: 6 }} />
        <Text style={[estilos.flexible, { fontSize: AppText.caption, color: cs.onSurfaceVariant }]}>
          Retenemos tus cupos 30 minutos mientras pagas. Reembolso según la política de cancelación.
        </Text>
      </View>
    </View>
  );
}

/**
 * `ExpansionTile` sin divisores sobre tertiaryContainer al 55 %: «Modo de prueba» y, al tocar, las
 * viñetas de [datosPruebaWompi]. La flecha (`expand_more`) gira media vuelta al abrir.
 */
function DatosDePrueba() {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const [abierto, setAbierto] = useState(false);
  return (
    <View style={[estilos.expansion, { backgroundColor: withAlpha(cs.tertiaryContainer, 0.55) }]}>
      <Pressable
        onPress={() => setAbierto((a) => !a)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        style={estilos.cabecera}
      >
        {({ pressed }) => (
          <>
            {pressed ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(cs.onSurface, tema.components.pressedOpacity) }]}
              />
            ) : null}
            <Icono nombre="science_outlined" color={cs.onTertiaryContainer} />
            <View style={{ width: 16 }} />
            <View style={estilos.flexible}>
              <Text style={{ fontSize: AppText.smallBody, fontWeight: '700', color: cs.onTertiaryContainer }}>
                Modo de prueba — no se cobra dinero real
              </Text>
              <Text style={{ fontSize: AppText.label, color: cs.onTertiaryContainer }}>Toca para ver los datos de prueba</Text>
            </View>
            <View style={{ width: 16 }} />
            {/* `expand_more` = chevron a la derecha girado un cuarto de vuelta; abierto, tres cuartos. */}
            <View style={{ transform: [{ rotate: abierto ? '270deg' : '90deg' }] }}>
              <Icono nombre="chevron_right_rounded" color={abierto ? cs.primary : cs.onSurfaceVariant} />
            </View>
          </>
        )}
      </Pressable>
      {abierto ? (
        <View style={estilos.datos}>
          {datosPruebaWompi.map((dato) => (
            <Text key={dato} altura={1.35} style={{ fontSize: AppText.caption, color: cs.onTertiaryContainer, marginBottom: 6 }}>
              {`• ${dato}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: AppRadii.card, borderWidth: 1.5 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  flexible: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 6 },
  expansion: { borderRadius: AppRadii.card, overflow: 'hidden' },
  // ListTile de dos líneas (M3): alto mínimo 72, 16 a los lados.
  cabecera: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: 16, paddingVertical: 8 },
  datos: { paddingLeft: 16, paddingRight: 16, paddingBottom: 14 },
});
