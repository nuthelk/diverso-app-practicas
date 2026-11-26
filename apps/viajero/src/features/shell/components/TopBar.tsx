import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DefaultTextStyle, IconButton, Text } from '@/ui/components';
import { useTheme } from '@/ui/theme';

/**
 * `AppBar` con el tema de la app (§3.7): alto 56 bajo la barra de estado, opaco del color de la
 * página y sin tinte; título 15 w700 ls -0.2 onSurface a 20 del borde (o tras el botón atrás).
 * [onBack] pinta el botón «Volver». Las pantallas a las que se puede llegar por enlace o recarga lo
 * pasan siempre con `safeGoBack` (atrás si hay historial; si no, a un destino lógico): en Flutter
 * solo aparecía con historial y la pantalla quedaba sin salida. [title] puede ser texto o un nodo (p.ej. `PageTitle`).
 */
export function TopBar({
  title,
  onBack,
  actions,
}: {
  title: ReactNode;
  onBack?: (() => void) | null;
  actions?: ReactNode;
}) {
  const theme = useTheme();
  const appBar = theme.components.appBar;
  const top = useSafeAreaInsets().top;
  return (
    <View
      testID="top-bar"
      style={[styles.bar, { paddingTop: top, backgroundColor: appBar.backgroundColor }]}
    >
      <View style={[styles.row, { height: appBar.toolbarHeight }]}>
        {onBack ? (
          <View style={styles.leading}>
            <IconButton icon="arrow_back_rounded" tooltip="Volver" onPress={onBack} iconColor={appBar.foregroundColor} />
          </View>
        ) : null}
        <View style={[styles.title, { marginLeft: appBar.titleSpacing }]}>
          <DefaultTextStyle style={{ ...appBar.title, height: null }}>
            {typeof title === 'string' ? (
              <Text accessibilityRole="header" numberOfLines={1}>
                {title}
              </Text>
            ) : (
              title
            )}
          </DefaultTextStyle>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  leading: { width: 56, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginRight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
});
