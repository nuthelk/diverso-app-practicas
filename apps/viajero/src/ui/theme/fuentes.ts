import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
  Roboto_800ExtraBold,
  Roboto_900Black,
} from '@expo-google-fonts/roboto';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

/**
 * Los pesos que usa la app (w400…w900). Roboto solo en Android y web: en iOS Flutter usa la
 * fuente del sistema (SF), y aquí también.
 */
const roboto = {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
  Roboto_800ExtraBold,
  Roboto_900Black,
};

export const fuentesDeLaApp = {
  ...(Platform.OS === 'ios' ? {} : roboto),
  ...MaterialIcons.font,
  ...MaterialCommunityIcons.font,
};

/**
 * Carga Roboto (Android/web) y las fuentes de íconos. Devuelve `[listas, error]` como `useFonts`;
 * la raíz no debería pintar texto hasta que `listas` sea true (o haya error: entonces RN usa la
 * fuente del sistema).
 */
export function useFuentesDiverso(): [boolean, Error | null] {
  return useFonts(fuentesDeLaApp);
}
