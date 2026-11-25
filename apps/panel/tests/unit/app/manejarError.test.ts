import { afterEach, describe, expect, it, vi } from 'vitest';
import { manejarError } from '@/app/manejarError';

// Era `tests/unit/hooks.client.test.ts` (el `handleError` de SvelteKit); la entrada se reduce a lo que se usa: error y estado.
const entrada = (error: unknown, status: number) => ({ error, status });

afterEach(() => vi.restoreAllMocks());

describe('handleError del cliente', () => {
  it('un error inesperado se registra en la consola y la página de error recibe su texto legible', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = new Error('Boom');
    const r = manejarError(entrada(e, 500));
    expect(consola).toHaveBeenCalledWith(e);
    expect(r).toEqual({ message: expect.any(String) });
  });

  it('una ruta que no existe (404) es esperada: la página de error la muestra sin llenar la consola', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = manejarError(entrada(new Error('Not found: /'), 404));
    expect(consola).not.toHaveBeenCalled();
    expect(r).toEqual({ message: expect.any(String) });
  });
});
