import { useEffect, useRef, useState } from 'react';
import { misVentas, ventas } from '@/features/ventas/api/ventas.api';
import { misLiquidaciones, cuentasResumen } from '@/features/liquidaciones/api/liquidaciones.api';
import { mensajeError } from '@/shared/api/errores';
import type { Agency } from '@/features/agencias/model/agencia';
import type { Plan } from '@/features/planes/model/plan';
import type { VentaRow } from '@/features/ventas/model/ventas';
import type { Liquidacion } from '@/features/liquidaciones/model/liquidaciones';
import { resenasRecientes } from '../api/resumen.api';
import type { ResenaReciente } from '../model/quienes-van';
import { periodoInicial, type Periodo } from '../model/periodo';

export interface EstadoResumen {
  /** El momento en que se abrió el Resumen: «hoy» para todo lo que se calcula (no cambia mientras la página está abierta). */
  hoy: Date;
  cargando: boolean;
  error: string;
  agencia: Agency | null;
  planes: Plan[];
  ventasLista: VentaRow[];
  /** null: no se pudieron consultar (el resto del Resumen no depende de ellos). */
  liquidaciones: Liquidacion[] | null;
  hayCuenta: boolean | null;
  /** null: no se pudieron consultar. */
  resenas: ResenaReciente[] | null;
  /** El período elegido (lo que dice el chip). */
  periodo: Periodo;
  /** El período de las cifras que se ven: difiere de `periodo` mientras llegan las ventas del nuevo. */
  periodoMostrado: Periodo;
  /**
   * Cambia cada vez que se asigna `periodoMostrado` (aunque sean los mismos días): la tabla de salidas usa este valor como
   * `key` para volver a montarse.
   */
  vezMostrado: number;
  cargandoPeriodo: boolean;
  errorPeriodo: string;
  elegirPeriodo: (p: Periodo) => void;
  /** «Reintentar» tras un error: vuelve a pedir las ventas del período elegido. */
  reintentarPeriodo: () => void;
}

/** Los datos del Resumen: la carga inicial (ventas, planes, pagos, cuenta y reseñas) y las ventas de cada período elegido. */
export function useResumen(): EstadoResumen {
  const [hoy] = useState(() => new Date());

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [agencia, setAgencia] = useState<Agency | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [ventasLista, setVentasLista] = useState<VentaRow[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[] | null>(null);
  const [hayCuenta, setHayCuenta] = useState<boolean | null>(null);
  const [resenas, setResenas] = useState<ResenaReciente[] | null>(null);

  const [periodo, setPeriodo] = useState<Periodo>(() => periodoInicial(hoy));
  const [mostrado, setMostrado] = useState<{ periodo: Periodo; vez: number }>(() => ({ periodo: periodoInicial(hoy), vez: 0 }));
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState('');
  /** Solo vale la última petición de ventas: si se cambia de período antes de que llegue una, se descarta. */
  const peticion = useRef(0);

  const mostrar = (p: Periodo) => setMostrado((m) => ({ periodo: p, vez: m.vez + 1 }));

  // Carga al montar. Si el efecto se repite (doble montaje de StrictMode) o se desmonta, la respuesta vieja se ignora.
  useEffect(() => {
    let vigente = true;
    (async () => {
      setCargando(true);
      setError('');
      try {
        // Viajes del período inicial: lo que se vendió y lo que corresponde. Las salidas salen de los planes.
        const r = await misVentas({ desde: mostrado.periodo.desde, hasta: mostrado.periodo.hasta });
        if (!vigente) return;
        setAgencia(r.agencia);
        setPlanes(r.planes);
        setVentasLista(r.ventas);
        if (r.agencia) {
          const id = r.agencia.id;
          const [liqs, cuentas, ultimas] = await Promise.all([
            misLiquidaciones(id).catch(() => null),
            cuentasResumen().catch(() => null),
            resenasRecientes(3).catch(() => null),
          ]);
          if (!vigente) return;
          setLiquidaciones(liqs);
          setHayCuenta(cuentas === null ? null : cuentas.some((c) => c.agency_id === id));
          setResenas(ultimas);
        }
      } catch (e) {
        if (vigente) setError(mensajeError(e));
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
    // Solo al montar: el período inicial es el de `hoy`, que no cambia.
  }, []);

  /** Trae las ventas de los viajes del período elegido; mientras tanto se siguen viendo las del anterior. */
  async function cargarPeriodo(p: Periodo) {
    const mia = ++peticion.current;
    setErrorPeriodo('');
    if (!agencia) return;
    if (p.desde === mostrado.periodo.desde && p.hasta === mostrado.periodo.hasta) {
      // Mismos días que ya están cargados (p. ej. «Este mes» y ese mes elegido a mano): no hay nada que pedir.
      mostrar(p);
      setCargandoPeriodo(false);
      return;
    }
    setCargandoPeriodo(true);
    try {
      const filas = await ventas(agencia.id, p.desde, p.hasta);
      if (mia !== peticion.current) return;
      setVentasLista(filas);
      mostrar(p);
    } catch (e) {
      if (mia === peticion.current) setErrorPeriodo(mensajeError(e));
    } finally {
      if (mia === peticion.current) setCargandoPeriodo(false);
    }
  }

  function elegirPeriodo(p: Periodo) {
    setPeriodo(p);
    cargarPeriodo(p);
  }

  return {
    hoy,
    cargando,
    error,
    agencia,
    planes,
    ventasLista,
    liquidaciones,
    hayCuenta,
    resenas,
    periodo,
    periodoMostrado: mostrado.periodo,
    vezMostrado: mostrado.vez,
    cargandoPeriodo,
    errorPeriodo,
    elegirPeriodo,
    reintentarPeriodo: () => cargarPeriodo(periodo),
  };
}
