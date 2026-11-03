import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleError } from '../../src/hooks.client';

type Entrada = Parameters<typeof handleError>[0];
const entrada = (error: unknown, status: number): Entrada => ({ error, status, message: '', event: {} as Entrada['event'] });

afterEach(() => vi.restoreAllMocks());

describe('handleError del cliente', () => {
  it('un error inesperado se registra en la consola y la página de error recibe su texto legible', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = new Error('Boom');
    const r = handleError(entrada(e, 500));
    expect(consola).toHaveBeenCalledWith(e);
    expect(r).toEqual({ message: expect.any(String) });
  });

  it('una ruta que no existe (404) es esperada: la página de error la muestra sin llenar la consola', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = handleError(entrada(new Error('Not found: /'), 404));
    expect(consola).not.toHaveBeenCalled();
    expect(r).toEqual({ message: expect.any(String) });
  });
});
