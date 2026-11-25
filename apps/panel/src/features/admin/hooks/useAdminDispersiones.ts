import { useCallback, useEffect, useRef, useState } from 'react';
import { cuentasResumen, liquidacionDetalle } from '@/features/liquidaciones/api/liquidaciones.api';
import { mensajeError } from '@/shared/api/errores';
import { avisar } from '@/shared/lib/toast';
import {
  filtrarLiquidaciones,
  semanaAnterior,
  type CuentaResumen,
  type FiltroLiquidaciones,
  type Liquidacion,
  type LiquidacionItem,
} from '@/features/liquidaciones/model/liquidaciones';
import type { Agency } from '@/features/agencias/model/agencia';
import {
  todasLasAgencias,
  todasLiquidaciones,
  generarLiquidaciones,
  generarAnticipos,
  ejecutarLiquidacion,
  bloquearAnticipo,
} from '../api/admin.api';
import { avisoAnticiposGenerados, avisoSemanaGenerada } from '../model/admin';

/**
 * Las dispersiones de prueba: liquidaciones de todas las agencias con su filtro, el generador manual (semana y
 * anticipos), la confirmación antes de ejecutar una dispersión, las reservas desplegadas y el bloqueo de anticipos.
 */
export function useAdminDispersiones() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [agencias, setAgencias] = useState<Agency[]>([]);
  const [cuentas, setCuentas] = useState<CuentaResumen[]>([]);
  const [filtro, setFiltro] = useState<FiltroLiquidaciones>('pendientes');

  const [semana, setSemana] = useState(semanaAnterior);
  const [generando, setGenerando] = useState(false);

  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const [abierta, setAbierta] = useState<string | null>(null);
  const [items, setItems] = useState<LiquidacionItem[]>([]);
  // Después de un `await` se lee la liquidación desplegada en ese momento, no la del render viejo.
  const abiertaRef = useRef(abierta);
  abiertaRef.current = abierta;

  // Solo la última carga escribe: una respuesta vieja (o llegada tras desmontar) se ignora.
  const ultimaCarga = useRef(0);
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    const esta = ++ultimaCarga.current;
    const vigente = () => montado.current && esta === ultimaCarga.current;
    setCargando(true);
    setError('');
    try {
      const [liqs, ags, cts] = await Promise.all([todasLiquidaciones(), todasLasAgencias(), cuentasResumen()]);
      if (!vigente()) return;
      setLiquidaciones(liqs);
      setAgencias(ags);
      setCuentas(cts);
    } catch (e) {
      if (vigente()) setError(mensajeError(e));
    } finally {
      if (vigente()) setCargando(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar]);

  const visibles = filtrarLiquidaciones(liquidaciones, filtro);
  const conteos: Record<FiltroLiquidaciones, number> = {
    pendientes: filtrarLiquidaciones(liquidaciones, 'pendientes').length,
    pagadas: filtrarLiquidaciones(liquidaciones, 'pagadas').length,
    todas: liquidaciones.length,
  };
  const porConfirmar = liquidaciones.find((l) => l.id === confirmando);
  const cuentaDe = (agencyId: string) => cuentas.find((c) => c.agency_id === agencyId);
  const verificadas = agencias.filter((a) => a.estado_verificacion === 'verificado');

  async function generarSemana() {
    setGenerando(true);
    try {
      avisar(avisoSemanaGenerada(await generarLiquidaciones(semana)));
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    } finally {
      if (montado.current) setGenerando(false);
    }
  }

  async function anticiposAhora() {
    setGenerando(true);
    try {
      avisar(avisoAnticiposGenerados(await generarAnticipos()));
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    } finally {
      if (montado.current) setGenerando(false);
    }
  }

  async function ejecutar(l: Liquidacion) {
    setEjecutando(true);
    setErrorAccion('');
    try {
      const r = await ejecutarLiquidacion(l.id);
      avisar(`Dispersión de prueba registrada: ${r.referencia_prueba}`);
      setConfirmando(null);
      await cargar();
    } catch (e) {
      if (montado.current) setErrorAccion(mensajeError(e));
    } finally {
      if (montado.current) setEjecutando(false);
    }
  }

  function confirmar(l: Liquidacion) {
    setConfirmando(l.id);
    setErrorAccion('');
  }

  async function alternarItems(l: Liquidacion) {
    if (abiertaRef.current === l.id) {
      setAbierta(null);
      abiertaRef.current = null;
      return;
    }
    setAbierta(l.id);
    abiertaRef.current = l.id;
    setItems([]);
    try {
      const nuevos = (await liquidacionDetalle(l.id))?.liquidacion_items ?? [];
      // Si mientras tanto se desplegó otra (o se cerró), esta respuesta ya no corresponde.
      if (montado.current && abiertaRef.current === l.id) setItems(nuevos);
    } catch (e) {
      avisar(mensajeError(e));
    }
  }

  async function alternarBloqueo(a: Agency) {
    const bloquear = !a.anticipo_bloqueado;
    try {
      await bloquearAnticipo(a.id, bloquear);
      avisar(bloquear ? `Anticipos de ${a.nombre} bloqueados.` : `Anticipos de ${a.nombre} habilitados.`);
      setAgencias((previas) => previas.map((x) => (x.id === a.id ? { ...x, anticipo_bloqueado: bloquear } : x)));
    } catch (e) {
      avisar(mensajeError(e));
    }
  }

  return {
    cargando,
    error,
    recargar: cargar,
    filtro,
    setFiltro,
    conteos,
    visibles,
    verificadas,
    cuentaDe,
    semana,
    setSemana,
    generando,
    generarSemana,
    anticiposAhora,
    abierta,
    items,
    alternarItems,
    alternarBloqueo,
    porConfirmar,
    confirmar,
    cancelarConfirmacion: () => setConfirmando(null),
    ejecutando,
    errorAccion,
    ejecutar,
  };
}
