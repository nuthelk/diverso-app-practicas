import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { avisar } from '@/shared/lib/toast';
import { fechaTexto } from '@/shared/lib/format';
import { vigenciaSugerida, type Agency, type VerificationLog } from '@/features/agencias/model/agencia';
import { conteosAgencias, filtrarAgencias, type FiltroAgencias } from '@/features/agencias/model/verificacion';
import {
  todasLasAgencias,
  verificarAgencia,
  rechazarAgencia,
  actualizarVigencia,
  historialVerificacion,
} from '../api/admin.api';
import { vigenciaInicial, type TipoAccion } from '../model/admin';

type Accion = { tipo: TipoAccion; agencia: Agency };

/**
 * La cola de verificación de agencias: carga, filtro y búsqueda, la acción en curso sobre una agencia (verificar,
 * rechazar o renovar la vigencia del RNT) con los campos de su formulario, y el historial desplegado.
 */
export function useAdminAgencias() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [agencias, setAgencias] = useState<Agency[]>([]);
  const [filtro, setFiltro] = useState<FiltroAgencias>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  // Si la persona eligió un filtro, recargar no se lo cambia (no se dibuja: basta una ref).
  const filtroElegido = useRef(false);

  const [accion, setAccion] = useState<Accion | null>(null);
  const [fechaVigencia, setFechaVigencia] = useState(vigenciaSugerida);
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const [historialAbierto, setHistorialAbierto] = useState<string | null>(null);
  const [historial, setHistorial] = useState<VerificationLog[]>([]);
  // Después de un `await` se lee el historial abierto en ese momento, no el del render viejo.
  const historialAbiertoRef = useRef(historialAbierto);
  historialAbiertoRef.current = historialAbierto;

  // Solo la última carga escribe: una respuesta vieja (o llegada tras desmontar) se ignora.
  const ultimaCarga = useRef(0);
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    const esta = ++ultimaCarga.current;
    const vigente = () => montado.current && esta === ultimaCarga.current;
    setCargando(true);
    setError('');
    try {
      const nuevas = await todasLasAgencias();
      if (!vigente()) return;
      setAgencias(nuevas);
      if (!filtroElegido.current) {
        // Abre en la cola más útil: pendientes, luego RNT por renovar.
        const conteos = conteosAgencias(nuevas);
        setFiltro(conteos.pendientes > 0 ? 'pendientes' : conteos.atencion > 0 ? 'atencion' : 'todas');
      }
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

  const conteos = conteosAgencias(agencias);
  const visibles = filtrarAgencias(agencias, filtro, busqueda);

  function elegirFiltro(valor: FiltroAgencias) {
    setFiltro(valor);
    filtroElegido.current = true;
  }

  function abrir(tipo: TipoAccion, a: Agency) {
    setAccion({ tipo, agencia: a });
    setFechaVigencia(vigenciaInicial(a, tipo));
    setMotivo('');
    setConfirmado(false);
    setErrorAccion('');
  }

  async function ejecutar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accion) return;
    setProcesando(true);
    setErrorAccion('');
    const { tipo, agencia } = accion;
    try {
      if (tipo === 'verificar') {
        await verificarAgencia(agencia.id, fechaVigencia);
        avisar(`${agencia.nombre} verificada hasta el ${fechaTexto(fechaVigencia)}.`);
      } else if (tipo === 'vigencia') {
        await actualizarVigencia(agencia.id, fechaVigencia);
        avisar(`Vigencia del RNT de ${agencia.nombre} actualizada.`);
      } else {
        await rechazarAgencia(agencia.id, motivo.trim());
        avisar(`${agencia.nombre} quedó rechazada. Verá el motivo en su panel.`);
      }
      setAccion(null);
      await cargar();
      if (historialAbiertoRef.current === agencia.id) {
        const nuevo = await historialVerificacion(agencia.id);
        if (montado.current) setHistorial(nuevo);
      }
    } catch (err) {
      if (montado.current) setErrorAccion(mensajeError(err));
    } finally {
      if (montado.current) setProcesando(false);
    }
  }

  async function alternarHistorial(a: Agency) {
    if (historialAbiertoRef.current === a.id) {
      setHistorialAbierto(null);
      historialAbiertoRef.current = null;
      return;
    }
    setHistorialAbierto(a.id);
    historialAbiertoRef.current = a.id;
    setHistorial([]);
    try {
      const nuevo = await historialVerificacion(a.id);
      // Si mientras tanto se abrió otro historial (o se cerró), esta respuesta ya no corresponde.
      if (montado.current && historialAbiertoRef.current === a.id) setHistorial(nuevo);
    } catch (e) {
      avisar(mensajeError(e));
    }
  }

  return {
    cargando,
    error,
    filtro,
    conteos,
    visibles,
    busqueda,
    setBusqueda,
    elegirFiltro,
    recargar: cargar,
    accion,
    fechaVigencia,
    setFechaVigencia,
    motivo,
    setMotivo,
    confirmado,
    setConfirmado,
    procesando,
    errorAccion,
    abrir,
    cancelar: () => setAccion(null),
    ejecutar,
    historialAbierto,
    historial,
    alternarHistorial,
  };
}
