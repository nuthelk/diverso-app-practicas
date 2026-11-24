import { ActivityIndicator } from 'react-native';

import { useTheme } from '@/ui/theme';

/**
 * Indicador de progreso dentro de un botón mientras se envía (`SizedBox(19 × 19,
 * CircularProgressIndicator(strokeWidth: 2))`, color primary por defecto de M3).
 */
export function GiradorDeBoton() {
  const cs = useTheme().colorScheme;
  return <ActivityIndicator testID="girador-de-boton" size="small" color={cs.primary} style={{ width: 19, height: 19 }} />;
}
