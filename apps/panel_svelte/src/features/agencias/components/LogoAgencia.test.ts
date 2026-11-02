import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, texto } from '@/test/fixtures';
import { colorDeAgencia } from '../logo';

vi.mock('../agencias.api', () => ({
  subirLogo: vi.fn(),
  quitarLogo: vi.fn(),
}));

import { quitarLogo, subirLogo } from '../agencias.api';
import LogoAgencia from './LogoAgencia.svelte';

const subirMock = vi.mocked(subirLogo);
const quitarMock = vi.mocked(quitarLogo);

const URL_LOGO = 'http://127.0.0.1:54331/storage/v1/object/public/agency-logos/ag-1/logo-abc.png';
const MB = 1024 * 1024;

const archivo = (type = 'image/png', size = 1000) => new File([new Uint8Array(size)], 'logo', { type });

function pintar(logo_url: string | null = null) {
  const onactualizado = vi.fn();
  const ag = agencia({ id: 'ag-1', logo_url });
  const r = render(LogoAgencia, { agencia: ag, onactualizado });
  return { ...r, onactualizado, ag };
}

async function elegir(f: File) {
  const input = screen.getByLabelText('Archivo del logo') as HTMLInputElement;
  await fireEvent.change(input, { target: { files: [f] } });
}

afterEach(() => vi.resetAllMocks());

describe('LogoAgencia — estados', () => {
  it('sin logo muestra las iniciales sobre el color de la agencia y ofrece «Subir logo»', () => {
    const { container } = pintar();
    expect(screen.getByRole('heading', { name: 'Logo' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Logo de/ })).toBeNull();
    const iniciales = screen.getByRole('img', { name: 'Iniciales de Aventuras Antioquia' });
    expect(texto(iniciales)).toBe('AA');
    expect((iniciales as HTMLElement).style.backgroundColor).not.toBe('');
    expect(colorDeAgencia('ag-1')).toMatch(/^#/);
    expect(screen.getByRole('button', { name: 'Subir logo' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Quitar logo' })).toBeNull();
    expect(texto(container)).toContain('PNG, JPG o WebP');
    expect(texto(container)).toContain('2 MB');
  });

  it('con logo muestra la imagen y ofrece reemplazar y quitar', () => {
    pintar(URL_LOGO);
    const img = screen.getByRole('img', { name: 'Logo de Aventuras Antioquia' }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(URL_LOGO);
    expect(screen.getByRole('button', { name: 'Reemplazar logo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar logo' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Subir logo' })).toBeNull();
  });

  it('si la imagen no carga, vuelve a las iniciales', async () => {
    pintar(URL_LOGO);
    await fireEvent.error(screen.getByRole('img', { name: 'Logo de Aventuras Antioquia' }));
    expect(screen.getByRole('img', { name: 'Iniciales de Aventuras Antioquia' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: /^Logo de/ })).toBeNull();
  });

  it('el selector solo admite png, jpeg y webp', () => {
    pintar();
    expect((screen.getByLabelText('Archivo del logo') as HTMLInputElement).accept).toBe(
      'image/png,image/jpeg,image/webp',
    );
  });
});

describe('LogoAgencia — validación antes de subir', () => {
  it.each([['image/gif'], ['image/svg+xml'], ['application/pdf']])('rechaza %s sin subir nada', async (tipo) => {
    const { onactualizado } = pintar();
    await elegir(archivo(tipo));
    expect((await screen.findByRole('alert')).textContent).toContain('El logo debe ser una imagen PNG, JPG o WebP.');
    expect(subirMock).not.toHaveBeenCalled();
    expect(onactualizado).not.toHaveBeenCalled();
  });

  it('rechaza más de 2 MB sin subir nada', async () => {
    const { onactualizado } = pintar();
    await elegir(archivo('image/png', 2 * MB + 1));
    expect((await screen.findByRole('alert')).textContent).toContain('pesa 2.0 MB y el máximo es 2 MB');
    expect(subirMock).not.toHaveBeenCalled();
    expect(onactualizado).not.toHaveBeenCalled();
  });

  it('un archivo válido después de un error limpia el aviso', async () => {
    subirMock.mockResolvedValue(URL_LOGO);
    pintar();
    await elegir(archivo('image/gif'));
    await screen.findByRole('alert');
    await elegir(archivo('image/png'));
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

describe('LogoAgencia — subir, reemplazar y quitar', () => {
  it('sube el archivo para esta agencia y avisa con la URL nueva', async () => {
    subirMock.mockResolvedValue(URL_LOGO);
    const { onactualizado, ag } = pintar();
    const f = archivo('image/webp');
    await elegir(f);
    await vi.waitFor(() => expect(onactualizado).toHaveBeenCalledWith(URL_LOGO));
    expect(subirMock).toHaveBeenCalledWith(ag, f);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mientras sube, bloquea los botones y lo dice; al terminar los libera', async () => {
    let terminar!: (url: string) => void;
    subirMock.mockReturnValue(new Promise<string>((r) => (terminar = r)));
    pintar(URL_LOGO);
    await elegir(archivo());

    const subiendo = (await screen.findByRole('button', { name: 'Subiendo…' })) as HTMLButtonElement;
    expect(subiendo.disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Quitar logo' }) as HTMLButtonElement).disabled).toBe(true);

    terminar(URL_LOGO);
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Reemplazar logo' })).toBeTruthy());
    expect((screen.getByRole('button', { name: 'Reemplazar logo' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('si la subida falla muestra el mensaje y no cambia el logo', async () => {
    subirMock.mockRejectedValue(new Error('La imagen supera el máximo de 2 MB.'));
    const { onactualizado } = pintar(URL_LOGO);
    await elegir(archivo());
    expect((await screen.findByRole('alert')).textContent).toContain('La imagen supera el máximo de 2 MB.');
    expect(onactualizado).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Logo de Aventuras Antioquia' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Reemplazar logo' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('«Quitar logo» lo quita para esta agencia y avisa con null', async () => {
    quitarMock.mockResolvedValue();
    const { onactualizado, ag } = pintar(URL_LOGO);
    await fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));
    await vi.waitFor(() => expect(onactualizado).toHaveBeenCalledWith(null));
    expect(quitarMock).toHaveBeenCalledWith(ag);
  });

  it('si quitar falla muestra el mensaje y no cambia el logo', async () => {
    quitarMock.mockRejectedValue(new Error('No hay conexión con el servidor. Verifica que el backend esté encendido.'));
    const { onactualizado } = pintar(URL_LOGO);
    await fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));
    expect((await screen.findByRole('alert')).textContent).toContain('No hay conexión con el servidor');
    expect(onactualizado).not.toHaveBeenCalled();
  });
});
