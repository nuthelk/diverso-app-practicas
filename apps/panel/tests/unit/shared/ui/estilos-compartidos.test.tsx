import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import Select from '@/shared/ui/Select';

// El estilo compartido vive solo en app.css, dentro de `@layer components`. Un CSS propio de un componente (un `<style>`
// dentro del JSX o una hoja `.css` importada por el componente) queda fuera de toda capa y, por la cascada, gana a las
// utilidades de Tailwind (`w-[74px]`, `px-4`…) sin importar la especificidad: redeclarar `.campo` o `.btn` ahí rompe en
// silencio las utilidades que se le ponen a cada uso. (En Svelte el riesgo era el bloque `<style>` del componente.)
const componentes = import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const hojas = import.meta.glob(['/src/**/*.css', '!/src/app.css', '!/src/fuentes.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const COMPARTIDAS = ['campo', 'etiqueta-campo', 'etiqueta', 'switch', 'btn', 'tarjeta', 'chip', 'tabla', 'tabla-datos', 'franja', 'pildora'];

const estilosDe = (fuente: string) => [...fuente.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

describe('estilos compartidos', () => {
  it('ningún componente redeclara en su <style> (ni en una hoja propia) una clase de app.css', () => {
    const fuentes = [
      ...Object.entries(componentes).map(([ruta, fuente]) => [ruta, estilosDe(fuente)] as const),
      ...Object.entries(hojas),
    ];
    const duplicados = fuentes.flatMap(([ruta, css]) =>
      COMPARTIDAS.filter((clase) => new RegExp(String.raw`\.${clase}(?![\w-])`).test(css)).map((clase) => `${ruta}: .${clase}`),
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
    const { container } = render(<Select opciones={[{ valor: 'dias', etiqueta: 'días' }]} valor="dias" onchange={() => {}} />);
    expect(container.firstElementChild?.classList.contains('min-w-0')).toBe(true);
  });
});
