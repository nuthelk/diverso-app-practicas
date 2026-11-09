import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Lo que el panel le manda a Supabase (sin red), en orden. */
const rec = vi.hoisted(() => ({
  pasos: [] as string[],
  subidas: [] as { ruta: string; opciones: unknown }[],
  update: null as unknown,
  eq: [] as [string, unknown][],
  tabla: '',
  errorSubida: null as unknown,
  errorUpdate: null as unknown,
  errorBorrado: null as unknown,
}));

vi.mock('$lib/shared/api/supabase', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        upload: (ruta: string, _archivo: unknown, opciones: unknown) => {
          rec.pasos.push(`upload ${bucket}/${ruta}`);
          rec.subidas.push({ ruta, opciones });
          return Promise.resolve({ data: { path: ruta }, error: rec.errorSubida });
        },
        getPublicUrl: (ruta: string) => ({
          data: { publicUrl: `http://127.0.0.1:54331/storage/v1/object/public/${bucket}/${ruta}` },
        }),
        remove: (rutas: string[]) => {
          rec.pasos.push(`remove ${bucket}/${rutas.join(',')}`);
          return Promise.resolve({ data: [], error: rec.errorBorrado });
        },
      }),
    },
    from: (tabla: string) => {
      rec.tabla = tabla;
      return {
        update: (fila: unknown) => {
          rec.update = fila;
          return {
            eq: (col: string, val: unknown) => {
              rec.eq.push([col, val]);
              rec.pasos.push(`update ${JSON.stringify(fila)}`);
              return Promise.resolve({ error: rec.errorUpdate });
            },
          };
        },
      };
    },
  },
}));

import { mensajeError } from '$lib/shared/api/errores';
import { actualizarDatosAgencia, quitarLogo, subirLogo } from '$lib/features/agencias/api/agencias.api';

const URL = (ruta: string) => `http://127.0.0.1:54331/storage/v1/object/public/agency-logos/${ruta}`;
const archivo = (type = 'image/png', size = 1000) =>
  new File([new Uint8Array(size)], 'mi logo.png', { type });

beforeEach(() => {
  rec.pasos = [];
  rec.subidas = [];
  rec.update = null;
  rec.eq = [];
  rec.tabla = '';
  rec.errorSubida = rec.errorUpdate = rec.errorBorrado = null;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1_800_000_000_000);
});

describe('subirLogo', () => {
  it('sube a la carpeta de la agencia, guarda la URL pública y devuelve esa URL', async () => {
    const url = await subirLogo({ id: 'ag-1', logo_url: null }, archivo());

    expect(rec.subidas).toHaveLength(1);
    const ruta = rec.subidas[0]!.ruta;
    expect(ruta).toMatch(/^ag-1\/logo-[a-z0-9]+\.png$/);
    expect(rec.subidas[0]!.opciones).toMatchObject({ contentType: 'image/png', upsert: false });
    expect(url).toBe(URL(ruta));
    expect(rec.tabla).toBe('agencies');
    expect(rec.update).toEqual({ logo_url: url });
    expect(rec.eq).toEqual([['id', 'ag-1']]);
    expect(rec.pasos).toEqual([`upload agency-logos/${ruta}`, `update ${JSON.stringify({ logo_url: url })}`]);
  });

  it('al reemplazar guarda la nueva URL y recién entonces borra el objeto anterior', async () => {
    const url = await subirLogo({ id: 'ag-1', logo_url: URL('ag-1/logo-viejo.png') }, archivo('image/webp'));
    const ruta = rec.subidas[0]!.ruta;
    expect(ruta).toMatch(/\.webp$/);
    expect(rec.pasos).toEqual([
      `upload agency-logos/${ruta}`,
      `update ${JSON.stringify({ logo_url: url })}`,
      'remove agency-logos/ag-1/logo-viejo.png',
    ]);
  });

  it('no borra un logo anterior que no sea de su carpeta (URL externa o de otra agencia)', async () => {
    await subirLogo({ id: 'ag-1', logo_url: 'https://logos.test/heredado.png' }, archivo());
    await subirLogo({ id: 'ag-1', logo_url: URL('ag-2/logo.png') }, archivo());
    expect(rec.pasos.filter((p) => p.startsWith('remove'))).toEqual([]);
  });

  it('un archivo inválido se rechaza antes de tocar la red', async () => {
    await expect(subirLogo({ id: 'ag-1', logo_url: null }, archivo('image/gif'))).rejects.toThrow(
      'El logo debe ser una imagen PNG, JPG o WebP.',
    );
    await expect(subirLogo({ id: 'ag-1', logo_url: null }, archivo('image/png', 3 * 1024 * 1024))).rejects.toThrow(
      /pesa 3\.0 MB y el máximo es 2 MB/,
    );
    expect(rec.pasos).toEqual([]);
  });

  it('si la subida falla, no cambia logo_url ni borra nada', async () => {
    rec.errorSubida = new Error('boom');
    await expect(subirLogo({ id: 'ag-1', logo_url: URL('ag-1/logo-viejo.png') }, archivo())).rejects.toThrow('boom');
    expect(rec.pasos).toHaveLength(1);
    expect(rec.update).toBeNull();
  });

  it('si no puede guardar logo_url, borra el objeto recién subido y conserva el anterior', async () => {
    rec.errorUpdate = new Error('LOGO_URL_INVALIDO');
    await expect(subirLogo({ id: 'ag-1', logo_url: URL('ag-1/logo-viejo.png') }, archivo())).rejects.toThrow(
      'LOGO_URL_INVALIDO',
    );
    const ruta = rec.subidas[0]!.ruta;
    expect(rec.pasos.at(-1)).toBe(`remove agency-logos/${ruta}`);
    expect(rec.pasos.join('\n')).not.toContain('logo-viejo');
  });

  it('si no logra borrar el objeto anterior, igual cuenta como subido', async () => {
    rec.errorBorrado = new Error('no se pudo');
    const url = await subirLogo({ id: 'ag-1', logo_url: URL('ag-1/logo-viejo.png') }, archivo());
    expect(url).toMatch(/\/ag-1\/logo-[a-z0-9]+\.png$/);
  });
});

describe('quitarLogo', () => {
  it('pone logo_url en null y recién entonces borra el objeto', async () => {
    await quitarLogo({ id: 'ag-1', logo_url: URL('ag-1/logo-abc.png') });
    expect(rec.tabla).toBe('agencies');
    expect(rec.update).toEqual({ logo_url: null });
    expect(rec.eq).toEqual([['id', 'ag-1']]);
    expect(rec.pasos).toEqual([`update ${JSON.stringify({ logo_url: null })}`, 'remove agency-logos/ag-1/logo-abc.png']);
  });

  it('con un logo_url heredado (externo) solo lo limpia', async () => {
    await quitarLogo({ id: 'ag-1', logo_url: 'https://logos.test/heredado.png' });
    expect(rec.pasos).toEqual([`update ${JSON.stringify({ logo_url: null })}`]);
  });

  it('si no puede limpiar logo_url, lanza el error y no borra el objeto', async () => {
    rec.errorUpdate = new Error('sin permiso');
    await expect(quitarLogo({ id: 'ag-1', logo_url: URL('ag-1/logo-abc.png') })).rejects.toThrow('sin permiso');
    expect(rec.pasos.filter((p) => p.startsWith('remove'))).toEqual([]);
  });
});

describe('actualizarDatosAgencia', () => {
  const datos = {
    nombre: 'Aventuras Antioquia',
    descripcion: 'Tours de grafiti y café.',
    ciudad: 'Medellín',
    telefono: '3001234567',
    email: 'hola@aventuras.co',
    whatsapp: null,
  };

  it('actualiza solo nombre, descripción, ciudad, teléfono, correo y WhatsApp de esa agencia', async () => {
    await actualizarDatosAgencia('ag-1', datos);
    expect(rec.tabla).toBe('agencies');
    expect(rec.update).toEqual(datos);
    expect(Object.keys(rec.update as object).sort()).toEqual(
      ['ciudad', 'descripcion', 'email', 'nombre', 'telefono', 'whatsapp'],
    );
    expect(rec.eq).toEqual([['id', 'ag-1']]);
  });

  it('aunque le lleguen más campos (RNT, matrícula, estado, comisión, logo) no los envía', async () => {
    const conDeMas = {
      ...datos,
      numero_rnt: '1',
      matricula_camara_comercio: '2',
      estado_verificacion: 'verificado',
      comision_pct: 0,
      logo_url: 'x',
    };
    await actualizarDatosAgencia('ag-1', conDeMas);
    expect(Object.keys(rec.update as object).sort()).toEqual(
      ['ciudad', 'descripcion', 'email', 'nombre', 'telefono', 'whatsapp'],
    );
  });

  it('manda un WhatsApp escrito tal cual', async () => {
    await actualizarDatosAgencia('ag-1', { ...datos, whatsapp: '+573009876543' });
    expect(rec.update).toMatchObject({ whatsapp: '+573009876543' });
  });

  it('si Supabase responde con error, lo lanza tal cual', async () => {
    const fallo = new Error('sin permiso');
    rec.errorUpdate = fallo;
    await expect(actualizarDatosAgencia('ag-1', datos)).rejects.toBe(fallo);
  });
});

describe('mensajeError con el logo', () => {
  it.each([
    ['LOGO_URL_INVALIDO', 'No pudimos guardar el logo: la imagen no es válida. Súbela de nuevo.'],
    ['The object exceeded the maximum allowed size', 'La imagen supera el máximo de 2 MB.'],
    ['mime type image/gif is not supported', 'Solo se admiten imágenes PNG, JPG o WebP.'],
  ])('%s', (crudo, esperado) => {
    expect(mensajeError(new Error(crudo))).toBe(esperado);
  });
});
