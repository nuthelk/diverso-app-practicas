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

import { withAlpha, useTheme } from '@/ui/theme';

import { Icon, type IconName } from '../Icon';
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
  const theme = useTheme();
  const background = { backgroundColor: color ?? theme.components.card.backgroundColor, borderRadius: theme.components.card.radius };
  if (!onPress) {
    return (
      <View testID={testID} style={[styles.card, background, style]}>
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
      style={[styles.card, background, style]}
    >
      {({ pressed }) => (
        <>
          {children}
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(theme.colorScheme.onSurface, theme.components.pressedOpacity) }]}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/** `Divider` del tema: 1 px de outlineVariant al 50 % (`space: 1`). */
export function Divider({ color, style, testID = 'divider' }: { color?: string; style?: StyleProp<ViewStyle>; testID?: string }) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={[{ height: theme.components.divider.height, backgroundColor: color ?? theme.components.divider.color }, style]}
    />
  );
}

export interface ChipProps {
  label: ReactNode;
  /** `avatar` (ícono a la izquierda). */
  icon?: IconName;
  iconSize?: number;
  iconColor?: string;
  /** `onDeleted`: muestra la ✕ (`Icons.clear` 18, onSurfaceVariant). */
  onDelete?: () => void;
  /** Etiqueta accesible del botón de borrar. */
  deleteLabel?: string;
  /** Estilo propio de la etiqueta (p.ej. `{ fontSize: 12 }`). */
  labelStyle?: StyleProp<TextStyle>;
  /** `VisualDensity.compact`: 8 menos de alto. */
  dense?: boolean;
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
  label,
  icon,
  iconSize = 18,
  iconColor,
  onDelete,
  deleteLabel = 'Eliminar',
  labelStyle,
  dense = false,
  color,
  style,
  testID,
}: ChipProps) {
  const theme = useTheme();
  const chip = theme.components.chip;
  return (
    <View
      testID={testID ?? (onDelete ? 'input-chip' : 'chip')}
      style={[
        styles.chip,
        { backgroundColor: color ?? chip.backgroundColor, height: dense ? 24 : 32 },
        style,
      ]}
    >
      {icon ? (
        <View style={styles.box16}>
          <Icon name={icon} size={iconSize} color={iconColor ?? chip.avatarColor} />
        </View>
      ) : null}
      <DefaultTextStyle style={{ ...chip.label, height: null, letterSpacing: 0 }}>
        {typeof label === 'string' ? (
          <Text numberOfLines={1} style={labelStyle}>
            {label}
          </Text>
        ) : (
          label
        )}
      </DefaultTextStyle>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          hitSlop={{ top: 16, bottom: 16, left: 4, right: 8 }}
          style={styles.box16}
        >
          <Icon name="clear" size={18} color={chip.deleteIconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Chip de filtro con ✕ (el `InputChip` de Material 3): la misma píldora transparente con borde de
 * 1 px `outlineVariant`. Sin borde, «Jericó ✕» o «Hasta $ 450.000 ✕» se leían como texto suelto.
 */
export function InputChip({ style, ...props }: ChipProps) {
  const cs = useTheme().colorScheme;
  return <Chip {...props} style={[{ borderWidth: 1, borderColor: cs.outlineVariant }, style]} />;
}

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

/**
 * `SegmentedButton` (una sola selección) con el tema: píldora, borde outline 1, alto 40 (48
 * táctil); el seleccionado en secondaryContainer con ✓ 18; texto 13.5 w600.
 */
export function SegmentedButton<T extends string>({
  segments,
  selected,
  onChange,
  showSelectedIcon = true,
  style,
  testID = 'segmented-button',
}: {
  segments: Segment<T>[];
  selected: T;
  onChange: (value: T) => void;
  /** `showSelectedIcon` de Flutter: el ✓ del segmento elegido (la lista de agencias no lo usa). */
  showSelectedIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View testID={testID} style={[styles.segmented, { borderColor: cs.outline }, style]}>
      {segments.map((s, i) => {
        const active = s.value === selected;
        const contentColor = active ? cs.onSecondaryContainer : cs.onSurface;
        const icon = active && showSelectedIcon ? 'check_rounded' : s.icon;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            accessibilityRole="button"
            accessibilityLabel={s.label}
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[
              styles.segment,
              {
                backgroundColor: active ? cs.secondaryContainer : 'transparent',
                borderLeftWidth: i === 0 ? 0 : 1,
                borderColor: cs.outline,
              },
            ]}
          >
            {icon ? <Icon name={icon} size={18} color={contentColor} /> : null}
            <DefaultTextStyle style={{ fontSize: 13.5, fontWeight: '600', color: contentColor, height: null, letterSpacing: 0 }}>
              <Text numberOfLines={1}>{s.label}</Text>
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

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  chip: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    gap: 8,
  },
  box16: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    minHeight: 40,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
});
