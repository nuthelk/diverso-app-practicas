import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppInsets, AppText, withAlpha, monospaceFamily, useTheme } from '@/ui/theme';

import { Icono, type IconoNombre } from '../Icono';
import { Text } from '../Text';

/**
 * Estado vacío, de error o 404: ícono en un círculo, título, mensaje, causa técnica opcional
 * (monospace, para soporte) y acción opcional.
 */
export function EmptyState({
  icono,
  titulo,
  mensaje,
  detalle,
  accion,
}: {
  icono: IconoNombre;
  titulo: string;
  mensaje: string;
  /** Causa técnica (excepción cruda) en pequeño. */
  detalle?: string | null;
  accion?: ReactNode;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View style={estilos.centro}>
      <View style={estilos.columna}>
        <View testID="empty-state-icono" style={[estilos.circulo, AppInsets.largeCard, { backgroundColor: cs.surfaceContainerHigh }]}>
          <Icono nombre={icono} size={30} color={cs.onSurfaceVariant} />
        </View>
        <View style={{ height: 16 }} />
        {/* Sin color propio: hereda el del texto por defecto, como en Flutter. */}
        <Text style={{ fontSize: AppText.largeSubtitle, fontWeight: '700', letterSpacing: -0.3 }}>{titulo}</Text>
        <View style={{ height: 5 }} />
        <Text
          altura={1.45}
          style={[estilos.mensaje, { fontSize: AppText.smallBody, color: cs.onSurfaceVariant }]}
        >
          {mensaje}
        </Text>
        {detalle != null ? (
          <>
            <View style={{ height: 8 }} />
            <Text
              testID="empty-state-detalle"
              altura={1.35}
              style={[
                estilos.detalle,
                {
                  fontSize: AppText.note,
                  fontFamily: Platform.OS === 'ios' ? monospaceFamily.ios : monospaceFamily.others,
                  color: withAlpha(cs.onSurfaceVariant, 0.75),
                },
              ]}
            >
              {detalle}
            </Text>
          </>
        ) : null}
        {accion ? (
          <>
            <View style={{ height: 18 }} />
            {accion}
          </>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  columna: { padding: 36, alignItems: 'center' },
  circulo: { borderRadius: 999 },
  mensaje: { maxWidth: 300, textAlign: 'center' },
  detalle: { maxWidth: 340, textAlign: 'center' },
});
