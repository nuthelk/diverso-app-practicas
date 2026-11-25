import * as core from '@/core';
import type { BookingRepository, Publico } from '@/core';

test('el barril expone modelos, errores, utils y repositorios sin cargar el cliente nativo', () => {
  expect(core.Plan).toBeDefined();
  expect(core.DiversoError).toBeDefined();
  expect(core.formatCOP(165000)).toBe('$ 165.000');
  expect(core.VERSION_LEGAL).toBe('v2-2026-10');
  expect(core.BookingRepository).toBeDefined();
  expect(core.WompiPaymentGateway).toBeDefined();
  expect('crearClienteSupabase' in core).toBe(false);
});

test('Publico<T> permite un repositorio falso sin heredar de la clase', async () => {
  const falso: Publico<BookingRepository> = {
    crearReserva: jest.fn(),
    misReservas: async () => [],
    reserva: jest.fn(),
    reservaPendiente: async () => null,
    vistaPreviaCancelacion: jest.fn(),
    cancelar: jest.fn(),
  };
  expect(await falso.misReservas()).toEqual([]);
});
