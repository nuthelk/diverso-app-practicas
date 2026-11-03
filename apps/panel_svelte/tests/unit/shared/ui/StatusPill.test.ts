import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import StatusPill from '$lib/shared/ui/StatusPill.svelte';

function pill(estado: string): HTMLElement {
  const { container } = render(StatusPill, { estado });
  return container.querySelector('span') as HTMLElement;
}

describe('StatusPill', () => {
  it.each([
    ['verificado', 'Verificada', 'pildora-ok'],
    ['rechazado', 'Rechazada', 'pildora-error'],
    ['pendiente', 'Pendiente', 'pildora-alerta'],
    ['en_verificacion', 'En verificación', 'pildora-alerta'],
    ['confirmada', 'Confirmada', 'pildora-ok'],
    ['pendiente_pago', 'Pendiente', 'pildora-alerta'],
    ['cancelada', 'Cancelada', 'pildora-error'],
    ['completada', 'Completada', 'pildora-neutra'],
    ['publicado', 'Publicado', 'pildora-ok'],
    ['borrador', 'Borrador', 'pildora-neutra'],
    ['aprobado', 'Aprobado', 'pildora-ok'],
    ['reembolsado', 'Reembolsado', 'pildora-neutra'],
    ['pagada_prueba', 'Pagada (prueba)', 'pildora-ok'],
    ['anulada', 'Anulada', 'pildora-neutra'],
    ['compensada', 'Compensada', 'pildora-neutra'],
    ['sin_saldo', 'Sin saldo', 'pildora-neutra'],
    ['vigente', 'RNT vigente', 'pildora-ok'],
    ['por_vencer', 'RNT por vencer', 'pildora-alerta'],
    ['vencido', 'RNT vencido', 'pildora-error'],
    ['sin_vigencia', 'Sin vigencia', 'pildora-error'],
  ])('«%s» se muestra como «%s» con su color', (estado, texto, color) => {
    const el = pill(estado);
    expect(el.textContent?.trim()).toBe(texto);
    expect(el.className).toContain(color);
  });

  it('un estado desconocido se muestra tal cual en tono neutro', () => {
    const el = pill('en_revision');
    expect(el.textContent?.trim()).toBe('en_revision');
    expect(el.className).toContain('pildora-neutra');
  });
});
