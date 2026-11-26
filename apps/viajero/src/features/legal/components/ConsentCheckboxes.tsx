import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppRoutes } from '@/router';
import { Icon, Text } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

/** Área táctil de la casilla (M3: 48): el texto de cada fila, y el aviso, empiezan después. */
const CHECKBOX_TOUCH_AREA = 48;

/**
 * Casilla de M3 (`Checkbox`): caja 18 × 18, borde 2 y radio 2 en un área táctil de 48; marcada,
 * rellena de primary con ✓ onPrimary; con `isError`, en color error. Solo dibuja: el toque lo
 * maneja la fila entera.
 */
function Checkbox({ value, error }: { value: boolean; error: boolean }) {
  const cs = useTheme().colorScheme;
  const color = error ? cs.error : value ? cs.primary : cs.onSurfaceVariant;
  return (
    <View style={styles.checkboxArea}>
      <View
        testID="checkbox"
        style={[
          styles.box,
          { borderColor: color, backgroundColor: value ? (error ? cs.error : cs.primary) : 'transparent' },
        ]}
      >
        {value ? <Icon name="check_rounded" size={16} color={error ? cs.onError : cs.onPrimary} /> : null}
      </View>
    </View>
  );
}

/** Una fila: casilla + texto tocable; para lectores de pantalla es UNA casilla (`MergeSemantics`). */
function CheckboxRow({
  value,
  onChanged,
  error,
  label,
  children,
}: {
  value: boolean;
  onChanged: (value: boolean) => void;
  error: boolean;
  label: string;
  children: ReactNode;
}) {
  const cs = useTheme().colorScheme;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChanged(!value)}
      style={styles.row}
    >
      <Checkbox value={value} error={error} />
      <View style={styles.text}>
        <Text height={1.45} style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant }}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Casillas de autorización expresa (Ley 1581 de 2012), compartidas por el registro y la
 * pantalla de consentimiento. Nunca vienen marcadas: el titular debe aceptarlas de forma activa.
 * Los enlaces abren el documento sin alternar la casilla.
 */
export function ConsentCheckboxes({
  acceptsDataPolicy,
  acceptsTerms,
  onDataPolicyChange,
  onTermsChange,
  showError = false,
}: {
  acceptsDataPolicy: boolean;
  acceptsTerms: boolean;
  onDataPolicyChange: (value: boolean) => void;
  onTermsChange: (value: boolean) => void;
  /** Resalta las casillas pendientes tras un intento de envío. */
  showError?: boolean;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();

  const link = (text: string, route: string) => (
    <Text
      accessibilityRole="link"
      onPress={() => router.push(route as Href)}
      style={{
        color: cs.primary,
        fontWeight: '700',
        textDecorationLine: 'underline',
        textDecorationColor: withAlpha(cs.primary, 0.5),
      }}
    >
      {text}
    </Text>
  );

  return (
    <View>
      <CheckboxRow
        value={acceptsDataPolicy}
        onChanged={onDataPolicyChange}
        error={showError && !acceptsDataPolicy}
        label="Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la política de tratamiento de datos (Ley 1581 de 2012)."
      >
        Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la{' '}
        {link('política de tratamiento de datos', AppRoutes.legal('privacidad'))} (Ley 1581 de 2012).
      </CheckboxRow>
      <View style={{ height: 4 }} />
      <CheckboxRow
        value={acceptsTerms}
        onChanged={onTermsChange}
        error={showError && !acceptsTerms}
        label="Acepto los términos y condiciones."
      >
        Acepto los {link('términos y condiciones', AppRoutes.legal('terminos-viajeros'))}.
      </CheckboxRow>
      {showError && (!acceptsDataPolicy || !acceptsTerms) ? (
        <Text style={[styles.errorText, { fontSize: AppText.largeCaption, color: cs.error }]}>
          Debes aceptar ambos documentos para crear tu cuenta.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  checkboxArea: { width: CHECKBOX_TOUCH_AREA, height: CHECKBOX_TOUCH_AREA, alignItems: 'center', justifyContent: 'center' },
  box: { width: 18, height: 18, borderRadius: 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, paddingTop: 12 },
  // Alineado con el texto de las casillas, no con la casilla.
  errorText: { paddingLeft: CHECKBOX_TOUCH_AREA, paddingTop: 4 },
});
