import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Tarjeta from '@/shared/ui/Tarjeta';

const contenido = <p>cuerpo</p>;
const enlace = <a href="#/ventas">Ver todo</a>;

afterEach(cleanup);

describe('Tarjeta', () => {
  it('con título es una región nombrada por su h2 y muestra la descripción', () => {
    render(
      <Tarjeta titulo="Este mes" descripcion="Por fecha de viaje">
        {contenido}
      </Tarjeta>,
    );
    const region = screen.getByRole('region', { name: 'Este mes' });
    expect(region.querySelector('h2')?.textContent).toBe('Este mes');
    expect(region.textContent).toContain('Por fecha de viaje');
    expect(region.textContent).toContain('cuerpo');
  });

  it('sin título se nombra con `etiqueta` y no inventa un encabezado', () => {
    render(<Tarjeta etiqueta="Totales">{contenido}</Tarjeta>);
    const region = screen.getByRole('region', { name: 'Totales' });
    expect(region.querySelector('h2')).toBeNull();
  });

  it('la acción va junto al título; sin título no se dibuja', () => {
    render(
      <Tarjeta titulo="Este mes" accion={enlace}>
        {contenido}
      </Tarjeta>,
    );
    expect(screen.getByRole('link', { name: 'Ver todo' })).toBeTruthy();
    cleanup();
    render(
      <Tarjeta etiqueta="Totales" accion={enlace}>
        {contenido}
      </Tarjeta>,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('dos tarjetas con título no comparten el id de su encabezado', () => {
    render(<Tarjeta titulo="Uno">{contenido}</Tarjeta>);
    render(<Tarjeta titulo="Dos">{contenido}</Tarjeta>);
    const ids = screen.getAllByRole('heading', { level: 2 }).map((h) => h.id);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getByRole('region', { name: 'Dos' })).toBeTruthy();
  });
});
