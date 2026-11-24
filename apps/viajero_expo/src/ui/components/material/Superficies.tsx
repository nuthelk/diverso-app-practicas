import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { conAlfa, useTheme } from '@/ui/theme';

import { Icono, type IconoNombre } from '../Icono';
import { DefaultTextStyle, Text } from '../Text';

/** `Card` del tema: elevación 0, margen 0, radio 20; color por instancia (surfaceContainerLow). */
export function Card({
  children,
  color,
  onPress,
  accessibilityLabel,
  style,
  testID = 'card',
}: {
  children?: ReactNode;
  color?: string;
  /** Con `onPress` se comporta como el `InkWell` de dentro de la tarjeta. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const tema = useTheme();
  const fondo = { backgroundColor: color ?? tema.componentes.card.backgroundColor, borderRadius: tema.componentes.card.radio };
  if (!onPress) {
    return (
      <View testID={testID} style={[estilos.card, fondo, style]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[estilos.card, fondo, style]}
    >
      {({ pressed }) => (
        <>
          {children}
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: conAlfa(tema.colorScheme.onSurface, tema.componentes.opacidadPresionado) }]}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/** `Divider` del tema: 1 px de outlineVariant al 50 % (`space: 1`). */
export function Divider({ color, style, testID = 'divider' }: { color?: string; style?: StyleProp<ViewStyle>; testID?: string }) {
  const tema = useTheme();
  return (
    <View
      testID={testID}
      style={[{ height: tema.componentes.divider.height, backgroundColor: color ?? tema.componentes.divider.color }, style]}
    />
  );
}

export interface ChipProps {
  etiqueta: ReactNode;
  /** `avatar` (ícono a la izquierda). */
  icono?: IconoNombre;
  tamanoIcono?: number;
  colorIcono?: string;
  /** `onDeleted`: muestra la ✕ (`Icons.clear` 18, onSurfaceVariant). */
  onBorrar?: () => void;
  /** Etiqueta accesible del botón de borrar. */
  etiquetaBorrar?: string;
  /** Estilo propio de la etiqueta (p.ej. `{ fontSize: 12 }`). */
  estiloEtiqueta?: StyleProp<TextStyle>;
  /** `VisualDensity.compact`: 8 menos de alto. */
  denso?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * `InputChip`/`Chip` con el `chipTheme` (medido): píldora SIN fondo ni borde, alto 32 (48
 * táctil), relleno 8 | avatar 16 | 8 | etiqueta 13 w600 onSurface (altura natural, sin ls) | 8 |
 * ✕ 16 | 8.
 */
export function Chip({
  etiqueta,
  icono,
  tamanoIcono = 18,
  colorIcono,
  onBorrar,
  etiquetaBorrar = 'Eliminar',
  estiloEtiqueta,
  denso = false,
  color,
  style,
  testID,
}: ChipProps) {
  const tema = useTheme();
  const chip = tema.componentes.chip;
  return (
    <View
      testID={testID ?? (onBorrar ? 'input-chip' : 'chip')}
      style={[
        estilos.chip,
        { backgroundColor: color ?? chip.backgroundColor, height: denso ? 24 : 32 },
        style,
      ]}
    >
      {icono ? (
        <View style={estilos.caja16}>
          <Icono nombre={icono} size={tamanoIcono} color={colorIcono ?? chip.avatarColor} />
        </View>
      ) : null}
      <DefaultTextStyle estilo={{ ...chip.label, altura: null, letterSpacing: 0 }}>
        {typeof etiqueta === 'string' ? (
          <Text numberOfLines={1} style={estiloEtiqueta}>
            {etiqueta}
          </Text>
        ) : (
          etiqueta
        )}
      </DefaultTextStyle>
      {onBorrar ? (
        <Pressable
          onPress={onBorrar}
          accessibilityRole="button"
          accessibilityLabel={etiquetaBorrar}
          hitSlop={{ top: 16, bottom: 16, left: 4, right: 8 }}
          style={estilos.caja16}
        >
          <Icono nombre="clear" size={18} color={chip.deleteIconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Alias con el nombre de Flutter para los chips de filtro con ✕. */
export const InputChip = Chip;

export interface Segmento<T extends string> {
  valor: T;
  etiqueta: string;
  icono?: IconoNombre;
}

/**
 * `SegmentedButton` (una sola selección) con el tema: píldora, borde outline 1, alto 40 (48
 * táctil); el seleccionado en secondaryContainer con ✓ 18; texto 13.5 w600.
 */
export function SegmentedButton<T extends string>({
  segmentos,
  seleccionado,
  onCambio,
  style,
  testID = 'segmented-button',
}: {
  segmentos: Segmento<T>[];
  seleccionado: T;
  onCambio: (valor: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View testID={testID} style={[estilos.segmentado, { borderColor: cs.outline }, style]}>
      {segmentos.map((s, i) => {
        const activo = s.valor === seleccionado;
        const colorContenido = activo ? cs.onSecondaryContainer : cs.onSurface;
        const icono = activo ? 'check_rounded' : s.icono;
        return (
          <Pressable
            key={s.valor}
            onPress={() => onCambio(s.valor)}
            accessibilityRole="button"
            accessibilityLabel={s.etiqueta}
            accessibilityState={{ selected: activo }}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[
              estilos.segmento,
              {
                backgroundColor: activo ? cs.secondaryContainer : 'transparent',
                borderLeftWidth: i === 0 ? 0 : 1,
                borderColor: cs.outline,
              },
            ]}
          >
            {icono ? <Icono nombre={icono} size={18} color={colorContenido} /> : null}
            <DefaultTextStyle estilo={{ fontSize: 13.5, fontWeight: '600', color: colorContenido, altura: null, letterSpacing: 0 }}>
              <Text numberOfLines={1}>{s.etiqueta}</Text>
            </DefaultTextStyle>
          </Pressable>
        );
      })}
    </View>
  );
}

/** `CircularProgressIndicator` (36, primary). */
export function CircularProgressIndicator({ color, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  const cs = useTheme().colorScheme;
  return <ActivityIndicator size="large" color={color ?? cs.primary} style={style} />;
}

const estilos = StyleSheet.create({
  card: { overflow: 'hidden' },
  chip: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    gap: 8,
  },
  caja16: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  segmentado: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    minHeight: 40,
  },
  segmento: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
});
