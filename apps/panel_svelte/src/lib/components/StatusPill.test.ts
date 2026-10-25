import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import StatusPill from './StatusPill.svelte';

function pill(estado: string): HTMLElement {
  const { container } = render(StatusPill, { estado });
  return container.querySelector('span') as HTMLElement;
}

describe('StatusPill', () => {
  it.each([
    ['verificado', 'Verificada', 'text-ok-500'],
    ['rechazado', 'Rechazada', 'text-red-600'],
    ['pendiente', 'Pendiente', 'text-orange-600'],
    ['confirmada', 'Confirmada', 'text-ok-500'],
    ['pendiente_pago', 'Pendiente', 'text-orange-600'],
    ['cancelada', 'Cancelada', 'text-red-600'],
    ['completada', 'Completada', 'text-slate-500'],
    ['publicado', 'Publicado', 'text-ok-500'],
    ['borrador', 'Borrador', 'text-slate-500'],
    ['aprobado', 'Aprobado', 'text-ok-500'],
    ['reembolsado', 'Reembolsado', 'text-slate-500'],
    ['vigente', 'RNT vigente', 'text-ok-500'],
    ['por_vencer', 'RNT por vencer', 'text-orange-600'],
    ['vencido', 'RNT vencido', 'text-red-600'],
    ['sin_vigencia', 'Sin vigencia', 'text-red-600'],
  ])('«%s» se muestra como «%s» con su color', (estado, texto, color) => {
    const el = pill(estado);
    expect(el.textContent?.trim()).toBe(texto);
    expect(el.className).toContain(color);
  });

  it('un estado desconocido se muestra tal cual en gris', () => {
    const el = pill('en_revision');
    expect(el.textContent?.trim()).toBe('en_revision');
    expect(el.className).toContain('text-slate-500');
  });
});
