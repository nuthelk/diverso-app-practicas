import type { Dependencies } from '@/composition';

import { FakeAuth } from './fake-auth';

/**
 * Doble de un repositorio: lo que no se pasa en [partial] rechaza con «no implementado» al
 * llamarse (el `noSuchMethod` de los fakes de Dart). Así un test solo escribe lo que usa y una
 * llamada inesperada falla con un mensaje claro.
 */
export function stub<T extends object>(name: string, partial: Partial<T> = {}): T {
  return new Proxy(partial as T, {
    get(target, key, receiver) {
      if (key in target) return Reflect.get(target, key, receiver);
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return () => Promise.reject(new Error(`${name}.${key} no está implementado en el doble`));
    },
  });
}

/**
 * Dependencias completas para montar la app o una pantalla: FakeAuth con sesión al día y dobles
 * vacíos del resto (cada uno se puede reemplazar).
 */
export function testDependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return {
    auth: overrides.auth ?? new FakeAuth(),
    bookings: overrides.bookings ?? stub('BookingRepository'),
    catalog: overrides.catalog ?? stub('CatalogRepository'),
    reviews: overrides.reviews ?? stub('ReviewRepository'),
    gateway: overrides.gateway ?? stub('PaymentGateway'),
  };
}
