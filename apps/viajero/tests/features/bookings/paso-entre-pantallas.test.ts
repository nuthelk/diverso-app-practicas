import {
  adelantarReserva,
  devolverResultado,
  olvidarReservaAdelantada,
  reservaAdelantada,
  tomarResultado,
} from '@/features/bookings/paso-entre-pantallas';

import { reservaDePrueba } from '../../support/reservas-falsas';

/**
 * Lo que en Flutter viajaba con la navegación (`extra` al hacer `push` y el valor de `pop(true)`),
 * que Expo Router no tiene: la reserva adelantada y el «resultado al volver».
 */

afterEach(() => {
  olvidarReservaAdelantada();
  tomarResultado('/reservas/res-1');
});

describe('reserva adelantada (el `extra` de go_router)', () => {
  test('solo vale para el id pedido', () => {
    const b = reservaDePrueba({ id: 'res-1' });
    adelantarReserva(b);

    expect(reservaAdelantada('res-1')).toBe(b);
    expect(reservaAdelantada('otra')).toBeNull();
  });

  test('se puede leer más de una vez (render doble) y se olvida a pedido', () => {
    const b = reservaDePrueba({ id: 'res-1' });
    adelantarReserva(b);
    expect(reservaAdelantada('res-1')).toBe(b);
    expect(reservaAdelantada('res-1')).toBe(b);

    olvidarReservaAdelantada();
    expect(reservaAdelantada('res-1')).toBeNull();
  });

  test('adelantar otra reemplaza a la anterior', () => {
    adelantarReserva(reservaDePrueba({ id: 'res-1' }));
    adelantarReserva(reservaDePrueba({ id: 'res-2' }));
    expect(reservaAdelantada('res-1')).toBeNull();
    expect(reservaAdelantada('res-2')?.id).toBe('res-2');
  });
});

describe('resultado al volver (el `pop(true)` de go_router)', () => {
  test('sin resultado: undefined (volvió sin decir nada)', () => {
    expect(tomarResultado('/reservas/res-1')).toBeUndefined();
  });

  test('tomarlo lo consume', () => {
    devolverResultado('/reservas/res-1', true);
    expect(tomarResultado('/reservas/res-1')).toBe(true);
    expect(tomarResultado('/reservas/res-1')).toBeUndefined();
  });

  test('cada pantalla tiene su propio resultado', () => {
    devolverResultado('/reservas/res-1', true);
    expect(tomarResultado('/resena/res-1')).toBeUndefined();
    expect(tomarResultado('/reservas/res-1')).toBe(true);
  });
});
