import { useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WebViewNavigation } from 'react-native-webview';

import { DefaultTextStyle, IconButton, Text } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { decidirNavegacion, type PagoWompiModalProps } from '../pago-wompi';

/**
 * `react-native-webview` se carga al abrir el pago, no al importar este archivo: su módulo nativo
 * (`RNCWebViewModule`) se exige al cargarse y no existe en Jest, así que un import arriba rompía
 * cualquier prueba que monte el checkout o la app entera.
 */
function webView(): typeof import('react-native-webview').WebView {
  return (require('react-native-webview') as typeof import('react-native-webview')).WebView;
}

/**
 * Android/iOS: checkout de Wompi en un WebView a pantalla completa (`PagoWompiPage`, ruta
 * imperativa de Flutter, no de go_router). Cierra con el id de la transacción al interceptar la
 * redirección final `https://diverso.app/pago/resultado?id=…`, que NUNCA se carga; la ✕ (o el
 * botón atrás de Android) cierra sin terminar (`null` = «cerrado»).
 */
export function PagoWompiModal({ checkoutUrl, onTerminar }: PagoWompiModalProps) {
  return (
    <Modal
      visible={checkoutUrl !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => onTerminar(null)}
    >
      {checkoutUrl !== null ? <PagoWompiPage checkoutUrl={checkoutUrl} onTerminar={onTerminar} /> : null}
    </Modal>
  );
}

export function PagoWompiPage({
  checkoutUrl,
  onTerminar,
}: {
  checkoutUrl: string;
  onTerminar: (transactionId: string | null) => void;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const appBar = tema.componentes.appBar;
  const arriba = useSafeAreaInsets().top;
  const [progreso, setProgreso] = useState(0);
  const WebView = webView();
  // Una sola salida aunque la redirección llegue dos veces (`_terminado` de Dart).
  const terminado = useRef(false);

  const terminar = (id: string | null) => {
    if (terminado.current) return;
    terminado.current = true;
    onTerminar(id);
  };

  /** `onNavigationRequest`: true = cargar; false = no cargar (`prevent`). */
  const alNavegar = ({ url }: { url: string }): boolean => {
    const decision = decidirNavegacion(url);
    if (decision.tipo === 'retorno') {
      terminar(decision.id);
      return false;
    }
    return decision.tipo === 'permitir';
  };

  // Respaldo: si una plataforma no consultó `onShouldStartLoadWithRequest` (p. ej. una redirección
  // del servidor en algunas versiones de Android), el cambio de URL igual cierra el pago.
  const alCambiarNavegacion = (n: WebViewNavigation) => {
    const decision = decidirNavegacion(n.url);
    if (decision.tipo === 'retorno') terminar(decision.id);
  };

  return (
    <View style={[estilos.pantalla, { backgroundColor: tema.fondoPagina }]}>
      <View style={{ paddingTop: arriba, backgroundColor: appBar.backgroundColor }}>
        <View style={[estilos.barra, { height: appBar.toolbarHeight }]}>
          <View style={estilos.inicio}>
            <IconButton
              icono="close_rounded"
              tooltip="Cerrar"
              onPress={() => terminar(null)}
              colorIcono={appBar.foregroundColor}
            />
          </View>
          <View style={[estilos.titulo, { marginLeft: appBar.titleSpacing }]}>
            <DefaultTextStyle estilo={{ ...appBar.titulo, altura: null }}>
              <Text accessibilityRole="header" numberOfLines={1}>
                Pago de prueba con Wompi
              </Text>
            </DefaultTextStyle>
          </View>
        </View>
        {progreso < 1 ? (
          <View
            testID="pago-progreso"
            accessibilityRole="progressbar"
            style={[estilos.pista, { backgroundColor: cs.secondaryContainer }]}
          >
            <View style={[estilos.avance, { width: `${Math.round(progreso * 100)}%`, backgroundColor: cs.primary }]} />
          </View>
        ) : null}
      </View>
      <WebView
        testID="pago-webview"
        source={{ uri: checkoutUrl }}
        javaScriptEnabled
        domStorageEnabled
        // Todo pasa por `alNavegar` (con la lista por defecto, los esquemas raros irían a
        // `Linking.openURL` y abrirían otra app en vez de bloquearse como en Flutter).
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={alNavegar}
        onNavigationStateChange={alCambiarNavegacion}
        onLoadProgress={(e) => setProgreso(e.nativeEvent.progress)}
        style={estilos.pantalla}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center' },
  inicio: { width: 56, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, marginRight: 20 },
  pista: { height: 2, width: '100%' },
  avance: { height: 2 },
});
