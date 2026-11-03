import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Aviso from '$lib/shared/ui/Aviso.svelte';
import { ICONOS } from '$lib/shared/ui/iconos';

const texto = createRawSnippet(() => ({ render: () => '<span>Revisa tu RNT</span>' }));
const boton = createRawSnippet(() => ({ render: () => '<button>Ver</button>' }));
const trazo = (c: HTMLElement) => c.querySelector('svg path')?.getAttribute('d');

afterEach(cleanup);

describe('Aviso', () => {
  it('muestra el mensaje y pasa el rol que le den (nota, alerta…)', () => {
    render(Aviso, { children: texto, role: 'note' });
    expect(screen.getByRole('note').textContent).toContain('Revisa tu RNT');
  });

  it.each([
    ['info', ICONOS.info],
    ['alerta', ICONOS.alerta],
    ['error', ICONOS.alerta],
  ] as const)('el tono «%s» lleva su ícono: una información no se dibuja como advertencia', (tono, esperado) => {
    const { container } = render(Aviso, { tono, children: texto });
    expect(trazo(container)).toBe(esperado);
  });

  it('la acción aparece solo si se entrega', () => {
    render(Aviso, { children: texto });
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    render(Aviso, { children: texto, accion: boton });
    expect(screen.getByRole('button', { name: 'Ver' })).toBeTruthy();
  });
});
