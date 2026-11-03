import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import PageHeader from '$lib/shared/ui/PageHeader.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

afterEach(cleanup);

describe('PageHeader', () => {
  it('es el h1 de la pantalla, con su línea de contexto y la acción principal', () => {
    render(PageHeader, {
      titulo: 'Mis planes',
      contexto: snippet('<span>3 planes · 2 publicados</span>'),
      accion: snippet('<a href="#/planes/nuevo">Nuevo plan</a>'),
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mis planes');
    expect(screen.getByText('3 planes · 2 publicados')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Nuevo plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });

  it('sin contexto ni acción solo dibuja el título', () => {
    const { container } = render(PageHeader, { titulo: 'Mis planes' });
    expect(container.querySelector('p')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('el enlace de volver apunta a la lista y va antes del título', () => {
    render(PageHeader, { titulo: 'Editar plan', atras: { href: '#/planes', texto: 'Volver' } });
    const volver = screen.getByRole('link', { name: 'Volver' });
    expect(volver.getAttribute('href')).toBe('#/planes');
    expect(volver.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lo que va «junto» al título (una píldora de estado) queda dentro de la misma cabecera', () => {
    const { container } = render(PageHeader, { titulo: 'Liquidación', junto: snippet('<span>Pendiente</span>') });
    expect(container.querySelector('header')?.textContent).toContain('Pendiente');
  });
});
