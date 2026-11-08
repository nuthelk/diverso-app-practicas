import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { cleanup, render, screen } from '@testing-library/svelte';
import Campo, { type AtributosCampo } from '$lib/shared/ui/Campo.svelte';
import AlertaError from '$lib/shared/ui/AlertaError.svelte';

afterEach(cleanup);

/** El control recibe los atributos de accesibilidad que arma el Campo. */
const control = createRawSnippet<[AtributosCampo]>((atributos) => ({
  render: () => {
    const attrs = Object.entries(atributos())
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return `<input class="campo" ${attrs} />`;
  },
}));

describe('Campo', () => {
  it('la etiqueta nombra el control', () => {
    render(Campo, { etiqueta: 'Nombre del titular', control });
    expect(screen.getByRole('textbox', { name: 'Nombre del titular' })).toBeTruthy();
  });

  it('sin ayuda ni error el control no apunta a descripciones y no es inválido', () => {
    render(Campo, { etiqueta: 'Nombre', control });
    const campo = screen.getByRole('textbox');
    expect(campo.getAttribute('aria-describedby')).toBeNull();
    expect(campo.getAttribute('aria-invalid')).toBeNull();
  });

  it('la ayuda se lee como descripción del control', () => {
    render(Campo, { etiqueta: 'Número de cuenta', ayuda: 'Solo números, sin guiones', control });
    const id = screen.getByRole('textbox').getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toBe('Solo números, sin guiones');
  });

  it('el error marca el control como inválido, se anuncia y se suma a la descripción', () => {
    render(Campo, { etiqueta: 'Número de cuenta', ayuda: 'Solo números', error: 'Faltan dígitos', control });
    const campo = screen.getByRole('textbox');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    const alerta = screen.getByRole('alert');
    expect(alerta.textContent).toContain('Faltan dígitos');
    const ids = campo.getAttribute('aria-describedby')!.split(' ');
    expect(ids).toHaveLength(2);
    expect(ids).toContain(alerta.id);
    expect(ids.map((i) => document.getElementById(i)?.textContent)).toEqual(expect.arrayContaining(['Solo números']));
  });

  it('dos campos no comparten ids', () => {
    render(Campo, { etiqueta: 'Uno', ayuda: 'a', control });
    render(Campo, { etiqueta: 'Dos', ayuda: 'b', control });
    const ids = screen.getAllByRole('textbox').map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getByRole('textbox', { name: 'Dos' })).toBeTruthy();
  });
});

describe('AlertaError', () => {
  it('anuncia el mensaje como alerta', () => {
    const texto = createRawSnippet(() => ({ render: () => '<span>No pudimos guardar el plan</span>' }));
    render(AlertaError, { children: texto });
    expect(screen.getByRole('alert').textContent).toContain('No pudimos guardar el plan');
  });

  it('no depende solo del color: lleva un ícono decorativo junto al texto', () => {
    const texto = createRawSnippet(() => ({ render: () => '<span>Error</span>' }));
    const { container } = render(AlertaError, { children: texto });
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
