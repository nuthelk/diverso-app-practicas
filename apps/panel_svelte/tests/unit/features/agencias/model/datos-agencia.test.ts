import { describe, expect, it } from 'vitest';
import { agencia } from '$tests/fixtures';
import {
  datosDeAgencia,
  normalizarDatosAgencia,
  validarDatosAgencia,
  type DatosAgencia,
} from '$lib/features/agencias/model/datos-agencia';

const datos = (parcial: Partial<DatosAgencia> = {}): DatosAgencia => ({
  nombre: 'Aventuras Antioquia',
  ciudad: 'Medellín',
  telefono: '3001234567',
  email: 'hola@aventuras.co',
  whatsapp: '',
  descripcion: '',
  ...parcial,
});

const claves = (fallas: { clave: string }[]) => fallas.map((f) => f.clave);

describe('normalizarDatosAgencia', () => {
  it('recorta cada campo de texto', () => {
    expect(
      normalizarDatosAgencia(
        datos({ nombre: '  Aventuras ', ciudad: ' Bogotá ', telefono: ' 300 ', email: ' a@b.co ', descripcion: '  Tours.  ' }),
      ),
    ).toEqual({ nombre: 'Aventuras', ciudad: 'Bogotá', telefono: '300', email: 'a@b.co', whatsapp: null, descripcion: 'Tours.' });
  });

  it('un WhatsApp vacío o de solo espacios es null (la columna lo admite); uno escrito se conserva recortado', () => {
    expect(normalizarDatosAgencia(datos({ whatsapp: '' })).whatsapp).toBeNull();
    expect(normalizarDatosAgencia(datos({ whatsapp: '   ' })).whatsapp).toBeNull();
    expect(normalizarDatosAgencia(datos({ whatsapp: ' +573009876543 ' })).whatsapp).toBe('+573009876543');
  });

  it('una descripción vacía queda como texto vacío (la columna es not null)', () => {
    expect(normalizarDatosAgencia(datos({ descripcion: '  ' })).descripcion).toBe('');
  });
});

describe('validarDatosAgencia', () => {
  it('datos completos: sin fallas', () => {
    expect(validarDatosAgencia(datos())).toEqual([]);
  });

  it('cada campo obligatorio vacío falla con su mensaje y su frase para el resumen, en el orden del formulario', () => {
    const f = validarDatosAgencia(datos({ nombre: ' ', ciudad: '', telefono: '  ', email: '' }));
    expect(f).toEqual([
      { clave: 'nombre', resumen: 'el nombre de la agencia', mensaje: 'Escribe el nombre de la agencia.' },
      { clave: 'ciudad', resumen: 'la ciudad', mensaje: 'Escribe la ciudad.' },
      { clave: 'telefono', resumen: 'el teléfono', mensaje: 'Escribe un teléfono de contacto.' },
      {
        clave: 'email',
        resumen: 'el correo de contacto',
        mensaje: 'Escribe un correo válido, por ejemplo hola@tuagencia.co.',
      },
    ]);
  });

  it.each(['sin-arroba.co', 'a@b', 'a b@c.co', '@c.co'])('el correo «%s» no es válido', (email) => {
    expect(claves(validarDatosAgencia(datos({ email })))).toEqual(['email']);
  });

  it('WhatsApp y descripción son opcionales: vacíos no fallan', () => {
    expect(validarDatosAgencia(datos({ whatsapp: '', descripcion: '' }))).toEqual([]);
  });

  it('sin RNT ni matrícula (edición) no se validan', () => {
    expect(claves(validarDatosAgencia(datos()))).not.toContain('rnt');
  });

  describe('con RNT y matrícula (registro)', () => {
    const registro = (parcial: Record<string, string> = {}) => ({
      ...datos(),
      numero_rnt: '85421',
      matricula_camara_comercio: '02345678-9',
      ...parcial,
    });

    it('valores válidos: sin fallas', () => {
      expect(validarDatosAgencia(registro())).toEqual([]);
    });

    it.each(['abc', '123', '123456789', '12 34', ''])('el RNT «%s» falla con el mensaje del registro', (rnt) => {
      expect(validarDatosAgencia(registro({ numero_rnt: rnt }))).toEqual([
        {
          clave: 'rnt',
          resumen: 'el número de RNT',
          mensaje: 'El número de RNT debe tener entre 4 y 8 dígitos, sin letras.',
        },
      ]);
    });

    it.each(['AB-123', '-1234', '12', ''])('la matrícula «%s» falla con el mensaje del registro', (m) => {
      expect(validarDatosAgencia(registro({ matricula_camara_comercio: m }))).toEqual([
        {
          clave: 'matricula',
          resumen: 'la matrícula mercantil',
          mensaje: 'La matrícula mercantil debe ser numérica (se admiten guiones).',
        },
      ]);
    });

    it('RNT y matrícula se evalúan recortados y quedan entre el nombre y la ciudad', () => {
      expect(validarDatosAgencia(registro({ numero_rnt: ' 85421 ', matricula_camara_comercio: ' 1234 ' }))).toEqual([]);
      expect(claves(validarDatosAgencia(registro({ nombre: '', numero_rnt: 'x', matricula_camara_comercio: 'x', ciudad: '' })))).toEqual([
        'nombre',
        'rnt',
        'matricula',
        'ciudad',
      ]);
    });
  });
});

describe('datosDeAgencia', () => {
  it('copia los seis datos editables de la agencia', () => {
    expect(datosDeAgencia(agencia({ descripcion: 'Tours.', whatsapp: '300' }))).toEqual({
      nombre: 'Aventuras Antioquia',
      ciudad: 'Medellín',
      telefono: '3001234567',
      email: 'hola@aventuras.co',
      whatsapp: '300',
      descripcion: 'Tours.',
    });
  });

  it('los contactos null de la base pasan a texto vacío para el formulario', () => {
    expect(datosDeAgencia(agencia({ telefono: null, email: null, whatsapp: null }))).toMatchObject({
      telefono: '',
      email: '',
      whatsapp: '',
    });
  });
});
