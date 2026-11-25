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
  valor: string;
  onChangeText: (texto: string) => void;
  /** `labelText`. */
  etiqueta?: string;
  /** `hintText`. */
  pista?: string;
  /** `prefixIcon`. */
  icono?: IconName;
  /** `suffixIcon` (p.ej. un IconButton «Borrar búsqueda»). */
  sufijo?: ReactNode;
  /** `errorText`: si hay texto, el campo se pinta en error. */
  error?: string | null;
  /** `maxLines` > 1 (con `alignLabelWithHint`, la etiqueta arriba). */
  lineas?: number;
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ALTO_LINEA = 24;
const RELLENO_V = 14;
const IZQUIERDA = 20;
const ANCHO_PREFIJO = 48;

/**
 * Geometría del campo (Material 3, «filled»). Con etiqueta la caja mide 56: 24 arriba para que la
 * etiqueta flote DENTRO (a 8 del borde, 12 px de alto) y 8 abajo; así el borde de foco nunca la
 * atraviesa ni la etiqueta pisa el texto. Sin etiqueta (p. ej. el buscador, solo pista): 14 y 14.
 */
export function medidasCampo({ conEtiqueta, lineas, anchoBorde }: { conEtiqueta: boolean; lineas: number; anchoBorde: number }) {
  const arriba = conEtiqueta ? 24 : RELLENO_V;
  const abajo = conEtiqueta ? 8 : RELLENO_V;
  const altoContenido = ALTO_LINEA * Math.max(1, lineas);
  const altoCaja = arriba + altoContenido + abajo;
  return {
    arriba,
    abajo,
    altoContenido,
    altoCaja,
    // Reposo: centrada en la caja (o en la primera línea si es multilínea).
    topReposo: lineas > 1 ? arriba + 4 : (altoCaja - 16) / 2,
    // Flotando: dentro de la caja, nunca encima del borde.
    topFlotando: Math.max(8, anchoBorde),
  };
}

export function TextField({
  valor,
  onChangeText,
  etiqueta,
  pista,
  icono,
  sufijo,
  error,
  lineas = 1,
  maxLength,
  deshabilitado = false,
  style,
  testID = 'text-field',
  onFocus,
  onBlur,
  ...resto
}: TextFieldProps) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const input = tema.components.input;
  const [foco, setFoco] = useState(false);
  const campo = useRef<ComponentRef<typeof TextInput>>(null);
  const hayError = !!error;
  const flota = foco || valor.length > 0;
  const multilinea = lineas > 1;

  const progreso = useRef(new Animated.Value(flota ? 1 : 0)).current;
  const flotaAntes = useRef(flota);
  useEffect(() => {
    if (flotaAntes.current === flota) return;
    flotaAntes.current = flota;
    const animacion = Animated.timing(progreso, {
      toValue: flota ? 1 : 0,
      duration: Durations.textField,
      easing: Curves.fastOutSlowIn.fn,
      useNativeDriver: false,
    });
    animacion.start();
    return () => animacion.stop();
  }, [flota, progreso]);

  const borde = hayError ? (foco ? input.focusErrorBorder : input.errorBorder) : foco ? input.focusBorder : null;
  const anchoBorde = borde?.width ?? 0;
  const izquierdaContenido = icono ? ANCHO_PREFIJO + 4 : IZQUIERDA;
  const { arriba, abajo, altoContenido, altoCaja, topReposo, topFlotando } = medidasCampo({
    conEtiqueta: !!etiqueta,
    lineas,
    anchoBorde,
  });

  const colorEtiqueta = hayError ? cs.error : foco ? cs.primary : cs.onSurfaceVariant;
  const fuente = Platform.OS === 'android' || Platform.OS === 'web' ? robotoFamily('400') : undefined;
  const cuerpo = textTheme.bodyLarge;

  return (
    <View style={style}>
      {/* Toda la caja enfoca el campo (M3): con la etiqueta adentro, la franja de arriba es relleno
          de la caja y tocarla no llegaba al TextInput. No accesible: el lector anuncia el campo. */}
      <Pressable
        testID={testID}
        accessible={false}
        onPress={() => campo.current?.focus()}
        style={[
          estilos.caja,
          {
            backgroundColor: input.fillColor,
            borderRadius: input.radius,
            minHeight: altoCaja,
            borderColor: borde?.color ?? 'transparent',
            borderWidth: anchoBorde,
            // El borde de Flutter se pinta encima, no empuja el contenido.
            paddingLeft: Math.max(0, (icono ? 0 : IZQUIERDA) - anchoBorde),
            paddingRight: Math.max(0, (sufijo ? 0 : IZQUIERDA) - anchoBorde),
            paddingTop: Math.max(0, arriba - anchoBorde),
            paddingBottom: Math.max(0, abajo - anchoBorde),
            alignItems: multilinea ? 'flex-start' : 'center',
            opacity: deshabilitado ? 0.38 : 1,
          },
        ]}
      >
        {icono ? (
          <View style={[estilos.prefijo, { marginLeft: -anchoBorde, marginRight: 4 }, multilinea ? null : estirar(arriba, abajo, anchoBorde)]}>
            <Icon name={icono} size={24} color={cs.onSurfaceVariant} />
          </View>
        ) : null}
        <TextInput
          {...resto}
          ref={campo}
          value={valor}
          onChangeText={onChangeText}
          editable={!deshabilitado}
          multiline={multilinea}
          numberOfLines={multilinea ? lineas : undefined}
          maxLength={maxLength}
          placeholder={pista}
          placeholderTextColor={cs.onSurfaceVariant}
          accessibilityLabel={resto.accessibilityLabel ?? etiqueta ?? pista}
          cursorColor={hayError ? input.errorCursor : input.cursor}
          selectionColor={hayError ? input.errorCursor : input.cursor}
          onFocus={(e) => {
            setFoco(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur?.(e);
          }}
          style={[
            estilos.input,
            {
              fontSize: cuerpo.fontSize,
              letterSpacing: cuerpo.letterSpacing,
              color: tema.textColor,
              fontFamily: fuente,
              minHeight: altoContenido,
            },
            multilinea ? { lineHeight: ALTO_LINEA, textAlignVertical: 'top' } : null,
          ]}
        />
        {/* Como el suffixIcon de Flutter: se centra en todo el alto de la caja SIN agrandarla (un
            IconButton de 48 dentro de una caja de 52 la estiraba a 76). */}
        {sufijo ? (
          <View testID="sufijo" style={[estilos.sufijo, { marginRight: -anchoBorde }, estirar(arriba, abajo, anchoBorde)]}>
            {sufijo}
          </View>
        ) : null}
        {etiqueta ? (
          <Animated.View
            testID="etiqueta-flotante"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              estilos.etiqueta,
              {
                // Siempre alineada con el texto: flotando dentro de la caja no puede ir sobre el ícono.
                left: izquierdaContenido - anchoBorde,
                top: progreso.interpolate({
                  inputRange: [0, 1],
                  outputRange: [topReposo - anchoBorde, topFlotando - anchoBorde],
                }),
              },
            ]}
          >
            <Animated.Text
              numberOfLines={1}
              style={{
                fontFamily: fuente,
                fontSize: progreso.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                lineHeight: progreso.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
                letterSpacing: cuerpo.letterSpacing,
                color: colorEtiqueta,
              }}
            >
              {etiqueta}
            </Animated.Text>
          </Animated.View>
        ) : null}
      </Pressable>
      {hayError || maxLength !== undefined ? (
        <View style={estilos.pie}>
          {hayError ? (
            <Text variant="bodySmall" style={[estilos.flex, { color: cs.error }]}>
              {error}
            </Text>
          ) : (
            <View style={estilos.flex} />
          )}
          {maxLength !== undefined ? (
            <Text variant="bodySmall" style={{ color: cs.onSurfaceVariant }}>
              {`${valor.length}/${maxLength}`}
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
function estirar(arriba: number, abajo: number, anchoBorde: number) {
  return { alignSelf: 'stretch' as const, marginTop: -(arriba - anchoBorde), marginBottom: -(abajo - anchoBorde) };
}

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row' },
  prefijo: { width: ANCHO_PREFIJO, minHeight: ALTO_LINEA, alignItems: 'center', justifyContent: 'center' },
  sufijo: { alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, padding: 0, margin: 0 },
  etiqueta: { position: 'absolute', right: IZQUIERDA },
  pie: { flexDirection: 'row', paddingHorizontal: IZQUIERDA, paddingTop: 4, gap: 16 },
  flex: { flex: 1 },
});
