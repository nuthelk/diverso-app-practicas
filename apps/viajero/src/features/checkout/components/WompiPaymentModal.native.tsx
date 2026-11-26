import { useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WebViewNavigation } from 'react-native-webview';

import { DefaultTextStyle, IconButton, Text } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { decideNavigation, type WompiPaymentModalProps } from '../wompi-payment';

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
export function WompiPaymentModal({ checkoutUrl, onFinish }: WompiPaymentModalProps) {
  return (
    <Modal
      visible={checkoutUrl !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => onFinish(null)}
    >
      {checkoutUrl !== null ? <WompiPaymentPage checkoutUrl={checkoutUrl} onFinish={onFinish} /> : null}
    </Modal>
  );
}

export function WompiPaymentPage({
  checkoutUrl,
  onFinish,
}: {
  checkoutUrl: string;
  onFinish: (transactionId: string | null) => void;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const appBar = theme.components.appBar;
  const topInset = useSafeAreaInsets().top;
  const [progress, setProgress] = useState(0);
  const WebView = webView();
  // Una sola salida aunque la redirección llegue dos veces (`_terminado` de Dart).
  const finished = useRef(false);

  const finish = (id: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(id);
  };

  /** `onNavigationRequest`: true = cargar; false = no cargar (`prevent`). */
  const handleNavigationRequest = ({ url }: { url: string }): boolean => {
    const decision = decideNavigation(url);
    if (decision.kind === 'retorno') {
      finish(decision.id);
      return false;
    }
    return decision.kind === 'permitir';
  };

  // Respaldo: si una plataforma no consultó `onShouldStartLoadWithRequest` (p. ej. una redirección
  // del servidor en algunas versiones de Android), el cambio de URL igual cierra el pago.
  const handleNavigationChange = (n: WebViewNavigation) => {
    const decision = decideNavigation(n.url);
    if (decision.kind === 'retorno') finish(decision.id);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <View style={{ paddingTop: topInset, backgroundColor: appBar.backgroundColor }}>
        <View style={[styles.bar, { height: appBar.toolbarHeight }]}>
          <View style={styles.leading}>
            <IconButton
              icon="close_rounded"
              tooltip="Cerrar"
              onPress={() => finish(null)}
              iconColor={appBar.foregroundColor}
            />
          </View>
          <View style={[styles.title, { marginLeft: appBar.titleSpacing }]}>
            <DefaultTextStyle style={{ ...appBar.title, height: null }}>
              <Text accessibilityRole="header" numberOfLines={1}>
                Pago de prueba con Wompi
              </Text>
            </DefaultTextStyle>
          </View>
        </View>
        {progress < 1 ? (
          <View
            testID="pago-progreso"
            accessibilityRole="progressbar"
            style={[styles.track, { backgroundColor: cs.secondaryContainer }]}
          >
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: cs.primary }]} />
          </View>
        ) : null}
      </View>
      <WebView
        testID="pago-webview"
        source={{ uri: checkoutUrl }}
        javaScriptEnabled
        domStorageEnabled
        // Todo pasa por `handleNavigationRequest` (con la lista por defecto, los esquemas raros irían a
        // `Linking.openURL` y abrirían otra app en vez de bloquearse como en Flutter).
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={handleNavigationRequest}
        onNavigationStateChange={handleNavigationChange}
        onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
        style={styles.screen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center' },
  leading: { width: 56, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginRight: 20 },
  track: { height: 2, width: '100%' },
  fill: { height: 2 },
});
