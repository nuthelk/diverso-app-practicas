import { useRef, useState, type Dispatch, type FormEvent, type KeyboardEvent, type SetStateAction } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { avisar } from '@/shared/lib/toast';
import { confirmar } from '@/shared/lib/confirmar';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import { actualizarDatosAgencia } from '../api/agencias.api';
import { avisarCambioAgencia } from '../model/cambios-agencia';
import { datosDeAgencia, normalizarDatosAgencia, validarDatosAgencia, type DatosAgencia } from '../model/datos-agencia';
import type { Agency } from '../model/agencia';

/**
 * Edición de los datos de contacto del perfil: el borrador es lo que se escribe; `agencia` sigue siendo lo guardado.
 * Al guardar actualiza la copia en pantalla (`setAgencia`) y avisa al marco que la agencia cambió.
 */
export function useEdicionDatosAgencia(agencia: Agency | null, setAgencia: Dispatch<SetStateAction<Agency | null>>) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<DatosAgencia>({
    nombre: '',
    ciudad: '',
    telefono: '',
    email: '',
    whatsapp: '',
    descripcion: '',
  });
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');
  const formulario = useRef<HTMLFormElement>(null);
  const botonEditar = useRef<HTMLButtonElement>(null);

  /** El foco va a donde corresponde cuando el formulario (o el botón «Editar») ya está dibujado. */
  const trasDibujar = useTrasDibujar();

  /** Sin intento de guardado no se marca nada; después se actualiza al corregir cada campo. */
  const fallas = intentado ? validarDatosAgencia(borrador) : [];
  const errorDe = (clave: string) => fallas.find((f) => f.clave === clave)?.mensaje;
  const faltan = new Intl.ListFormat('es', { type: 'conjunction' }).format(fallas.map((f) => f.resumen));
  const hayCambios = (() => {
    if (!agencia) return false;
    const original = datosDeAgencia(agencia);
    return (Object.keys(original) as (keyof DatosAgencia)[]).some((k) => borrador[k] !== original[k]);
  })();

  /** Cambia un campo del borrador (el `onChange` de su input controlado). */
  const cambiar = (clave: keyof DatosAgencia, valor: string) => setBorrador((b) => ({ ...b, [clave]: valor }));

  function empezarEdicion() {
    if (!agencia) return;
    setBorrador(datosDeAgencia(agencia));
    setIntentado(false);
    setErrorGuardado('');
    setEditando(true);
    trasDibujar(() => formulario.current?.querySelector<HTMLElement>('input')?.focus());
  }

  function cerrarEdicion() {
    setEditando(false);
    trasDibujar(() => botonEditar.current?.focus());
  }

  /** Escape no descarta en silencio: sin cambios cierra; con cambios pregunta antes. */
  async function alTeclear(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Escape' || guardando) return;
    const descartar =
      !hayCambios ||
      (await confirmar({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Lo que escribiste no se guardará.',
        confirmar: 'Descartar',
        cancelar: 'Seguir editando',
        peligro: true,
      }));
    if (descartar) cerrarEdicion();
  }

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agencia || guardando) return;
    setIntentado(true);
    // `fallas` todavía es la del dibujo anterior: se decide con la validación del borrador actual.
    if (validarDatosAgencia(borrador).length > 0) {
      trasDibujar(() => formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setGuardando(true);
    setErrorGuardado('');
    try {
      const datos = normalizarDatosAgencia(borrador);
      await actualizarDatosAgencia(agencia.id, datos);
      setAgencia({ ...agencia, ...datos });
      avisar('Datos guardados');
      avisarCambioAgencia();
      cerrarEdicion();
    } catch (e) {
      setErrorGuardado(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return {
    editando,
    borrador,
    cambiar,
    fallas,
    errorDe,
    faltan,
    guardando,
    errorGuardado,
    formulario,
    botonEditar,
    empezarEdicion,
    cerrarEdicion,
    alTeclear,
    guardar,
  };
}
