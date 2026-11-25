import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DefaultTextStyle, IconButton, Text } from '@/ui/components';
import { useTheme } from '@/ui/theme';

/**
 * `AppBar` con el tema de la app (§3.7): alto 56 bajo la barra de estado, opaco del color de la
 * página y sin tinte; título 15 w700 ls -0.2 onSurface a 20 del borde (o tras el botón atrás).
 * [onVolver] pinta el botón «Volver». Las pantallas a las que se puede llegar por enlace o recarga lo
 * pasan siempre con `volverSeguro` (atrás si hay historial; si no, a un destino lógico): en Flutter
 * solo aparecía con historial y la pantalla quedaba sin salida. [titulo] puede ser texto o un nodo (p.ej. `PageTitle`).
 */
export function BarraSuperior({
  titulo,
  onVolver,
  acciones,
}: {
  titulo: ReactNode;
  onVolver?: (() => void) | null;
  acciones?: ReactNode;
}) {
  const tema = useTheme();
  const appBar = tema.components.appBar;
  const arriba = useSafeAreaInsets().top;
  return (
    <View
      testID="barra-superior"
      style={[estilos.barra, { paddingTop: arriba, backgroundColor: appBar.backgroundColor }]}
    >
      <View style={[estilos.fila, { height: appBar.toolbarHeight }]}>
        {onVolver ? (
          <View style={estilos.inicio}>
            <IconButton icon="arrow_back_rounded" tooltip="Volver" onPress={onVolver} iconColor={appBar.foregroundColor} />
          </View>
        ) : null}
        <View style={[estilos.titulo, { marginLeft: appBar.titleSpacing }]}>
          <DefaultTextStyle style={{ ...appBar.title, height: null }}>
            {typeof titulo === 'string' ? (
              <Text accessibilityRole="header" numberOfLines={1}>
                {titulo}
              </Text>
            ) : (
              titulo
            )}
          </DefaultTextStyle>
        </View>
        {acciones ? <View style={estilos.acciones}>{acciones}</View> : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { width: '100%' },
  fila: { flexDirection: 'row', alignItems: 'center' },
  inicio: { width: 56, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, marginRight: 20 },
  acciones: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
});
