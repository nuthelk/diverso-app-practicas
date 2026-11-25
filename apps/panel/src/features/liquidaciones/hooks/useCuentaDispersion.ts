import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { miAgencia } from '@/features/agencias/api/agencias.api';
import { mensajeError } from '@/shared/api/errores';
import { avisar } from '@/shared/lib/toast';
import type { Agency } from '@/features/agencias/model/agencia';
import { miCuentaDispersion, guardarCuentaDispersion } from '../api/liquidaciones.api';
import { validarCuenta, type CuentaDispersion, type ErroresCuenta } from '../model/liquidaciones';

const vacia = (): CuentaDispersion => ({
  banco: '',
  tipo_cuenta: 'ahorros',
  numero_cuenta: '',
  titular: '',
  tipo_documento: 'NIT',
  numero_documento: '',
});

/**
 * La cuenta para dispersiones de la agencia: la carga (si ya existe), el borrador `c` que edita el formulario, sus
 * errores (visibles solo después del primer intento) y el guardado, que vuelve a Liquidaciones.
 */
export function useCuentaDispersion() {
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [agencia, setAgencia] = useState<Agency | null>(null);
  const [existe, setExiste] = useState(false);
  const [c, setC] = useState<CuentaDispersion>(vacia);
  const [intentado, setIntentado] = useState(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    // Si el efecto se repite (doble montaje de StrictMode) o se desmonta, la respuesta vieja se ignora.
    let vigente = true;
    (async () => {
      try {
        const ag = await miAgencia();
        if (!vigente) return;
        setAgencia(ag);
        const actual = ag ? await miCuentaDispersion(ag.id) : null;
        if (!vigente) return;
        if (actual) {
          setC(actual);
          setExiste(true);
        }
      } catch (e) {
        if (vigente) setError(mensajeError(e));
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
      montado.current = false;
    };
  }, []);

  const errores: ErroresCuenta = validarCuenta(c);
  /** Un error se muestra solo después del primer intento de guardar. */
  const mostrar = (mensaje?: string) => (intentado ? mensaje : undefined);

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentado(true);
    setError('');
    if (Object.keys(errores).length > 0 || !agencia) return;
    setGuardando(true);
    try {
      await guardarCuentaDispersion(agencia.id, c);
      avisar('Cuenta para dispersiones guardada.');
      navegar('/liquidaciones');
    } catch (err) {
      if (montado.current) setError(mensajeError(err));
    } finally {
      if (montado.current) setGuardando(false);
    }
  }

  return { cargando, guardando, error, agencia, existe, c, setC, errores, mostrar, guardar };
}
