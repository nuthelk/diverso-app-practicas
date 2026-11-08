import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Avatar from '$lib/shared/ui/Avatar.svelte';

afterEach(cleanup);

describe('Avatar', () => {
  it('Avatar: iniciales en la sans de la interfaz, helecho de fondo y esquina brote', () => {
    const { container } = render(Avatar, { iniciales: 'Río y Selva Colombia' });
    const av = container.firstElementChild as HTMLElement;
    expect(av.textContent).toBe('RY');
    expect(av.className).not.toContain('font-titulo');
    expect(av.className).toContain('bg-helecho');
    expect(av.className).toContain('rounded-brote');
  });
});
