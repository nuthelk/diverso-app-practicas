import { useEffect, useRef, useState, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from 'react';
import { useNavigate } from 'react-router';
import { miAgencia } from '@/features/agencias/api/agencias.api';
import { mensajeError } from '@/shared/api/errores';
import { avisar } from '@/shared/lib/toast';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import { misPlanes, crearPlan, actualizarPlan } from '../api/planes.api';
import { draftDesdePlan, draftVacio, errorPrecio, type PlanDraft } from '../model/plan';
import { parsearDuracion, type Unidad } from '../model/duracion';
import { textoPoliticaCompleto, validarPolitica, type ErroresPolitica } from '../model/politica';

/** Un punto por corregir del resumen de errores; `campo` es el `data-campo` del control. */
export type Pendiente = { campo: string; mensaje: string };

/**
 * Estado del formulario de plan (nuevo o, con `planId`, el de editar): el borrador `d` que editan las secciones, la
 * duración estructurada, la carga del plan a editar, las validaciones y el guardado. Las secciones reciben cada valor
 * con su setter (`d` y `setD`, `duracionCantidad` y `setDuracionCantidad`…).
 */
export function usePlanForm(planId?: string): {
  d: PlanDraft;
  setD: Dispatch<SetStateAction<PlanDraft>>;
  duracionCantidad: number | null;
  setDuracionCantidad: Dispatch<SetStateAction<number | null>>;
  duracionUnidad: Unidad;
  setDuracionUnidad: Dispatch<SetStateAction<Unidad>>;
  cargando: boolean;
  guardando: boolean;
  /** No se pudo abrir el plan a editar: no se muestra el formulario (guardarlo vacío crearía otro plan). */
  errorCarga: string;
  /** El servidor rechazó el guardado; lo escrito sigue en el formulario. */
  errorServidor: string;
  intentado: boolean;
  erroresPolitica: ErroresPolitica;
  textoVistaPrevia: string;
  errorDePrecio: string | undefined;
  pendientes: Pendiente[];
  resumenRef: RefObject<HTMLDivElement | null>;
  formRef: RefObject<HTMLFormElement | null>;
  irAlCampo: (campo: string) => void;
  guardar: (e: FormEvent<HTMLFormElement>) => Promise<void>;
} {
  const navegar = useNavigate();

  const [d, setD] = useState<PlanDraft>(draftVacio);
  const [cargando, setCargando] = useState(!!planId);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorServidor, setErrorServidor] = useState('');
  const [intentado, setIntentado] = useState(false);
  const resumenRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const trasDibujar = useTrasDibujar();

  // Duración estructurada: cantidad + unidad → compone duracionTexto (lo hace SeccionEsencial).
  const [duracionCantidad, setDuracionCantidad] = useState<number | null>(1);
  const [duracionUnidad, setDuracionUnidad] = useState<Unidad>('dias');

  useEffect(() => {
    if (!planId) return;
    let vigente = true;
    (async () => {
      try {
        const agencia = await miAgencia();
        const planes = agencia ? await misPlanes(agencia.id) : [];
        if (!vigente) return;
        const p = planes.find((x) => x.id === planId);
        if (p) {
          setD(draftDesdePlan(p));
          const { cantidad, unidad } = parsearDuracion(p.duracion_texto);
          setDuracionCantidad(cantidad);
          setDuracionUnidad(unidad);
        } else {
          setErrorCarga('No encontramos este plan. Puede que se haya eliminado.');
        }
      } catch (e) {
        if (vigente) setErrorCarga(mensajeError(e));
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [planId]);

  // El texto de la política se genera siempre desde estos números (planes.api.ts lo vuelve a generar al guardar).
  const erroresPolitica = validarPolitica(d);
  const politicaValida = Object.keys(erroresPolitica).length === 0;
  const textoVistaPrevia = politicaValida
    ? textoPoliticaCompleto(d)
    : 'Completa la política de cancelación para ver el texto que leerá el viajero.';

  const errorDePrecio = intentado ? errorPrecio(d.precioCop) : undefined;

  /** Los puntos por corregir, en el orden del formulario. */
  const pendientes: Pendiente[] = [];
  if (intentado) {
    if (errorDePrecio) pendientes.push({ campo: 'precio', mensaje: errorDePrecio });
    for (const [campo, mensaje] of Object.entries(erroresPolitica)) pendientes.push({ campo, mensaje });
  }

  /** El resumen de errores recibe el foco cuando ya está dibujado (cada vez que se pide). */
  function mostrarResumen() {
    trasDibujar(() => resumenRef.current?.focus());
  }

  function irAlCampo(campo: string) {
    formRef.current?.querySelector<HTMLElement>(`[data-campo="${campo}"]`)?.focus();
  }

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentado(true);
    setErrorServidor('');
    if (errorPrecio(d.precioCop) || !politicaValida) {
      mostrarResumen();
      return;
    }
    setGuardando(true);
    try {
      const agencia = await miAgencia();
      if (!agencia) throw new Error('No se encontró tu agencia.');
      if (d.id == null) {
        await crearPlan(agencia.id, d);
        avisar('Plan creado como borrador.');
      } else {
        await actualizarPlan(d);
        avisar('Plan guardado.');
      }
      navegar('/planes');
    } catch (e) {
      setErrorServidor(mensajeError(e));
      mostrarResumen();
    } finally {
      setGuardando(false);
    }
  }

  return {
    d,
    setD,
    duracionCantidad,
    setDuracionCantidad,
    duracionUnidad,
    setDuracionUnidad,
    cargando,
    guardando,
    errorCarga,
    errorServidor,
    intentado,
    erroresPolitica,
    textoVistaPrevia,
    errorDePrecio,
    pendientes,
    resumenRef,
    formRef,
    irAlCampo,
    guardar,
  };
}
