import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { confirmar } from '@/shared/lib/confirmar';
import { fechaTexto } from '@/shared/lib/format';
import { avisar } from '@/shared/lib/toast';
import { agregarFecha, eliminarFecha } from '../api/planes.api';
import type { Plan, PlanDate } from '../model/plan';

/**
 * Agregar y quitar fechas (con sus cupos) de un plan. Tras cada cambio pide `oncerrar` para que la lista se recargue;
 * si la API lo rechaza deja el motivo en `error` y el diálogo sigue abierto.
 */
export function useFechasPlan(
  plan: Plan,
  oncerrar: () => void,
): {
  fecha: string;
  setFecha: Dispatch<SetStateAction<string>>;
  cupo: number | null;
  setCupo: Dispatch<SetStateAction<number | null>>;
  guardando: boolean;
  error: string;
  agregar: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  quitar: (f: PlanDate) => Promise<void>;
} {
  const [fecha, setFecha] = useState('');
  const [cupo, setCupo] = useState<number | null>(12);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function agregar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fecha || !cupo || cupo <= 0) return;
    setGuardando(true);
    setError('');
    try {
      await agregarFecha(plan.id, fecha, Number(cupo));
      avisar('Fecha agregada.');
      setFecha('');
      oncerrar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(f: PlanDate) {
    const seguir = await confirmar({
      titulo: `¿Eliminar la fecha del ${fechaTexto(f.fecha)}?`,
      mensaje:
        'Se eliminará la fecha con sus cupos y dejará de estar disponible para reservar. Si ya tiene reservas activas, no se podrá eliminar.',
      confirmar: 'Eliminar fecha',
      peligro: true,
    });
    if (!seguir) return;
    setError('');
    try {
      await eliminarFecha(f.id);
      avisar('Fecha eliminada y cupos liberados.');
      oncerrar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return { fecha, setFecha, cupo, setCupo, guardando, error, agregar, quitar };
}
