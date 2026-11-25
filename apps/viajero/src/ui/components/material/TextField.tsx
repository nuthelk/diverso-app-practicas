import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Curves, Durations, robotoFamily, textTheme, useTheme } from '@/ui/theme';

import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';

/**
 * Campo de texto con el `InputDecorationTheme` de la app (§3.7), medido con `flutter test`:
 * relleno negro 4 % / blanco 5 %, radio 14, sin borde; foco = borde primary 1.6, error = error
 * 1.2 (foco+error 1.6). Alto 52 (14 + línea de 24 + 14). Texto bodyLarge (16, ls 0.5) en el color
 * de texto por defecto. Contenido a 20 del borde (52 con ícono prefijo de 48). La etiqueta
 * (bodyLarge onSurfaceVariant) flota a 12 px sobre el borde superior al enfocar o tener texto,
 * en primary con foco; en error, color error.
 */
export interface TextFieldProps
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'style' | 'placeholder' | 'editable' | 'multiline'> {
  value: string;
  onChangeText: (texto: string) => void;
  /** `labelText`. */
  label?: string;
  /** `hintText`. */
  hint?: string;
  /** `prefixIcon`. */
  icon?: IconName;
  /** `suffixIcon` (p.ej. un IconButton «Borrar búsqueda»). */
  suffix?: ReactNode;
  /** `errorText`: si hay texto, el campo se pinta en error. */
  error?: string | null;
  /** `maxLines` > 1 (con `alignLabelWithHint`, la etiqueta arriba). */
  lines?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const LINE_HEIGHT = 24;
const VERTICAL_PADDING = 14;
const HORIZONTAL_INSET = 20;
const PREFIX_WIDTH = 48;

/**
 * Geometría del campo (Material 3, «filled»). Con etiqueta la caja mide 56: 24 arriba para que la
 * etiqueta flote DENTRO (a 8 del borde, 12 px de alto) y 8 abajo; así el borde de foco nunca la
 * atraviesa ni la etiqueta pisa el texto. Sin etiqueta (p. ej. el buscador, solo pista): 14 y 14.
 */
export function fieldMetrics({ hasLabel, lines, borderWidth }: { hasLabel: boolean; lines: number; borderWidth: number }) {
  const top = hasLabel ? 24 : VERTICAL_PADDING;
  const bottom = hasLabel ? 8 : VERTICAL_PADDING;
  const contentHeight = LINE_HEIGHT * Math.max(1, lines);
  const boxHeight = top + contentHeight + bottom;
  return {
    top,
    bottom,
    contentHeight,
    boxHeight,
    // Reposo: centrada en la caja (o en la primera línea si es multilínea).
    restingTop: lines > 1 ? top + 4 : (boxHeight - 16) / 2,
    // Flotando: dentro de la caja, nunca encima del borde.
    floatingTop: Math.max(8, borderWidth),
  };
}

export function TextField({
  value,
  onChangeText,
  label,
  hint,
  icon,
  suffix,
  error,
  lines = 1,
  maxLength,
  disabled = false,
  style,
  testID = 'text-field',
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const input = theme.components.input;
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const hasError = !!error;
  const isFloating = focused || value.length > 0;
  const isMultiline = lines > 1;

  const progress = useRef(new Animated.Value(isFloating ? 1 : 0)).current;
  const wasFloating = useRef(isFloating);
  useEffect(() => {
    if (wasFloating.current === isFloating) return;
    wasFloating.current = isFloating;
    const animation = Animated.timing(progress, {
      toValue: isFloating ? 1 : 0,
      duration: Durations.textField,
      easing: Curves.fastOutSlowIn.fn,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isFloating, progress]);

  const border = hasError ? (focused ? input.focusErrorBorder : input.errorBorder) : focused ? input.focusBorder : null;
  const borderWidth = border?.width ?? 0;
  const contentLeft = icon ? PREFIX_WIDTH + 4 : HORIZONTAL_INSET;
  const { top, bottom, contentHeight, boxHeight, restingTop, floatingTop } = fieldMetrics({
    hasLabel: !!label,
    lines,
    borderWidth,
  });

  const labelColor = hasError ? cs.error : focused ? cs.primary : cs.onSurfaceVariant;
  const font = Platform.OS === 'android' || Platform.OS === 'web' ? robotoFamily('400') : undefined;
  const bodyStyle = textTheme.bodyLarge;

  return (
    <View style={style}>
      {/* Toda la caja enfoca el campo (M3): con la etiqueta adentro, la franja de arriba es relleno
          de la caja y tocarla no llegaba al TextInput. No accesible: el lector anuncia el campo. */}
      <Pressable
        testID={testID}
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.box,
          {
            backgroundColor: input.fillColor,
            borderRadius: input.radius,
            minHeight: boxHeight,
            borderColor: border?.color ?? 'transparent',
            borderWidth,
            // El borde de Flutter se pinta encima, no empuja el contenido.
            paddingLeft: Math.max(0, (icon ? 0 : HORIZONTAL_INSET) - borderWidth),
            paddingRight: Math.max(0, (suffix ? 0 : HORIZONTAL_INSET) - borderWidth),
            paddingTop: Math.max(0, top - borderWidth),
            paddingBottom: Math.max(0, bottom - borderWidth),
            alignItems: isMultiline ? 'flex-start' : 'center',
            opacity: disabled ? 0.38 : 1,
          },
        ]}
      >
        {icon ? (
          <View style={[styles.prefix, { marginLeft: -borderWidth, marginRight: 4 }, isMultiline ? null : stretchToBox(top, bottom, borderWidth)]}>
            <Icon name={icon} size={24} color={cs.onSurfaceVariant} />
          </View>
        ) : null}
        <TextInput
          {...rest}
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          multiline={isMultiline}
          numberOfLines={isMultiline ? lines : undefined}
          maxLength={maxLength}
          placeholder={hint}
          placeholderTextColor={cs.onSurfaceVariant}
          accessibilityLabel={rest.accessibilityLabel ?? label ?? hint}
          cursorColor={hasError ? input.errorCursor : input.cursor}
          selectionColor={hasError ? input.errorCursor : input.cursor}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              fontSize: bodyStyle.fontSize,
              letterSpacing: bodyStyle.letterSpacing,
              color: theme.textColor,
              fontFamily: font,
              minHeight: contentHeight,
            },
            isMultiline ? { lineHeight: LINE_HEIGHT, textAlignVertical: 'top' } : null,
          ]}
        />
        {/* Como el suffixIcon de Flutter: se centra en todo el alto de la caja SIN agrandarla (un
            IconButton de 48 dentro de una caja de 52 la estiraba a 76). */}
        {suffix ? (
          <View testID="sufijo" style={[styles.suffix, { marginRight: -borderWidth }, stretchToBox(top, bottom, borderWidth)]}>
            {suffix}
          </View>
        ) : null}
        {label ? (
          <Animated.View
            testID="etiqueta-flotante"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.label,
              {
                // Siempre alineada con el texto: flotando dentro de la caja no puede ir sobre el ícono.
                left: contentLeft - borderWidth,
                top: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [restingTop - borderWidth, floatingTop - borderWidth],
                }),
              },
            ]}
          >
            <Animated.Text
              numberOfLines={1}
              style={{
                fontFamily: font,
                fontSize: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                lineHeight: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                letterSpacing: bodyStyle.letterSpacing,
                color: labelColor,
              }}
            >
              {label}
            </Animated.Text>
          </Animated.View>
        ) : null}
      </Pressable>
      {hasError || maxLength !== undefined ? (
        <View style={styles.footer}>
          {hasError ? (
            <Text variant="bodySmall" style={[styles.flex, { color: cs.error }]}>
              {error}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}
          {maxLength !== undefined ? (
            <Text variant="bodySmall" style={{ color: cs.onSurfaceVariant }}>
              {`${value.length}/${maxLength}`}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Ícono o botón a los lados: ocupa TODO el alto de la caja (márgenes negativos iguales al relleno)
 * y se centra ahí, como el prefixIcon/suffixIcon de Flutter; no la agranda.
 */
function stretchToBox(top: number, bottom: number, borderWidth: number) {
  return { alignSelf: 'stretch' as const, marginTop: -(top - borderWidth), marginBottom: -(bottom - borderWidth) };
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row' },
  prefix: { width: PREFIX_WIDTH, minHeight: LINE_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  suffix: { alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, padding: 0, margin: 0 },
  label: { position: 'absolute', right: HORIZONTAL_INSET },
  footer: { flexDirection: 'row', paddingHorizontal: HORIZONTAL_INSET, paddingTop: 4, gap: 16 },
  flex: { flex: 1 },
});
