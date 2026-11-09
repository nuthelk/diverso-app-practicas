import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { agencia, texto } from '$tests/fixtures';

vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
  subirLogo: vi.fn(),
  quitarLogo: vi.fn(),
}));

import { miAgencia, quitarLogo, subirLogo } from '$lib/features/agencias/api/agencias.api';
import { cambiosAgencia } from '$lib/features/agencias/model/cambios-agencia.svelte';
import PerfilAgenciaPage from '$lib/features/agencias/pages/PerfilAgenciaPage.svelte';

const URL_LOGO = 'http://127.0.0.1:54331/storage/v1/object/public/agency-logos/ag-1/logo-abc.png';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

async function pintar(parcial = {}) {
  vi.mocked(miAgencia).mockResolvedValue(agencia({ id: 'ag-1', ...parcial }));
  const r = render(PerfilAgenciaPage);
  await screen.findByRole('heading', { level: 1, name: 'Perfil de la agencia' });
  return r;
}

/** El valor (dd) que acompaña a un término (dt) de la lista de datos. */
const dato = (etiqueta: string) => {
  const dt = [...document.querySelectorAll('dl dt')].find((x) => texto(x) === etiqueta);
  expect(dt, `dato «${etiqueta}»`).toBeTruthy();
  return texto(dt!.nextElementSibling);
};

describe('PerfilAgenciaPage · datos', () => {
  it('título «Perfil de la agencia» y dos tarjetas con encabezado: Logo y Datos de la agencia', async () => {
    await pintar();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Logo' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Datos de la agencia' })).toBeTruthy();
  });

  it('muestra lo registrado en una lista de definiciones, sin ningún campo editable', async () => {
    const { container } = await pintar({ descripcion: 'Tours de grafiti y café.', whatsapp: '3009876543' });
    expect(container.querySelectorAll('dl')).toHaveLength(1);
    expect(dato('Nombre')).toBe('Aventuras Antioquia');
    expect(dato('Verificación')).toBe('Verificada');
    expect(dato('Número de RNT')).toBe('123456');
    expect(dato('Matrícula mercantil')).toBe('987654');
    expect(dato('Ciudad')).toBe('Medellín');
    expect(dato('Correo de contacto')).toBe('hola@aventuras.co');
    expect(dato('Teléfono')).toBe('3001234567');
    expect(dato('WhatsApp')).toBe('3009876543');
    expect(dato('Descripción')).toBe('Tours de grafiti y café.');
    expect(container.querySelector('dl input, dl textarea, dl select, dl button')).toBeNull();
  });

  it('la vigencia del RNT sale con la misma frase que ve el admin', async () => {
    await pintar({ rnt_vigente_hasta: '2027-03-31' });
    expect(dato('Vigencia del RNT')).toBe('RNT vigente hasta el 31 de marzo de 2027');
  });

  it('una agencia sin vigencia, pendiente o con campos vacíos lo dice en vez de dejar un hueco', async () => {
    await pintar({ rnt_vigente_hasta: null, estado_verificacion: 'pendiente', whatsapp: '', descripcion: '' });
    expect(dato('Vigencia del RNT')).toBe('Sin vigencia registrada');
    expect(dato('Verificación')).toBe('Pendiente');
    expect(dato('WhatsApp')).toBe('No registrado');
    expect(dato('Descripción')).toBe('No registrado');
  });
});

describe('PerfilAgenciaPage · logo', () => {
  it('usa el control del logo: sin logo, iniciales y «Subir logo»', async () => {
    await pintar();
    expect(screen.getByRole('img', { name: 'Iniciales de Aventuras Antioquia' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subir logo' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Quitar logo' })).toBeNull();
  });

  it('cambiar el logo llama a subirLogo con la agencia y el archivo, y la imagen nueva se ve', async () => {
    vi.mocked(subirLogo).mockResolvedValue(URL_LOGO);
    await pintar();
    const archivo = new File([new Uint8Array(1000)], 'logo.png', { type: 'image/png' });
    await fireEvent.change(screen.getByLabelText('Archivo del logo'), { target: { files: [archivo] } });
    const img = (await screen.findByRole('img', { name: 'Logo de Aventuras Antioquia' })) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(URL_LOGO);
    expect(subirLogo).toHaveBeenCalledWith(expect.objectContaining({ id: 'ag-1' }), archivo);
  });

  it('subir o quitar el logo avisa al marco que la agencia cambió', async () => {
    vi.mocked(subirLogo).mockResolvedValue(URL_LOGO);
    vi.mocked(quitarLogo).mockResolvedValue();
    await pintar();
    const antes = cambiosAgencia.version;
    const archivo = new File([new Uint8Array(1000)], 'logo.png', { type: 'image/png' });
    await fireEvent.change(screen.getByLabelText('Archivo del logo'), { target: { files: [archivo] } });
    await screen.findByRole('img', { name: 'Logo de Aventuras Antioquia' });
    expect(cambiosAgencia.version).toBe(antes + 1);
    await fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));
    await screen.findByRole('img', { name: 'Iniciales de Aventuras Antioquia' });
    expect(cambiosAgencia.version).toBe(antes + 2);
  });

  it('quitar el logo llama a quitarLogo con el logo vigente y vuelve a las iniciales', async () => {
    vi.mocked(quitarLogo).mockResolvedValue();
    await pintar({ logo_url: URL_LOGO });
    await fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));
    await screen.findByRole('img', { name: 'Iniciales de Aventuras Antioquia' });
    expect(quitarLogo).toHaveBeenCalledWith(expect.objectContaining({ id: 'ag-1', logo_url: URL_LOGO }));
    expect(screen.queryByRole('button', { name: 'Quitar logo' })).toBeNull();
  });

  it('cambiar el logo no toca los datos que se ven', async () => {
    vi.mocked(subirLogo).mockResolvedValue(URL_LOGO);
    await pintar();
    await fireEvent.change(screen.getByLabelText('Archivo del logo'), {
      target: { files: [new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' })] },
    });
    await screen.findByRole('img', { name: 'Logo de Aventuras Antioquia' });
    expect(dato('Nombre')).toBe('Aventuras Antioquia');
    expect(dato('Número de RNT')).toBe('123456');
  });
});

describe('PerfilAgenciaPage · estados', () => {
  it('cargando: marcadores con estado «Cargando» y ni datos ni logo todavía', () => {
    vi.mocked(miAgencia).mockReturnValue(new Promise(() => {}));
    render(PerfilAgenciaPage);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Datos de la agencia' })).toBeNull();
    expect(screen.queryByLabelText('Archivo del logo')).toBeNull();
  });

  it('error: muestra el mensaje en una alerta y «Reintentar» vuelve a pedir la agencia', async () => {
    vi.mocked(miAgencia).mockRejectedValueOnce(new Error('No hay conexión con el servidor.'));
    render(PerfilAgenciaPage);
    const alerta = await screen.findByRole('alert');
    expect(texto(alerta)).toContain('No hay conexión con el servidor');
    expect(screen.queryByRole('heading', { name: 'Datos de la agencia' })).toBeNull();

    vi.mocked(miAgencia).mockResolvedValueOnce(agencia());
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Datos de la agencia' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(miAgencia).toHaveBeenCalledTimes(2);
  });
});

describe('PerfilAgenciaPage · datos que la base permite vacíos', () => {
  it('teléfono, correo y WhatsApp en null (columnas opcionales) dicen «No registrado» y la página no se cae', async () => {
    await pintar({ telefono: null, email: null, whatsapp: null });
    expect(dato('Teléfono')).toBe('No registrado');
    expect(dato('Correo de contacto')).toBe('No registrado');
    expect(dato('WhatsApp')).toBe('No registrado');
  });
});
