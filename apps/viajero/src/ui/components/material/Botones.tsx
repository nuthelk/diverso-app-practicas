import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type Insets,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { withAlpha, useTheme, type FontWeight } from '@/ui/theme';

import { Icon, type IconName } from '../Icon';
import { DefaultTextStyle, Text } from '../Text';

/**
 * Botones de Material 3 con el tema de la app (§3.7). Medidas resueltas con `flutter test`:
 * - Filled/tonal: alto 52, píldora, padding 24 (con ícono 16 | ícono 18 | 8 | texto | 24),
 *   texto 15 w700 ls -0.2 con altura NATURAL (el textStyle del botón reemplaza al bodyMedium).
 * - Outlined: alto 48, borde 1 outlineVariant, mismo padding, texto 14.5 w600 sin ls.
 * - Text: 40 visibles + 4 arriba/abajo táctiles (48), padding 12 (con ícono 12 | 18 | 8 | 16),
 *   texto 14 w600.
 * Igual que `onPressed: null` en Flutter, sin `onPress` el botón queda deshabilitado
 * (fondo onSurface 12 %, contenido onSurface 38 %).
 *
 * Ancho: como un View de RN (se estira en una columna). Para el ancho intrínseco de Flutter
 * usar `style={{ alignSelf: 'center' | 'flex-start' }}`.
 */
export interface ButtonProps {
  onPress?: (() => void) | null;
  /** Texto del botón (atajo de `children`). */
  text?: string;
  children?: ReactNode;
  icon?: IconName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onLongPress?: PressableProps['onLongPress'];
}

interface Appearance {
  background: string;
  content: string;
  border?: string;
  minHeight: number;
  padding: number;
  paddingWithIcon: [number, number];
  text: { fontSize: number; fontWeight: FontWeight; letterSpacing: number };
  hitSlop?: Insets;
}

function ButtonBase({
  onPress,
  text,
  children,
  icon,
  accessibilityLabel,
  style,
  testID,
  onLongPress,
  appearance,
}: ButtonProps & { appearance: Appearance }) {
  const theme = useTheme();
  const enabled = typeof onPress === 'function';
  const a = appearance;
  const content = a.content;
  const paddingStyle: ViewStyle = icon
    ? { paddingLeft: a.paddingWithIcon[0], paddingRight: a.paddingWithIcon[1] }
    : { paddingHorizontal: a.padding };
  return (
    <Pressable
      testID={testID}
      onPress={enabled ? onPress : undefined}
      onLongPress={onLongPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={a.hitSlop}
      style={[
        styles.button,
        {
          minHeight: a.minHeight,
          backgroundColor: a.background,
          ...(a.border ? { borderColor: a.border, borderWidth: 1 } : null),
        },
        paddingStyle,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(content, theme.components.pressedOpacity) }]}
            />
          ) : null}
          {icon ? <Icon name={icon} size={18} color={content} /> : null}
          <DefaultTextStyle style={{ ...a.text, color: content, height: null }}>
            {text !== undefined ? <Text style={styles.centered}>{text}</Text> : children}
          </DefaultTextStyle>
        </>
      )}
    </Pressable>
  );
}

/** Contenido deshabilitado (onSurface 38 %). */
const disabledColor = (onSurface: string) => withAlpha(onSurface, 0.38);

export function FilledButton({
  variant = 'filled',
  testID = 'filled-button',
  ...props
}: ButtonProps & { variant?: 'filled' | 'tonal' }) {
  const cs = useTheme().colorScheme;
  const enabled = typeof props.onPress === 'function';
  const isTonal = variant === 'tonal';
  return (
    <ButtonBase
      {...props}
      testID={testID}
      appearance={{
        background: enabled ? (isTonal ? cs.secondaryContainer : cs.primary) : withAlpha(cs.onSurface, 0.12),
        content: enabled ? (isTonal ? cs.onSecondaryContainer : cs.onPrimary) : disabledColor(cs.onSurface),
        minHeight: 52,
        padding: 24,
        paddingWithIcon: [16, 24],
        text: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
      }}
    />
  );
}

export function OutlinedButton({ testID = 'outlined-button', ...props }: ButtonProps) {
  const cs = useTheme().colorScheme;
  const enabled = typeof props.onPress === 'function';
  return (
    <ButtonBase
      {...props}
      testID={testID}
      appearance={{
        background: 'transparent',
        content: enabled ? cs.primary : disabledColor(cs.onSurface),
        border: enabled ? cs.outlineVariant : withAlpha(cs.onSurface, 0.12),
        minHeight: 48,
        padding: 24,
        paddingWithIcon: [16, 24],
        text: { fontSize: 14.5, fontWeight: '600', letterSpacing: 0 },
      }}
    />
  );
}

export function TextButton({ testID = 'text-button', ...props }: ButtonProps) {
  const cs = useTheme().colorScheme;
  const enabled = typeof props.onPress === 'function';
  return (
    <ButtonBase
      {...props}
      testID={testID}
      appearance={{
        background: 'transparent',
        content: enabled ? cs.primary : disabledColor(cs.onSurface),
        minHeight: 40,
        padding: 12,
        paddingWithIcon: [12, 16],
        text: { fontSize: 14, fontWeight: '600', letterSpacing: 0 },
        hitSlop: { top: 4, bottom: 4 },
      }}
    />
  );
}

export interface IconButtonProps {
  icon: IconName;
  /** Texto del tooltip de Flutter: es la etiqueta accesible (lo que verifican los tests). */
  tooltip: string;
  onPress?: (() => void) | null;
  variant?: 'standard' | 'filled' | 'filledTonal' | 'outlined';
  iconSize?: number;
  backgroundColor?: string;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** `IconButton` M3: 40 visibles (48 táctiles), ícono 24. */
export function IconButton({
  icon,
  tooltip,
  onPress,
  variant = 'standard',
  iconSize = 24,
  backgroundColor,
  iconColor,
  style,
  testID = 'icon-button',
}: IconButtonProps) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const enabled = typeof onPress === 'function';
  const isFilled = variant === 'filled' || variant === 'filledTonal';
  const defaultBackground = !isFilled
    ? 'transparent'
    : !enabled
      ? withAlpha(cs.onSurface, 0.12)
      : variant === 'filled'
        ? cs.primary
        : cs.secondaryContainer;
  const defaultIconColor = !enabled
    ? disabledColor(cs.onSurface)
    : variant === 'filled'
      ? cs.onPrimary
      : variant === 'filledTonal'
        ? cs.onSecondaryContainer
        : cs.onSurfaceVariant;
  const color = iconColor ?? defaultIconColor;
  return (
    <Pressable
      testID={testID}
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={tooltip}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={4}
      style={[
        styles.iconButton,
        { backgroundColor: backgroundColor ?? defaultBackground },
        variant === 'outlined'
          ? { borderWidth: 1, borderColor: enabled ? cs.outline : withAlpha(cs.onSurface, 0.12) }
          : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, theme.components.pressedOpacity) }]}
            />
          ) : null}
          <Icon name={icon} size={iconSize} color={color} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  centered: { textAlign: 'center' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
