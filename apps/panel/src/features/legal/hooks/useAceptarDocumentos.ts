import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { mensajeError } from '@/shared/api/errores';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import { consentimientosPendientes, registrarConsentimiento } from '../api/legal.api';

/**
 * El formulario de «Antes de continuar»: las dos autorizaciones, el intento de envío y el guardado de cada
 * consentimiento pendiente. Al terminar vuelve al Starter, que decide a dónde sigue la cuenta.
 */
export function useAceptarDocumentos() {
  const navegar = useNavigate();
  const [datos, setDatos] = useState(false);
  const [terminos, setTerminos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [intentado, setIntentado] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  const trasDibujar = useTrasDibujar();

  async function aceptar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIntentado(true);
    if (!datos || !terminos) {
      // Ya dibujadas como inválidas, el foco va a la primera casilla sin marcar.
      trasDibujar(() => formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const pendientes = await consentimientosPendientes();
      for (const tipo of pendientes) await registrarConsentimiento(tipo);
      navegar('/starter');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return { datos, setDatos, terminos, setTerminos, guardando, error, intentado, formulario, aceptar };
}
