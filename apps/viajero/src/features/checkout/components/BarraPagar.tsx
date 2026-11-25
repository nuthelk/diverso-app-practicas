import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCOP } from '@/core';
import { FilledButton, Icono, Text } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

const ANCHO_BOTON = 220;

/**
 * Alto del teclado (`MediaQuery.viewInsetsOf(context).bottom`). Ni iOS ni Android (edge-to-edge
 * desde el SDK 58: la ventana ya NO se achica) le hacen lugar solos; en web no hay teclado del
 * sistema. iOS avisa ANTES (`keyboardWill*`); Android solo emite `keyboardDid*`.
 */
function useAlturaTeclado(): number {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const ios = Platform.OS === 'ios';
    const mostrar = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setAlto(e.endCoordinates.height),
    );
    const ocultar = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setAlto(0));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);
  return alto;
}

/**
 * Barra inferior del checkout: total, personas y el botón «Pagar con Wompi». [onPagar] null =
 * botón bloqueado; [procesando] muestra el progreso. Va DEBAJO del scroll (no encima), así el
 * contenido termina donde empieza la barra; abajo suma el teclado o la barra de gestos.
 */
export function BarraPagar({
  total,
  pax,
  procesando,
  onPagar,
}: {
  total: number;
  pax: number;
  procesando: boolean;
  onPagar: (() => void) | null;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const teclado = useAlturaTeclado();
  const gestos = useSafeAreaInsets().bottom;
  const habilitado = onPagar !== null;
  const contenido = habilitado ? cs.onPrimary : withAlpha(cs.onSurface, 0.38);
  return (
    <View
      testID="barra-pagar"
      style={[
        estilos.barra,
        {
          paddingBottom: 14 + Math.max(teclado, gestos),
          backgroundColor: tema.pageBackground,
          borderTopColor: withAlpha(cs.outlineVariant, 0.5),
        },
      ]}
    >
      <View style={estilos.total}>
        <Text style={{ fontSize: AppText.headingM, fontWeight: '800', letterSpacing: -0.5, color: cs.onSurface }}>
          {formatCOP(total)}
        </Text>
        <Text style={{ fontSize: AppText.note, color: cs.onSurfaceVariant }}>
          {`total por ${pax} ${pax === 1 ? 'persona' : 'personas'}`}
        </Text>
      </View>
      {/* `FilledButton.icon` (16 | ícono 17 | 8 | texto | 24): candado o progreso. */}
      <FilledButton
        accessibilityLabel={procesando ? 'Procesando…' : 'Pagar con Wompi'}
        onPress={onPagar}
        style={estilos.boton}
      >
        {procesando ? (
          // `SizedBox(17×17)` con un indicador de trazo 2 (el «small» de RN mide 20).
          <View style={estilos.caja17}>
            <ActivityIndicator testID="pagar-progreso" size="small" color={contenido} style={estilos.indicador} />
          </View>
        ) : (
          <Icono nombre="lock_rounded" size={17} color={contenido} />
        )}
        <Text style={estilos.centrado}>{procesando ? 'Procesando…' : 'Pagar con Wompi'}</Text>
      </FilledButton>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingTop: 12,
    paddingRight: 20,
    borderTopWidth: 1,
  },
  total: { flex: 1, minWidth: 0 },
  boton: { width: ANCHO_BOTON, paddingLeft: 16, paddingRight: 24 },
  centrado: { textAlign: 'center' },
  caja17: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center' },
  indicador: { transform: [{ scale: 0.85 }] },
});
