import { Image } from 'react-native';

const logo = require('@/assets/logo_diverso.png');

/**
 * Marca de Diverso (colibrí): la máscara `logo_diverso.png` (negro + alfa) teñida con [color]
 * (`BlendMode.srcIn` = `tintColor`). Decorativa: sin semántica. El contenedor (caja, esquinas)
 * lo pone cada pantalla.
 */
export function DiversoLogo({ color = '#FFFFFF', size = 48 }: { color?: string; size?: number }) {
  return (
    <Image
      testID="diverso-logo"
      source={logo}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
