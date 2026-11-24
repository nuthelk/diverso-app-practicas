import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/**
 * Marcador de las pantallas que todavía no se portaron (T5/T6/T7 las reemplazan). Muestra el
 * nombre de la pantalla y los parámetros que recibió de la URL: sirve para comprobar que cada ruta
 * resuelve y llega con sus ids. Cuando no quede ningún placeholder, se borra.
 */
export function PantallaPendiente({ nombre, params = {} }: { nombre: string; params?: Record<string, unknown> }) {
  const tema = useTheme();
  const entradas = Object.entries(params);
  return (
    <SafeAreaView testID={`pantalla-${nombre}`} style={[estilos.pantalla, { backgroundColor: tema.fondoPagina }]}>
      <View style={estilos.centro}>
        <Text accessibilityRole="header" style={{ fontSize: AppText.encabezadoL, fontWeight: '800' }}>
          {nombre}
        </Text>
        {entradas.map(([clave, valor]) => (
          <Text key={clave} style={{ color: tema.colorScheme.onSurfaceVariant }}>
            {`${clave}: ${JSON.stringify(valor)}`}
          </Text>
        ))}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
});
