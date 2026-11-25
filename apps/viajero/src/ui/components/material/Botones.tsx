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
export interface BotonProps {
  onPress?: (() => void) | null;
  /** Texto del botón (atajo de `children`). */
  texto?: string;
  children?: ReactNode;
  icono?: IconName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  onLongPress?: PressableProps['onLongPress'];
}

interface Apariencia {
  fondo: string;
  contenido: string;
  borde?: string;
  minHeight: number;
  padding: number;
  paddingConIcono: [number, number];
  texto: { fontSize: number; fontWeight: FontWeight; letterSpacing: number };
  hitSlop?: Insets;
}

function BotonBase({
  onPress,
  texto,
  children,
  icono,
  accessibilityLabel,
  style,
  testID,
  onLongPress,
  apariencia,
}: BotonProps & { apariencia: Apariencia }) {
  const tema = useTheme();
  const habilitado = typeof onPress === 'function';
  const a = apariencia;
  const contenido = a.contenido;
  const relleno: ViewStyle = icono
    ? { paddingLeft: a.paddingConIcono[0], paddingRight: a.paddingConIcono[1] }
    : { paddingHorizontal: a.padding };
  return (
    <Pressable
      testID={testID}
      onPress={habilitado ? onPress : undefined}
      onLongPress={onLongPress}
      disabled={!habilitado}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? texto}
      accessibilityState={{ disabled: !habilitado }}
      hitSlop={a.hitSlop}
      style={[
        estilos.boton,
        {
          minHeight: a.minHeight,
          backgroundColor: a.fondo,
          ...(a.borde ? { borderColor: a.borde, borderWidth: 1 } : null),
        },
        relleno,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(contenido, tema.components.pressedOpacity) }]}
            />
          ) : null}
          {icono ? <Icon name={icono} size={18} color={contenido} /> : null}
          <DefaultTextStyle style={{ ...a.texto, color: contenido, height: null }}>
            {texto !== undefined ? <Text style={estilos.centrado}>{texto}</Text> : children}
          </DefaultTextStyle>
        </>
      )}
    </Pressable>
  );
}

/** Contenido deshabilitado (onSurface 38 %). */
const deshabilitado = (onSurface: string) => withAlpha(onSurface, 0.38);

export function FilledButton({
  variante = 'filled',
  testID = 'filled-button',
  ...props
}: BotonProps & { variante?: 'filled' | 'tonal' }) {
  const cs = useTheme().colorScheme;
  const habilitado = typeof props.onPress === 'function';
  const tonal = variante === 'tonal';
  return (
    <BotonBase
      {...props}
      testID={testID}
      apariencia={{
        fondo: habilitado ? (tonal ? cs.secondaryContainer : cs.primary) : withAlpha(cs.onSurface, 0.12),
        contenido: habilitado ? (tonal ? cs.onSecondaryContainer : cs.onPrimary) : deshabilitado(cs.onSurface),
        minHeight: 52,
        padding: 24,
        paddingConIcono: [16, 24],
        texto: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
      }}
    />
  );
}

export function OutlinedButton({ testID = 'outlined-button', ...props }: BotonProps) {
  const cs = useTheme().colorScheme;
  const habilitado = typeof props.onPress === 'function';
  return (
    <BotonBase
      {...props}
      testID={testID}
      apariencia={{
        fondo: 'transparent',
        contenido: habilitado ? cs.primary : deshabilitado(cs.onSurface),
        borde: habilitado ? cs.outlineVariant : withAlpha(cs.onSurface, 0.12),
        minHeight: 48,
        padding: 24,
        paddingConIcono: [16, 24],
        texto: { fontSize: 14.5, fontWeight: '600', letterSpacing: 0 },
      }}
    />
  );
}

export function TextButton({ testID = 'text-button', ...props }: BotonProps) {
  const cs = useTheme().colorScheme;
  const habilitado = typeof props.onPress === 'function';
  return (
    <BotonBase
      {...props}
      testID={testID}
      apariencia={{
        fondo: 'transparent',
        contenido: habilitado ? cs.primary : deshabilitado(cs.onSurface),
        minHeight: 40,
        padding: 12,
        paddingConIcono: [12, 16],
        texto: { fontSize: 14, fontWeight: '600', letterSpacing: 0 },
        hitSlop: { top: 4, bottom: 4 },
      }}
    />
  );
}

export interface IconButtonProps {
  icono: IconName;
  /** Texto del tooltip de Flutter: es la etiqueta accesible (lo que verifican los tests). */
  tooltip: string;
  onPress?: (() => void) | null;
  variante?: 'standard' | 'filled' | 'filledTonal' | 'outlined';
  tamanoIcono?: number;
  colorFondo?: string;
  colorIcono?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** `IconButton` M3: 40 visibles (48 táctiles), ícono 24. */
export function IconButton({
  icono,
  tooltip,
  onPress,
  variante = 'standard',
  tamanoIcono = 24,
  colorFondo,
  colorIcono,
  style,
  testID = 'icon-button',
}: IconButtonProps) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const habilitado = typeof onPress === 'function';
  const lleno = variante === 'filled' || variante === 'filledTonal';
  const fondoPorDefecto = !lleno
    ? 'transparent'
    : !habilitado
      ? withAlpha(cs.onSurface, 0.12)
      : variante === 'filled'
        ? cs.primary
        : cs.secondaryContainer;
  const iconoPorDefecto = !habilitado
    ? deshabilitado(cs.onSurface)
    : variante === 'filled'
      ? cs.onPrimary
      : variante === 'filledTonal'
        ? cs.onSecondaryContainer
        : cs.onSurfaceVariant;
  const color = colorIcono ?? iconoPorDefecto;
  return (
    <Pressable
      testID={testID}
      onPress={habilitado ? onPress : undefined}
      disabled={!habilitado}
      accessibilityRole="button"
      accessibilityLabel={tooltip}
      accessibilityState={{ disabled: !habilitado }}
      hitSlop={4}
      style={[
        estilos.iconButton,
        { backgroundColor: colorFondo ?? fondoPorDefecto },
        variante === 'outlined'
          ? { borderWidth: 1, borderColor: habilitado ? cs.outline : withAlpha(cs.onSurface, 0.12) }
          : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, tema.components.pressedOpacity) }]}
            />
          ) : null}
          <Icon name={icono} size={tamanoIcono} color={color} />
        </>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  centrado: { textAlign: 'center' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
