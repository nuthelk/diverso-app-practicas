/**
 * Los datos de contacto de la agencia y sus reglas: la misma fuente para el registro (OnboardingPage) y para editarlos
 * en el perfil (PerfilAgenciaPage). Lo que escribe la persona es texto; `normalizarDatosAgencia` lo deja como lo guarda
 * la base y `validarDatosAgencia` dice qué falta, con el mensaje de cada campo.
 */

import type { Agency } from './agencia';

/** Lo que se escribe en el formulario (texto, tal cual). */
export interface DatosAgencia {
  nombre: string;
  ciudad: string;
  telefono: string;
  email: string;
  whatsapp: string;
  descripcion: string;
}

/** Lo que se guarda: recortado, y sin WhatsApp (null) cuando no se escribió. */
export interface DatosAgenciaGuardables extends Omit<DatosAgencia, 'whatsapp'> {
  whatsapp: string | null;
}

/** El registro suma los datos que respaldan el sello de verificación; el perfil no los edita. */
export interface DatosRegistro extends DatosAgencia {
  numero_rnt: string;
  matricula_camara_comercio: string;
}

/** Los datos editables de una agencia como texto de formulario (los contactos que la base deja en null, vacíos). */
export function datosDeAgencia(a: Pick<Agency, keyof DatosAgencia>): DatosAgencia {
  return {
    nombre: a.nombre,
    ciudad: a.ciudad,
    telefono: a.telefono ?? '',
    email: a.email ?? '',
    whatsapp: a.whatsapp ?? '',
    descripcion: a.descripcion,
  };
}

/** Un campo que no cumple: `resumen` completa «falta completar…» y `mensaje` sale junto al campo. */
export interface Falla {
  clave: 'nombre' | 'rnt' | 'matricula' | 'ciudad' | 'telefono' | 'email';
  resumen: string;
  mensaje: string;
}

export function normalizarDatosAgencia(d: DatosAgencia): DatosAgenciaGuardables {
  return {
    nombre: d.nombre.trim(),
    ciudad: d.ciudad.trim(),
    telefono: d.telefono.trim(),
    email: d.email.trim(),
    whatsapp: d.whatsapp.trim() || null,
    descripcion: d.descripcion.trim(),
  };
}

// Mismas reglas que las restricciones CHECK de la base de datos.
const RNT = /^[0-9]{4,8}$/;
const MATRICULA = /^[0-9][0-9 -]{3,19}$/;
const CORREO = /^\S+@\S+\.\S+$/;

/**
 * Fallas de los datos, en el orden del formulario. El RNT y la matrícula solo se revisan si vienen (registro): al
 * editar el perfil no se envían y la base los trata como protegidos.
 */
export function validarDatosAgencia(d: DatosAgencia & Partial<DatosRegistro>): Falla[] {
  const reglas: (Falla & { ok: boolean })[] = [
    { clave: 'nombre', ok: d.nombre.trim() !== '', resumen: 'el nombre de la agencia', mensaje: 'Escribe el nombre de la agencia.' },
    ...(d.numero_rnt === undefined
      ? []
      : [
          {
            clave: 'rnt' as const,
            ok: RNT.test(d.numero_rnt.trim()),
            resumen: 'el número de RNT',
            mensaje: 'El número de RNT debe tener entre 4 y 8 dígitos, sin letras.',
          },
        ]),
    ...(d.matricula_camara_comercio === undefined
      ? []
      : [
          {
            clave: 'matricula' as const,
            ok: MATRICULA.test(d.matricula_camara_comercio.trim()),
            resumen: 'la matrícula mercantil',
            mensaje: 'La matrícula mercantil debe ser numérica (se admiten guiones).',
          },
        ]),
    { clave: 'ciudad', ok: d.ciudad.trim() !== '', resumen: 'la ciudad', mensaje: 'Escribe la ciudad.' },
    { clave: 'telefono', ok: d.telefono.trim() !== '', resumen: 'el teléfono', mensaje: 'Escribe un teléfono de contacto.' },
    {
      clave: 'email',
      ok: CORREO.test(d.email.trim()),
      resumen: 'el correo de contacto',
      mensaje: 'Escribe un correo válido, por ejemplo hola@tuagencia.co.',
    },
  ];
  return reglas.filter((r) => !r.ok).map(({ clave, resumen, mensaje }) => ({ clave, resumen, mensaje }));
}
