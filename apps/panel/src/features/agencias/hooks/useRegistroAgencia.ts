import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { mensajeError } from '@/shared/api/errores';
import { avisar } from '@/shared/lib/toast';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import { registrarConsentimiento } from '@/features/legal/api/legal.api';
import { registrarAgencia } from '../api/agencias.api';
import { normalizarDatosAgencia, validarDatosAgencia } from '../model/datos-agencia';

/** Lo que se escribe en el registro (texto, tal cual). */
export interface CamposRegistro {
  nombre: string;
  numeroRnt: string;
  matricula: string;
  ciudad: string;
  telefono: string;
  email: string;
  whatsapp: string;
  descripcion: string;
}

/**
 * El registro de la agencia: los campos, las dos autorizaciones, qué falta para enviar y el envío (primero las
 * autorizaciones, luego la agencia). Al terminar lleva al resumen.
 */
export function useRegistroAgencia() {
  const navegar = useNavigate();
  const [campos, setCampos] = useState<CamposRegistro>({
    nombre: '',
    numeroRnt: '',
    matricula: '',
    ciudad: 'Medellín',
    telefono: '',
    email: '',
    whatsapp: '',
    descripcion: '',
  });
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [intentado, setIntentado] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  /** Cambia un campo (el `onChange` de su input controlado). */
  const cambiar = (clave: keyof CamposRegistro, valor: string) => setCampos((c) => ({ ...c, [clave]: valor }));

  const { nombre, numeroRnt, matricula, ciudad, telefono, email, whatsapp, descripcion } = campos;

  /** Lo que falta para enviar: los datos con las reglas compartidas, y las dos autorizaciones (solo de este formulario). */
  const reglas: { clave: string; resumen: string; mensaje: string }[] = [
    ...validarDatosAgencia({
      nombre,
      ciudad,
      telefono,
      email,
      whatsapp,
      descripcion,
      numero_rnt: numeroRnt,
      matricula_camara_comercio: matricula,
    }),
    ...(aceptaDatos
      ? []
      : [
          {
            clave: 'datos',
            resumen: 'la autorización de datos',
            mensaje: 'Marca la autorización de datos para poder registrarte.',
          },
        ]),
    ...(aceptaTerminos
      ? []
      : [
          {
            clave: 'terminos',
            resumen: 'los términos y condiciones',
            mensaje: 'Acepta los términos y condiciones para poder registrarte.',
          },
        ]),
  ];
  /** Sin intento de envío no se marca nada; después se actualiza al corregir cada campo. */
  const fallas = intentado ? reglas : [];
  const errorDe = (clave: string) => fallas.find((f) => f.clave === clave)?.mensaje;
  const faltan = new Intl.ListFormat('es', { type: 'conjunction' }).format(fallas.map((f) => f.resumen));

  const trasDibujar = useTrasDibujar();

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentado(true);
    // `fallas` todavía es la del dibujo anterior (sin intento, vacía): se decide con las reglas.
    if (reglas.length > 0) {
      // Ya dibujados como inválidos, el foco va al primer campo por corregir.
      trasDibujar(() => formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setGuardando(true);
    setError('');
    try {
      // Primero la autorización: es requisito previo al tratamiento.
      await registrarConsentimiento('tratamiento_datos');
      await registrarConsentimiento('terminos_agencia');
      const datos = normalizarDatosAgencia({ nombre, ciudad, telefono, email, whatsapp, descripcion });
      await registrarAgencia({
        ...datos,
        numero_rnt: numeroRnt.trim(),
        matricula_camara_comercio: matricula.trim(),
        whatsapp: datos.whatsapp ?? '', // el registro guarda vacío (no null), como siempre
      });
      avisar('Agencia registrada. Te avisaremos cuando quede verificada.');
      navegar('/dashboard');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return {
    campos,
    cambiar,
    aceptaDatos,
    setAceptaDatos,
    aceptaTerminos,
    setAceptaTerminos,
    guardando,
    error,
    fallas,
    errorDe,
    faltan,
    formulario,
    guardar,
  };
}
