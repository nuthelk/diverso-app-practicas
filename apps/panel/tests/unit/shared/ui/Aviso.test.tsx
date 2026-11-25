import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Aviso from '@/shared/ui/Aviso';
import { ICONOS } from '@/shared/ui/iconos';

const texto = <span>Revisa tu RNT</span>;
const boton = <button>Ver</button>;
const trazo = (c: HTMLElement) => c.querySelector('svg path')?.getAttribute('d');

afterEach(cleanup);

describe('Aviso', () => {
  it('muestra el mensaje y pasa el rol que le den (nota, alerta…)', () => {
    render(<Aviso role="note">{texto}</Aviso>);
    expect(screen.getByRole('note').textContent).toContain('Revisa tu RNT');
  });

  it.each([
    ['info', ICONOS.info],
    ['alerta', ICONOS.alerta],
    ['error', ICONOS.alerta],
  ] as const)('el tono «%s» lleva su ícono: una información no se dibuja como advertencia', (tono, esperado) => {
    const { container } = render(<Aviso tono={tono}>{texto}</Aviso>);
    expect(trazo(container)).toBe(esperado);
  });

  it('la acción aparece solo si se entrega', () => {
    render(<Aviso>{texto}</Aviso>);
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    render(<Aviso accion={boton}>{texto}</Aviso>);
    expect(screen.getByRole('button', { name: 'Ver' })).toBeTruthy();
  });
});
