import type { Dependencias } from '@/composition';

import { AuthFalso } from './auth-falso';

/**
 * Doble de un repositorio: lo que no se pasa en [parcial] rechaza con «no implementado» al
 * llamarse (el `noSuchMethod` de los fakes de Dart). Así un test solo escribe lo que usa y una
 * llamada inesperada falla con un mensaje claro.
 */
export function doble<T extends object>(nombre: string, parcial: Partial<T> = {}): T {
  return new Proxy(parcial as T, {
    get(objetivo, clave, receptor) {
      if (clave in objetivo) return Reflect.get(objetivo, clave, receptor);
      if (typeof clave === 'symbol' || clave === 'then') return undefined;
      return () => Promise.reject(new Error(`${nombre}.${clave} no está implementado en el doble`));
    },
  });
}

/**
 * Dependencias completas para montar la app o una pantalla: AuthFalso con sesión al día y dobles
 * vacíos del resto (cada uno se puede reemplazar).
 */
export function dependenciasDePrueba(otras: Partial<Dependencias> = {}): Dependencias {
  return {
    auth: otras.auth ?? new AuthFalso(),
    reservas: otras.reservas ?? doble('BookingRepository'),
    catalogo: otras.catalogo ?? doble('CatalogRepository'),
    resenas: otras.resenas ?? doble('ReviewRepository'),
    pasarela: otras.pasarela ?? doble('PaymentGateway'),
  };
}
