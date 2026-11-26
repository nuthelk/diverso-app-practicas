import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Divider, Icon, Text, type IconName } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/** Destinos del shell, en orden (los nombres son los archivos de `src/app/(tabs)`). */
export const TABS: readonly { routeName: string; label: string; icon: IconName; activeIcon: IconName }[] = [
  { routeName: 'index', label: 'Explorar', icon: 'explore_outlined', activeIcon: 'explore_rounded' },
  { routeName: 'agencias', label: 'Agencias', icon: 'storefront_outlined', activeIcon: 'storefront_rounded' },
  { routeName: 'reservas', label: 'Reservas', icon: 'receipt_long_outlined', activeIcon: 'receipt_long_rounded' },
  { routeName: 'perfil', label: 'Perfil', icon: 'person_outline_rounded', activeIcon: 'person_rounded' },
];

/**
 * Barra inferior del shell (`AppShell` de Flutter): `Column[Divider(1), NavigationBar]` fija al
 * borde, sólida (surfaceContainerLowest), alto 72 + el inset inferior, con la píldora
 * primaryContainer (64 × 32) en el destino activo; íconos 28 y etiquetas 12 (w700 activa / w600)
 * en primary / onSurfaceVariant. Tocar el destino activo no hace nada (cada pestaña es una sola
 * pantalla: no hay pila propia que volver a su raíz).
 */
export function BottomBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const nav = theme.components.navigationBar;
  return (
    <View testID="bottom-bar" style={styles.container}>
      <Divider />
      <View
        testID="navigation-bar"
        accessibilityRole="tablist"
        style={[styles.bar, { backgroundColor: nav.backgroundColor, minHeight: nav.height + insets.bottom, paddingBottom: insets.bottom }]}
      >
        {/* Orden de la marca (TABS), no el del navegador: Expo Router guarda las pestañas en su
            orden canónico y declararlas en otro orden hacía que despachara ROUTE_NAMES_CHANGED. */}
        {TABS.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.routeName);
          if (!route) return null;
          const active = state.routes[state.index]?.key === route.key;
          const color = active ? nav.selectedColor : nav.unselectedColor;
          const handlePress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={handlePress}
              style={[styles.tab, { height: nav.height }]}
            >
              <View style={styles.iconBox}>
                {active ? (
                  <View testID="tab-indicator" style={[styles.indicator, { backgroundColor: nav.indicatorColor }]} />
                ) : null}
                <Icon name={active ? tab.activeIcon : tab.icon} size={nav.iconSize} color={color} />
              </View>
              <Text
                numberOfLines={1}
                height={null}
                style={{
                  marginTop: 4,
                  fontSize: AppText.caption,
                  fontWeight: active ? nav.label.selectedWeight : nav.label.weight,
                  letterSpacing: 0,
                  color,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  bar: { flexDirection: 'row', width: '100%' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center' },
  indicator: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 },
});
