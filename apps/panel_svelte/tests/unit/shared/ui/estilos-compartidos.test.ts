import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Select from '$lib/shared/ui/Select.svelte';

// El estilo compartido vive solo en app.css, dentro de `@layer components`. El CSS de un `<style>` de componente queda
// fuera de toda capa y, por la cascada, gana a las utilidades de Tailwind (`w-[74px]`, `px-4`…) sin importar la
// especificidad: redeclarar `.campo` o `.btn` ahí rompe en silencio las utilidades que se le ponen a cada uso.
const fuentes = import.meta.glob('/src/**/*.svelte', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const COMPARTIDAS = ['campo', 'etiqueta-campo', 'etiqueta', 'switch', 'btn', 'tarjeta', 'chip', 'tabla', 'tabla-datos', 'franja', 'pildora'];

const estilosDe = (fuente: string) => [...fuente.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

describe('estilos compartidos', () => {
  it('ningún componente redeclara en su <style> una clase de app.css', () => {
    const duplicados = Object.entries(fuentes).flatMap(([ruta, fuente]) =>
      COMPARTIDAS.filter((clase) => new RegExp(String.raw`\.${clase}(?![\w-])`).test(estilosDe(fuente))).map((clase) => `${ruta}: .${clase}`),
    );
    expect(duplicados).toEqual([]);
  });
});

describe('Select', () => {
  afterEach(cleanup);

  // El formulario de plan se salía de la pantalla a 390 px (scrollWidth 422) por la fila «Duración» (cantidad + Select).
  // Con `.campo { min-width: 0 }` en app.css y `min-w-0` aquí, cualquiera de las dos guardas basta; jsdom no calcula
  // el layout, así que esto fija solo la guarda del componente (la medición real se hace en el navegador).
  it('puede encogerse dentro de una fila flex (min-w-0), como la de cantidad + unidad de la duración', () => {
    const { container } = render(Select, { opciones: [{ valor: 'dias', etiqueta: 'días' }], valor: 'dias', onchange: () => {} });
    expect(container.firstElementChild?.classList.contains('min-w-0')).toBe(true);
  });
});
