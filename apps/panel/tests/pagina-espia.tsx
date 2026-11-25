/**
 * Componente espía para reemplazar una página (o cualquier componente con export default) en un test: dibuja un
 * `<p data-pagina="nombre">` con sus props en JSON, y si recibe `children` los dibuja dentro de `<div data-envoltorio>`.
 *
 * Uso (el factory de `vi.mock` importa el helper adentro porque no puede usar variables del archivo):
 *   vi.mock('@/features/ventas/pages/VentasPage', async () => (await import('@tests/pagina-espia')).paginaEspia('ventas/pages/VentasPage'));
 *   expect(document.querySelector('[data-pagina="ventas/pages/VentasPage"]')).toBeTruthy();
 */
import type { ReactNode } from 'react';

export function paginaEspia(nombre: string) {
  function Espia({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) {
    return (
      <>
        <p data-pagina={nombre}>{JSON.stringify(props)}</p>
        {children !== undefined && <div data-envoltorio={nombre}>{children}</div>}
      </>
    );
  }
  return { default: Espia };
}

/** Las props con que se dibujó la página espía `nombre` (o null si no está en pantalla). */
export function propsDe(nombre: string): Record<string, unknown> | null {
  const el = document.querySelector(`[data-pagina="${nombre}"]`);
  return el ? JSON.parse(el.textContent ?? '{}') : null;
}
