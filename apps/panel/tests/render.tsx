/**
 * Dibuja un componente dentro de un router en memoria, para probar pantallas que leen la ruta o navegan.
 *
 * Uso:
 *   const { ruta, irA } = renderConRuta(<LoginPage />, { ruta: '/login' });
 *   await vi.waitFor(() => expect(ruta()).toBe('/starter'));   // la pantalla navegó
 *   await irA('/ventas');                                        // simula que la persona navega
 *
 * El componente se dibuja en TODAS las rutas (`path: '*'`): navegar no lo desmonta, igual que en los tests originales,
 * donde el componente seguía montado y solo cambiaba la URL. Con `patron` se puede limitar a una ruta concreta
 * (por ejemplo `/planes/editar/:id?`) para probar un envoltorio que lee `useParams()`.
 */
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { act, render, type RenderResult } from '@testing-library/react';

export interface OpcionesRuta {
  /** Ruta inicial, sin `#` (por defecto `/`). */
  ruta?: string;
  /** Patrón de la ruta en la que se dibuja el componente (por defecto `*`: todas). */
  patron?: string;
}

export interface RenderConRuta extends RenderResult {
  /** El router en memoria, por si un test necesita mirar su estado completo. */
  router: ReturnType<typeof createMemoryRouter>;
  /** La ruta actual (`pathname`, sin `#` ni query): reemplaza a `expect(goto).toHaveBeenCalledWith('#/x')`. */
  ruta: () => string;
  /** Navega a otra ruta dentro de `act` (como lo haría un enlace). */
  irA: (ruta: string) => Promise<void>;
}

export function renderConRuta(ui: ReactElement, { ruta = '/', patron = '*' }: OpcionesRuta = {}): RenderConRuta {
  const router = createMemoryRouter([{ path: patron, element: ui }], { initialEntries: [ruta] });
  const resultado = render(<RouterProvider router={router} />);
  return {
    ...resultado,
    router,
    ruta: () => router.state.location.pathname,
    irA: async (destino) => {
      await act(() => router.navigate(destino));
    },
  };
}
