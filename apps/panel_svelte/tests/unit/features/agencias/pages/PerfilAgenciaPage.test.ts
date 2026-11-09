import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { agencia, texto } from '$tests/fixtures';

vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
  subirLogo: vi.fn(),
  quitarLogo: vi.fn(),
  actualizarDatosAgencia: vi.fn(),
}));
vi.mock('$lib/shared/lib/confirmar.svelte', () => ({ confirmar: vi.fn() }));

import { actualizarDatosAgencia, miAgencia, quitarLogo, subirLogo } from '$lib/features/agencias/api/agencias.api';
import { confirmar } from '$lib/shared/lib/confirmar.svelte';
import { toast } from '$lib/shared/lib/toast.svelte';
import { cambiosAgencia } from '$lib/features/agencias/model/cambios-agencia.svelte';
import PerfilAgenciaPage from '$lib/features/agencias/pages/PerfilAgenciaPage.svelte';

const URL_LOGO = 'http://127.0.0.1:54331/storage/v1/object/public/agency-logos/ag-1/logo-abc.png';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  toast.mensaje = '';
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

describe('PerfilAgenciaPage · editar los datos', () => {
  const editar = () => fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
  const campo = (nombre: string | RegExp) => screen.getByLabelText(nombre) as HTMLInputElement;
  const escribir = (nombre: string | RegExp, value: string) => fireEvent.input(campo(nombre), { target: { value } });
  const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  const cancelar = () => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  const formulario = () => document.querySelector('form') as HTMLFormElement;

  it('«Editar datos» abre el formulario con lo registrado, enfoca el primer campo y oculta la lista de lectura', async () => {
    await pintar({ descripcion: 'Tours de grafiti y café.', whatsapp: '3009876543' });
    await editar();
    expect(campo('Nombre de la agencia').value).toBe('Aventuras Antioquia');
    expect(campo('Ciudad').value).toBe('Medellín');
    expect(campo('Teléfono').value).toBe('3001234567');
    expect(campo('Correo de contacto').value).toBe('hola@aventuras.co');
    expect(campo(/^WhatsApp/).value).toBe('3009876543');
    expect(campo(/^Descripción/).value).toBe('Tours de grafiti y café.');
    await vi.waitFor(() => expect(document.activeElement).toBe(campo('Nombre de la agencia')));
    expect(screen.queryByRole('button', { name: 'Editar datos' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('el formulario dice qué ven los viajeros y que el RNT y la matrícula no se pueden cambiar', async () => {
    await pintar();
    await editar();
    const visible = texto(formulario().closest('section'));
    expect(visible).toContain('Los viajeros ven el nombre, la ciudad y la descripción de tu agencia.');
    expect(visible).toContain('No se pueden cambiar desde aquí');
  });

  it('el RNT y la matrícula se ven pero no hay ningún campo para ellos', async () => {
    await pintar();
    await editar();
    expect(dato('Número de RNT')).toBe('123456');
    expect(dato('Matrícula mercantil')).toBe('987654');
    expect(screen.queryByLabelText(/RNT/)).toBeNull();
    expect(screen.queryByLabelText(/Matrícula/)).toBeNull();
    expect(formulario().querySelectorAll('input, textarea, select')).toHaveLength(6);
  });

  it('guardar manda solo los seis datos, recortados y con el WhatsApp vacío como null, y muestra lo nuevo', async () => {
    vi.mocked(actualizarDatosAgencia).mockResolvedValue();
    await pintar({ descripcion: 'Vieja.' });
    const antes = cambiosAgencia.version;
    await editar();
    await escribir('Nombre de la agencia', '  Aventuras del Norte ');
    await escribir('Ciudad', 'Bogotá');
    await escribir('Teléfono', '3110000000');
    await escribir('Correo de contacto', 'nuevo@norte.co');
    await escribir(/^WhatsApp/, '   ');
    await escribir(/^Descripción/, ' Rutas por el norte. ');
    await guardar();

    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Editar datos' })).toBeTruthy());
    expect(actualizarDatosAgencia).toHaveBeenCalledTimes(1);
    expect(actualizarDatosAgencia).toHaveBeenCalledWith('ag-1', {
      nombre: 'Aventuras del Norte',
      ciudad: 'Bogotá',
      telefono: '3110000000',
      email: 'nuevo@norte.co',
      whatsapp: null,
      descripcion: 'Rutas por el norte.',
    });
    expect(formulario()).toBeNull();
    expect(dato('Nombre')).toBe('Aventuras del Norte');
    expect(dato('Ciudad')).toBe('Bogotá');
    expect(dato('Teléfono')).toBe('3110000000');
    expect(dato('Correo de contacto')).toBe('nuevo@norte.co');
    expect(dato('WhatsApp')).toBe('No registrado');
    expect(dato('Descripción')).toBe('Rutas por el norte.');
    expect(dato('Número de RNT')).toBe('123456');
    expect(toast.mensaje).toBe('Datos guardados');
    expect(cambiosAgencia.version).toBe(antes + 1);
    expect(miAgencia).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Editar datos' })));
  });

  it('mientras guarda el botón dice «Guardando…», no se puede repetir ni cancelar', async () => {
    vi.mocked(actualizarDatosAgencia).mockReturnValue(new Promise(() => {}));
    await pintar();
    await editar();
    await guardar();
    const boton = (await screen.findByRole('button', { name: 'Guardando…' })) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.submit(formulario());
    expect(actualizarDatosAgencia).toHaveBeenCalledTimes(1);
  });

  it('con datos inválidos no llama a la API: resume lo que falta, marca cada campo y enfoca el primero', async () => {
    await pintar();
    await editar();
    await escribir('Nombre de la agencia', '  ');
    await escribir('Correo de contacto', 'sin-arroba');
    await guardar();
    expect(actualizarDatosAgencia).not.toHaveBeenCalled();
    expect(texto(screen.getByText(/Para guardar falta completar/))).toBe(
      'Para guardar falta completar el nombre de la agencia y el correo de contacto.',
    );
    expect(campo('Nombre de la agencia').getAttribute('aria-invalid')).toBe('true');
    expect(campo('Correo de contacto').getAttribute('aria-invalid')).toBe('true');
    expect(campo('Ciudad').getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByText('Escribe el nombre de la agencia.')).toBeTruthy();
    expect(screen.getByText('Escribe un correo válido, por ejemplo hola@tuagencia.co.')).toBeTruthy();
    await vi.waitFor(() => expect(document.activeElement).toBe(campo('Nombre de la agencia')));
    expect(toast.mensaje).toBe('');

    await escribir('Nombre de la agencia', 'Aventuras');
    expect(campo('Nombre de la agencia').getAttribute('aria-invalid')).toBeNull();
    expect(texto(screen.getByText(/Para guardar falta completar/))).toBe('Para guardar falta completar el correo de contacto.');
  });

  it('el WhatsApp y la descripción son opcionales: vacíos no impiden guardar', async () => {
    vi.mocked(actualizarDatosAgencia).mockResolvedValue();
    await pintar({ whatsapp: '3009876543', descripcion: 'Algo.' });
    await editar();
    await escribir(/^WhatsApp/, '');
    await escribir(/^Descripción/, '');
    await guardar();
    await vi.waitFor(() => expect(actualizarDatosAgencia).toHaveBeenCalledTimes(1));
    expect(actualizarDatosAgencia).toHaveBeenCalledWith('ag-1', expect.objectContaining({ whatsapp: null, descripcion: '' }));
  });

  it('una agencia sin teléfono ni correo (null en la base) abre con campos vacíos y los exige para guardar', async () => {
    await pintar({ telefono: null, email: null });
    await editar();
    expect(campo('Teléfono').value).toBe('');
    expect(campo('Correo de contacto').value).toBe('');
    await guardar();
    expect(actualizarDatosAgencia).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe un teléfono de contacto.')).toBeTruthy();
  });

  it('cancelar no llama a la API, vuelve a la vista de lectura y al reabrir muestra lo registrado', async () => {
    await pintar();
    await editar();
    await escribir('Nombre de la agencia', 'Otro nombre');
    await escribir('Ciudad', '');
    await cancelar();
    expect(actualizarDatosAgencia).not.toHaveBeenCalled();
    expect(confirmar).not.toHaveBeenCalled();
    expect(formulario()).toBeNull();
    expect(dato('Nombre')).toBe('Aventuras Antioquia');
    expect(dato('Ciudad')).toBe('Medellín');
    expect(toast.mensaje).toBe('');
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Editar datos' })));
    await editar();
    expect(campo('Nombre de la agencia').value).toBe('Aventuras Antioquia');
    expect(campo('Ciudad').value).toBe('Medellín');
    expect(screen.queryByText(/Para guardar falta completar/)).toBeNull();
  });

  it('si el servidor falla muestra el mensaje en una alerta, conserva lo escrito y no avisa ni da por guardado', async () => {
    vi.mocked(actualizarDatosAgencia).mockRejectedValue(new Error('No hay conexión con el servidor.'));
    await pintar();
    const antes = cambiosAgencia.version;
    await editar();
    await escribir('Nombre de la agencia', 'Nombre nuevo');
    await guardar();
    const alerta = await screen.findByRole('alert');
    expect(texto(alerta)).toContain('No hay conexión con el servidor');
    expect(campo('Nombre de la agencia').value).toBe('Nombre nuevo');
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(false);
    expect(toast.mensaje).toBe('');
    expect(cambiosAgencia.version).toBe(antes);
    await cancelar();
    expect(dato('Nombre')).toBe('Aventuras Antioquia');
  });

  it('Escape sin cambios cierra el formulario', async () => {
    await pintar();
    await editar();
    await fireEvent.keyDown(campo('Nombre de la agencia'), { key: 'Escape' });
    await vi.waitFor(() => expect(formulario()).toBeNull());
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('Escape con cambios pregunta antes de descartar: «Seguir editando» conserva lo escrito', async () => {
    vi.mocked(confirmar).mockResolvedValue(false);
    await pintar();
    await editar();
    await escribir('Nombre de la agencia', 'Otro nombre');
    await fireEvent.keyDown(campo('Nombre de la agencia'), { key: 'Escape' });
    expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: expect.stringContaining('cambios') }));
    await Promise.resolve();
    expect(formulario()).toBeTruthy();
    expect(campo('Nombre de la agencia').value).toBe('Otro nombre');
  });

  it('Escape con cambios y confirmando el descarte cierra sin llamar a la API', async () => {
    vi.mocked(confirmar).mockResolvedValue(true);
    await pintar();
    await editar();
    await escribir('Nombre de la agencia', 'Otro nombre');
    await fireEvent.keyDown(campo('Nombre de la agencia'), { key: 'Escape' });
    await vi.waitFor(() => expect(formulario()).toBeNull());
    expect(dato('Nombre')).toBe('Aventuras Antioquia');
    expect(actualizarDatosAgencia).not.toHaveBeenCalled();
  });

  it('mientras se editan los datos el control del logo sigue disponible', async () => {
    await pintar({ logo_url: URL_LOGO });
    await editar();
    expect(screen.getByRole('button', { name: 'Quitar logo' })).toBeTruthy();
  });
});
