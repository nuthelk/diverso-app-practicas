import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Divider, Icono, Text, type IconoNombre } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/** Destinos del shell, en orden (los nombres son los archivos de `src/app/(tabs)`). */
export const DESTINOS: readonly { ruta: string; etiqueta: string; icono: IconoNombre; iconoActivo: IconoNombre }[] = [
  { ruta: 'index', etiqueta: 'Explorar', icono: 'explore_outlined', iconoActivo: 'explore_rounded' },
  { ruta: 'agencias', etiqueta: 'Agencias', icono: 'storefront_outlined', iconoActivo: 'storefront_rounded' },
  { ruta: 'reservas', etiqueta: 'Reservas', icono: 'receipt_long_outlined', iconoActivo: 'receipt_long_rounded' },
  { ruta: 'perfil', etiqueta: 'Perfil', icono: 'person_outline_rounded', iconoActivo: 'person_rounded' },
];

/**
 * Barra inferior del shell (`AppShell` de Flutter): `Column[Divider(1), NavigationBar]` fija al
 * borde, sólida (surfaceContainerLowest), alto 72 + el inset inferior, con la píldora
 * primaryContainer (64 × 32) en el destino activo; íconos 28 y etiquetas 12 (w700 activa / w600)
 * en primary / onSurfaceVariant. Tocar el destino activo no hace nada (cada pestaña es una sola
 * pantalla: no hay pila propia que volver a su raíz).
 */
export function BarraInferior({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const tema = useTheme();
  const nav = tema.components.navigationBar;
  return (
    <View testID="barra-inferior" style={estilos.contenedor}>
      <Divider />
      <View
        testID="navigation-bar"
        accessibilityRole="tablist"
        style={[estilos.barra, { backgroundColor: nav.backgroundColor, minHeight: nav.height + insets.bottom, paddingBottom: insets.bottom }]}
      >
        {/* Orden de la marca (DESTINOS), no el del navegador: Expo Router guarda las pestañas en su
            orden canónico y declararlas en otro orden hacía que despachara ROUTE_NAMES_CHANGED. */}
        {DESTINOS.map((destino) => {
          const route = state.routes.find((r) => r.name === destino.ruta);
          if (!route) return null;
          const activo = state.routes[state.index]?.key === route.key;
          const color = activo ? nav.selectedColor : nav.unselectedColor;
          const alTocar = () => {
            const evento = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!activo && !evento.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={destino.etiqueta}
              accessibilityState={{ selected: activo }}
              onPress={alTocar}
              style={[estilos.destino, { height: nav.height }]}
            >
              <View style={estilos.iconoCaja}>
                {activo ? (
                  <View testID="indicador" style={[estilos.indicador, { backgroundColor: nav.indicatorColor }]} />
                ) : null}
                <Icono nombre={activo ? destino.iconoActivo : destino.icono} size={nav.iconSize} color={color} />
              </View>
              <Text
                numberOfLines={1}
                altura={null}
                style={{
                  marginTop: 4,
                  fontSize: AppText.caption,
                  fontWeight: activo ? nav.label.selectedWeight : nav.label.weight,
                  letterSpacing: 0,
                  color,
                }}
              >
                {destino.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%' },
  barra: { flexDirection: 'row', width: '100%' },
  destino: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconoCaja: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center' },
  indicador: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 },
});
