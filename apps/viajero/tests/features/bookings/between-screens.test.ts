import {
  preloadBooking,
  returnResult,
  forgetPreloadedBooking,
  preloadedBooking,
  takeResult,
} from '@/features/bookings/between-screens';

import { reservaDePrueba } from '../../support/reservas-falsas';

/**
 * Lo que en Flutter viajaba con la navegación (`extra` al hacer `push` y el valor de `pop(true)`),
 * que Expo Router no tiene: la reserva adelantada y el «resultado al volver».
 */

afterEach(() => {
  forgetPreloadedBooking();
  takeResult('/reservas/res-1');
});

describe('reserva adelantada (el `extra` de go_router)', () => {
  test('solo vale para el id pedido', () => {
    const b = reservaDePrueba({ id: 'res-1' });
    preloadBooking(b);

    expect(preloadedBooking('res-1')).toBe(b);
    expect(preloadedBooking('otra')).toBeNull();
  });

  test('se puede leer más de una vez (render doble) y se olvida a pedido', () => {
    const b = reservaDePrueba({ id: 'res-1' });
    preloadBooking(b);
    expect(preloadedBooking('res-1')).toBe(b);
    expect(preloadedBooking('res-1')).toBe(b);

    forgetPreloadedBooking();
    expect(preloadedBooking('res-1')).toBeNull();
  });

  test('adelantar otra reemplaza a la anterior', () => {
    preloadBooking(reservaDePrueba({ id: 'res-1' }));
    preloadBooking(reservaDePrueba({ id: 'res-2' }));
    expect(preloadedBooking('res-1')).toBeNull();
    expect(preloadedBooking('res-2')?.id).toBe('res-2');
  });
});

describe('resultado al volver (el `pop(true)` de go_router)', () => {
  test('sin resultado: undefined (volvió sin decir nada)', () => {
    expect(takeResult('/reservas/res-1')).toBeUndefined();
  });

  test('tomarlo lo consume', () => {
    returnResult('/reservas/res-1', true);
    expect(takeResult('/reservas/res-1')).toBe(true);
    expect(takeResult('/reservas/res-1')).toBeUndefined();
  });

  test('cada pantalla tiene su propio resultado', () => {
    returnResult('/reservas/res-1', true);
    expect(takeResult('/resena/res-1')).toBeUndefined();
    expect(takeResult('/reservas/res-1')).toBe(true);
  });
});
