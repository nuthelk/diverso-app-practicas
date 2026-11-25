import { useRef, useState, type ChangeEvent } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { avisar } from '@/shared/lib/toast';
import { quitarLogo, subirLogo } from '../api/agencias.api';
import { validarLogo } from '../model/logo';
import type { Agency } from '../model/agencia';

/**
 * Subir, reemplazar o quitar el logo de la agencia: valida el archivo antes de subirlo, dice qué está haciendo
 * (`ocupado`) y avisa a quien lo usa con la URL nueva, o con null cuando se quitó.
 */
export function useLogoAgencia(agencia: Agency, onactualizado: (logoUrl: string | null) => void) {
  const [ocupado, setOcupado] = useState<'' | 'subiendo' | 'quitando'>('');
  const [error, setError] = useState('');
  const entrada = useRef<HTMLInputElement>(null);

  async function elegido(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    const invalido = validarLogo(archivo) ?? '';
    setError(invalido);
    if (invalido) return;
    setOcupado('subiendo');
    try {
      onactualizado(await subirLogo(agencia, archivo));
      avisar('Logo actualizado.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado('');
    }
  }

  async function quitar() {
    setError('');
    setOcupado('quitando');
    try {
      await quitarLogo(agencia);
      onactualizado(null);
      avisar('Logo eliminado.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado('');
    }
  }

  return { ocupado, error, entrada, elegido, quitar, elegir: () => entrada.current?.click() };
}
